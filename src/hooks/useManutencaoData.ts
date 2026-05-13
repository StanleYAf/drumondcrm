import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IndicadorManutencao {
  id: string;
  mes: string;
  ano: number;
  cliente_id: string | null;
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
  cliente_id: string | null;
}

export interface ClienteManutencao {
  id: string;
  nome: string;
  responsavel: string | null;
  ativo: boolean;
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

export function useManutencaoData(
  clienteId: string | null,
  mesSelecionado?: string,
  anoSelecionado?: number,
) {
  const [indicadores, setIndicadores] = useState<IndicadorManutencao[]>([]);
  const [tecnicosMes, setTecnicosMes] = useState<TecnicoManutencao[]>([]);
  const [clientes, setClientes] = useState<ClienteManutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega lista de clientes ativos
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, responsavel, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (!cancelled) {
        if (error) setError(error.message);
        else setClientes((data || []) as ClienteManutencao[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      if (!clienteId) {
        if (!cancelled) {
          setIndicadores([]);
          setTecnicosMes([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: indData, error: indErr } = await supabase
          .from("indicadores_manutencao")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("ano", { ascending: true })
          .order("mes", { ascending: true });
        if (indErr) throw indErr;

        let tecData: any[] = [];
        if (mesSelecionado && anoSelecionado) {
          const { data, error: tecErr } = await supabase
            .from("tecnicos_manutencao")
            .select("*")
            .eq("cliente_id", clienteId)
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
  }, [clienteId, mesSelecionado, anoSelecionado]);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId) || null;

  return { indicadores, tecnicosMes, clientes, clienteSelecionado, loading, error };
}
