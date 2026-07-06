import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AppData } from "./types";
import { INITIAL_DATA } from "./initialData";
import { loadFromSupabase, syncToSupabase } from "./supabaseSync";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./authContext";
import { toast } from "sonner";

interface UndoItem {
  id: string;
  label: string;
  restore: () => void;
  timer: ReturnType<typeof setTimeout>;
}

interface DataContextType {
  data: AppData;
  setData: (fn: (prev: AppData) => AppData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  undoDelete: (id: string, label: string, restoreFn: (prev: AppData) => AppData) => void;
  pendingUndo: UndoItem | null;
  cancelUndo: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, setDataRaw] = useState<AppData>(() => {
    const d = { ...INITIAL_DATA };
    if (!d.historico_metas) d.historico_metas = [];
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<UndoItem | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const localRevisionRef = useRef(0);
  const pendingSyncRef = useRef(0);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const describeChange = useCallback((prev: AppData, next: AppData) => {
    if (JSON.stringify(prev.lancamentos) !== JSON.stringify(next.lancamentos)) return "lançamento";
    if (JSON.stringify(prev.indicadores_semanais) !== JSON.stringify(next.indicadores_semanais)) return "indicador";
    if (JSON.stringify(prev.pos_venda) !== JSON.stringify(next.pos_venda)) return "contato de pós-venda";
    if (JSON.stringify(prev.vendedores) !== JSON.stringify(next.vendedores)) return "vendedor";
    if (JSON.stringify(prev.historico_metas) !== JSON.stringify(next.historico_metas)) return "meta";
    return "dados";
  }, []);

  const loadData = useCallback(async (guardAgainstStaleRealtime = false) => {
    if (!user) return;
    const revisionAtStart = localRevisionRef.current;
    try {
      const loaded = await loadFromSupabase(user.id);
      if (!loaded.historico_metas) loaded.historico_metas = [];
      if (guardAgainstStaleRealtime && (localRevisionRef.current !== revisionAtStart || pendingSyncRef.current > 0)) {
        return;
      }
      dataRef.current = loaded;
      setDataRaw(loaded);
      setLoading(false);
    } catch (err) {
      console.error("[DataProvider] Falha ao carregar dados:", err);
      setError("Não foi possível carregar os dados. Usando dados padrão.");
      toast.error("Erro ao carregar dados do servidor");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: reload when any table changes
  useEffect(() => {
    if (!user) return;
    const scheduleReload = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null;
        loadData(true);
      }, 800);
    };
    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'indicadores_semanais' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_venda' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas_historicas' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_contato' }, scheduleReload)
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, loadData]);

  const setData = useCallback((fn: (prev: AppData) => AppData): Promise<boolean> => {
    const runSync = async (): Promise<boolean> => {
      const prev = dataRef.current;
      try {
        const next = fn(prev);
        const changedLabel = describeChange(prev, next);
        dataRef.current = next;
        setDataRaw(next);

        if (!user) {
          dataRef.current = prev;
          setDataRaw(prev);
          toast.error(`Não foi possível salvar ${changedLabel}. A alteração foi desfeita — tente novamente.`, {
            duration: Infinity,
            closeButton: true,
          });
          return false;
        }

        pendingSyncRef.current += 1;
        try {
          await syncToSupabase(user.id, prev, next);
          localRevisionRef.current += 1;
        } finally {
          pendingSyncRef.current = Math.max(0, pendingSyncRef.current - 1);
        }
        return true;
      } catch (err) {
        console.error("[DataProvider] Falha ao sincronizar dados:", err);
        const attempted = dataRef.current;
        const changedLabel = describeChange(prev, attempted);
        dataRef.current = prev;
        setDataRaw(prev);
        toast.error(`Não foi possível salvar ${changedLabel}. A alteração foi desfeita — tente novamente.`, {
          duration: Infinity,
          closeButton: true,
        });
        return false;
      }
    };

    const queued = syncQueueRef.current.catch(() => {}).then(runSync);
    syncQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, [describeChange, user]);

  const undoDelete = useCallback((id: string, label: string, restoreFn: (prev: AppData) => AppData) => {
    setPendingUndo(prev => {
      if (prev) clearTimeout(prev.timer);
      return null;
    });

    const timer = setTimeout(() => {
      setPendingUndo(null);
    }, 5000);

    const restore = async () => {
      const success = await setData(restoreFn);
      if (success) setPendingUndo(null);
      clearTimeout(timer);
    };

    setPendingUndo({ id, label, restore, timer });
  }, [setData]);

  const cancelUndo = useCallback(() => {
    setPendingUndo(prev => {
      if (prev) clearTimeout(prev.timer);
      return null;
    });
  }, []);

  return (
    <DataContext.Provider value={{ data, setData, loading, error, undoDelete, pendingUndo, cancelUndo }}>
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useAppData must be inside DataProvider");
  return ctx;
}
