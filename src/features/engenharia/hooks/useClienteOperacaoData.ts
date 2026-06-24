import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OSOperacaoRow {
  id: string;
  estado: string | null;
  tipo_servico: string | null;
  localizacao: string | null;
  numero_serie: string | null;
  tag: string | null;
  tipo_equipamento: string | null;
  mes: string | null;
  ano: number | null;
}

const PAGE = 1000;

async function fetchAll(clienteId: string, mes?: string, ano?: number): Promise<OSOperacaoRow[]> {
  const rows: OSOperacaoRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("ordens_servico")
      .select("id, estado, tipo_servico, localizacao, numero_serie, tag, tipo_equipamento, mes, ano")
      .eq("cliente_id", clienteId)
      .range(from, from + PAGE - 1);
    if (mes) q = q.eq("mes", mes);
    if (ano) q = q.eq("ano", ano);
    const { data, error } = await q;
    if (error) throw error;
    const page = (data || []) as OSOperacaoRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

/**
 * Carrega OS do período selecionado + universo histórico de equipamentos do cliente
 * (usado para calcular disponibilidade real do parque, independente do período).
 */
export function useClienteOperacaoData(clienteId: string | null, mes?: string, ano?: number) {
  const [osPeriodo, setOsPeriodo] = useState<OSOperacaoRow[]>([]);
  const [equipamentosTotais, setEquipamentosTotais] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!clienteId) { setOsPeriodo([]); setEquipamentosTotais(new Set()); return; }
    (async () => {
      setLoading(true); setError(null);
      try {
        const [periodo, total] = await Promise.all([
          fetchAll(clienteId, mes, ano),
          // Universo de equipamentos: todas as OS do cliente (todos os períodos)
          fetchAll(clienteId),
        ]);
        if (cancelled) return;
        const set = new Set<string>();
        for (const r of total) {
          const k = (r.numero_serie || r.tag || "").trim();
          if (k) set.add(k);
        }
        setOsPeriodo(periodo);
        setEquipamentosTotais(set);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Erro ao carregar dados operacionais");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clienteId, mes, ano]);

  return { osPeriodo, equipamentosTotais, loading, error };
}