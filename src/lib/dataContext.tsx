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
  setData: (fn: (prev: AppData) => AppData) => void;
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
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const loaded = await loadFromSupabase(user.id);
      if (!loaded.historico_metas) loaded.historico_metas = [];
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
        loadData();
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

  const setData = useCallback((fn: (prev: AppData) => AppData) => {
    setDataRaw((prev) => {
      try {
        const next = fn(prev);
        if (user) {
          // Encadeia sincronizações em fila para evitar diffs paralelos com dados obsoletos
          syncQueueRef.current = syncQueueRef.current
            .catch(() => {})
            .then(() => syncToSupabase(user.id, prev, next))
            .catch((err) => {
              console.error("[DataProvider] Falha ao sincronizar dados:", err);
              const msg = err instanceof Error ? err.message : String(err);
              toast.error(`Erro ao salvar dados: ${msg}`);
            });
        }
        return next;
      } catch (err) {
        console.error("[DataProvider] Erro ao atualizar dados:", err);
        toast.error("Erro ao processar a operação.");
        return prev;
      }
    });
  }, [user]);

  const undoDelete = useCallback((id: string, label: string, restoreFn: (prev: AppData) => AppData) => {
    setPendingUndo(prev => {
      if (prev) clearTimeout(prev.timer);
      return null;
    });

    const timer = setTimeout(() => {
      setPendingUndo(null);
    }, 5000);

    const restore = () => {
      setData(restoreFn);
      setPendingUndo(null);
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
