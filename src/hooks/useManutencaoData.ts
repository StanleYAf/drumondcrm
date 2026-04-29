import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IndicadorManutencao {
  id: string;
  mes: string;
  ano: number;
  [key: string]: any;
}

export interface TecnicoManutencao {
  id: string;
  mes: string;
  ano: number;
  nome: string;
  setor: string;
  corretivas: number;
  preventivas: number;
  total_os: number;
  atendidas_no_prazo: number;
  fechadas_no_prazo: number;
  percentual_atendimento: number;
  percentual_fechamento: number;
}

function normalize<T extends Record<string, any>>(row: T): T {
  const out: any = { ...row };
  for (const k of Object.keys(out)) {
    if (out[k] === null || out[k] === undefined) {
      if (typeof row[k] === "string") continue;
      out[k] = 0;
    }
  }
  return out;
}

export function useManutencaoData(mesSelecionado?: string, anoSelecionado?: number) {
  const [indicadores, setIndicadores] = useState<IndicadorManutencao[]>([]);
  const [tecnicosMes, setTecnicosMes] = useState<TecnicoManutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: indData, error: indErr } = await supabase
          .from("indicadores_manutencao")
          .select("*")
          .order("ano", { ascending: true })
          .order("mes", { ascending: true });
        if (indErr) throw indErr;

        let tecData: any[] = [];
        if (mesSelecionado && anoSelecionado) {
          const { data, error: tecErr } = await supabase
            .from("tecnicos_manutencao")
            .select("*")
            .eq("mes", mesSelecionado)
            .eq("ano", anoSelecionado);
          if (tecErr) throw tecErr;
          tecData = data || [];
        }

        if (!cancelled) {
          setIndicadores(((indData || []) as any[]).map(normalize) as IndicadorManutencao[]);
          setTecnicosMes(tecData.map(normalize) as TecnicoManutencao[]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Erro ao carregar dados de manutenção");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mesSelecionado, anoSelecionado]);

  return { indicadores, tecnicosMes, loading, error };
}