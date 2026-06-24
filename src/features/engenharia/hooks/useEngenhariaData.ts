import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { classificarCliente, type StatusCliente } from "../config/statusClienteRegras";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
export const MES_NOMES = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
];
export const mesIdx = (m: string) => MES_ORDEM[(m || "").trim().toLowerCase()] ?? 0;
const n = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);

export interface ClienteRow { id: string; nome: string; responsavel: string | null; ativo: boolean; }
export interface IndicadorRow { cliente_id: string; mes: string; ano: number; [k: string]: any; }
export interface OSRow {
  id: string; cliente_id: string | null; mes: string | null; ano: number | null;
  estado: string | null; tipo_servico: string | null; responsavel: string | null;
  data_criacao: string | null; data_conclusao: string | null; created_at: string | null;
}
export interface TecnicoRow {
  id: string; cliente_id: string | null; mes: string | null; ano: number | null;
  nome: string | null; setor: string | null;
  corretivas: number | null; preventivas: number | null; total_os: number | null;
}

export interface Filtros {
  clienteId?: string;
  tecnico?: string;
  mes?: string;
  ano?: number;
  tipo?: "preventiva" | "corretiva" | "todas";
  status?: "abertas" | "fechadas" | "todas";
}

function normTipo(t: string | null): "preventiva" | "corretiva" | "outros" {
  const s = (t || "").toLowerCase();
  if (s.includes("prevent")) return "preventiva";
  if (s.includes("corret")) return "corretiva";
  return "outros";
}
function isFechada(e: string | null): boolean {
  const s = (e || "").toLowerCase();
  return s === "fechada" || s === "fechado" || s === "concluída" || s === "concluida";
}
function isAberta(e: string | null): boolean {
  if (!e) return false;
  const s = e.toLowerCase();
  if (isFechada(e)) return false;
  if (s === "cancelada" || s === "cancelado") return false;
  return true;
}

/** Considera vencidas as OS abertas há mais de 30 dias. */
const VENCIDA_DIAS = 30;
function isVencida(os: OSRow): boolean {
  if (!isAberta(os.estado)) return false;
  const created = os.data_criacao || os.created_at;
  if (!created) return false;
  const d = new Date(created);
  if (Number.isNaN(d.getTime())) return false;
  const diff = (Date.now() - d.getTime()) / 86400000;
  return diff > VENCIDA_DIAS;
}

export interface TecnicoAgg {
  nome: string;
  abertas: number;
  emAndamento: number;
  concluidas: number;
  preventivas: number;
  corretivas: number;
  pendencias: number;
  score: number;
}

export interface ClienteAgg {
  cliente: ClienteRow;
  ind?: IndicadorRow;
  corretivasAbertas: number;
  corretivasConcluidas: number;
  preventivasAbertas: number;
  preventivasConcluidas: number;
  preventivasPendentes: number;
  osVencidas: number;
  totalOsAbertas: number;
  pctPreventivas: number;
  ultimaAtualizacao: string | null;
  status: StatusCliente;
}

export interface Totais {
  osAbertas: number;
  osConcluidas: number;
  corretivasAbertas: number;
  corretivasConcluidas: number;
  preventivasAbertas: number;
  preventivasConcluidas: number;
  osVencidas: number;
  totalTecnicos: number;
  totalClientesCriticos: number;
}

export interface MetaMensal {
  previsto: number;
  executado: number;
  pendente: number;
  percentual: number;
  diasRestantes: number;
  intensidade: "calmo" | "alerta" | "critico";
}

export function useEngenhariaData(filtros: Filtros) {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorRow[]>([]);
  const [os, setOs] = useState<OSRow[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const fetchAllOs = async (): Promise<OSRow[]> => {
          const pageSize = 1000;
          const all: OSRow[] = [];
          for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
              .from("ordens_servico")
              .select("id, cliente_id, mes, ano, estado, tipo_servico, responsavel, data_criacao, data_conclusao, created_at")
              .range(from, from + pageSize - 1);
            if (error) throw error;
            const rows = (data || []) as OSRow[];
            all.push(...rows);
            if (rows.length < pageSize) break;
          }
          return all;
        };
        const [c, i, oAll, t] = await Promise.all([
          supabase.from("clientes").select("id, nome, responsavel, ativo").eq("ativo", true).order("nome"),
          supabase.from("indicadores_manutencao").select("*"),
          fetchAllOs(),
          supabase.from("tecnicos_manutencao").select("*"),
        ]);
        if (c.error) throw c.error;
        if (i.error) throw i.error;
        if (t.error) throw t.error;
        if (cancelled) return;
        setClientes((c.data || []) as ClienteRow[]);
        setIndicadores((i.data || []) as IndicadorRow[]);
        setOs(oAll);
        setTecnicos((t.data || []) as TecnicoRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const periodos = useMemo(() => {
    const map = new Map<string, { mes: string; ano: number }>();
    for (const r of indicadores) {
      const k = `${r.ano}-${r.mes}`;
      if (!map.has(k)) map.set(k, { mes: r.mes, ano: r.ano });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : mesIdx(a.mes) - mesIdx(b.mes),
    );
  }, [indicadores]);

  const periodoAtivo = useMemo(() => {
    if (filtros.mes && filtros.ano) return { mes: filtros.mes, ano: filtros.ano };
    return periodos[periodos.length - 1];
  }, [filtros.mes, filtros.ano, periodos]);

  // ---------- OS filtradas
  const osFiltradas = useMemo(() => {
    return os.filter((r) => {
      if (filtros.clienteId && r.cliente_id !== filtros.clienteId) return false;
      if (filtros.tecnico && (r.responsavel || "") !== filtros.tecnico) return false;
      if (periodoAtivo) {
        if (r.ano !== periodoAtivo.ano) return false;
        if ((r.mes || "").toLowerCase() !== periodoAtivo.mes.toLowerCase()) return false;
      }
      if (filtros.tipo && filtros.tipo !== "todas" && normTipo(r.tipo_servico) !== filtros.tipo) return false;
      if (filtros.status === "abertas" && !isAberta(r.estado)) return false;
      if (filtros.status === "fechadas" && !isFechada(r.estado)) return false;
      return true;
    });
  }, [os, filtros.clienteId, filtros.tecnico, filtros.tipo, filtros.status, periodoAtivo]);

  // ---------- Indicadores do período/cliente
  const indicadoresPeriodo = useMemo(() => {
    return indicadores.filter((r) => {
      if (periodoAtivo) {
        if (r.ano !== periodoAtivo.ano) return false;
        if ((r.mes || "").toLowerCase() !== periodoAtivo.mes.toLowerCase()) return false;
      }
      if (filtros.clienteId && r.cliente_id !== filtros.clienteId) return false;
      return true;
    });
  }, [indicadores, periodoAtivo, filtros.clienteId]);

  // ---------- Agregação por cliente
  const clientesAgg: ClienteAgg[] = useMemo(() => {
    const list = filtros.clienteId ? clientes.filter((c) => c.id === filtros.clienteId) : clientes;
    return list.map((c) => {
      const ind = indicadoresPeriodo.find((i) => i.cliente_id === c.id);
      const osDoCliente = os.filter((o) =>
        o.cliente_id === c.id &&
        (!periodoAtivo || (o.ano === periodoAtivo.ano && (o.mes || "").toLowerCase() === periodoAtivo.mes.toLowerCase())),
      );
      const corretivasAbertas    = n(ind?.total_corretivas_abertas);
      const corretivasConcluidas = n(ind?.total_corretivas_fechadas);
      const preventivasAbertas   = n(ind?.total_preventivas_abertas);
      const preventivasConcluidas= n(ind?.total_preventivas_fechadas);
      const preventivasTotal     = preventivasAbertas + preventivasConcluidas;
      const pctPreventivas       = preventivasTotal > 0 ? (preventivasConcluidas / preventivasTotal) * 100 : 0;
      const osVencidas           = osDoCliente.filter(isVencida).length;
      const totalOsAbertas       = corretivasAbertas + preventivasAbertas;
      const ultimaAtualizacao    = osDoCliente.reduce<string | null>((acc, r) => {
        const d = r.data_conclusao || r.created_at;
        if (!d) return acc;
        return !acc || d > acc ? d : acc;
      }, null);
      const status = classificarCliente({
        corretivasAbertas,
        preventivasPendentes: preventivasAbertas,
        osVencidas,
        temDados: Boolean(ind),
      });
      return {
        cliente: c, ind,
        corretivasAbertas, corretivasConcluidas,
        preventivasAbertas, preventivasConcluidas,
        preventivasPendentes: preventivasAbertas,
        osVencidas, totalOsAbertas,
        pctPreventivas, ultimaAtualizacao, status,
      };
    });
  }, [clientes, indicadoresPeriodo, os, periodoAtivo, filtros.clienteId]);

  // ---------- Totais (Painel Executivo) — somam os indicadoresPeriodo (consolidados oficiais)
  const totais: Totais = useMemo(() => {
    const sum = (key: string) => indicadoresPeriodo.reduce((acc, r) => acc + n(r[key]), 0);
    return {
      osAbertas:             sum("total_corretivas_abertas")  + sum("total_preventivas_abertas"),
      osConcluidas:          sum("total_corretivas_fechadas") + sum("total_preventivas_fechadas"),
      corretivasAbertas:     sum("total_corretivas_abertas"),
      corretivasConcluidas:  sum("total_corretivas_fechadas"),
      preventivasAbertas:    sum("total_preventivas_abertas"),
      preventivasConcluidas: sum("total_preventivas_fechadas"),
      osVencidas:            osFiltradas.filter(isVencida).length,
      totalTecnicos:         new Set(tecnicos
        .filter((t) => !periodoAtivo || (t.ano === periodoAtivo.ano && (t.mes || "").toLowerCase() === periodoAtivo.mes.toLowerCase()))
        .map((t) => t.nome || "")
        .filter(Boolean)).size,
      totalClientesCriticos: clientesAgg.filter((c) => c.status === "critico").length,
    };
  }, [indicadoresPeriodo, osFiltradas, tecnicos, periodoAtivo, clientesAgg]);

  // ---------- Meta mensal de preventivas
  const metaMensal: MetaMensal = useMemo(() => {
    const previsto   = totais.preventivasAbertas + totais.preventivasConcluidas;
    const executado  = totais.preventivasConcluidas;
    const pendente   = Math.max(previsto - executado, 0);
    const percentual = previsto > 0 ? (executado / previsto) * 100 : 0;

    // Dias restantes do mês selecionado (ou do corrente caso o período seja o atual)
    const hoje = new Date();
    let ref = hoje;
    if (periodoAtivo) {
      const mIdx = mesIdx(periodoAtivo.mes) - 1;
      if (mIdx >= 0) ref = new Date(periodoAtivo.ano, mIdx, 1);
    }
    const fimDoMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    const diasRestantes = Math.max(
      0,
      Math.ceil((fimDoMes.getTime() - hoje.getTime()) / 86400000),
    );
    const intensidade: MetaMensal["intensidade"] =
      pendente === 0 ? "calmo"
      : diasRestantes <= 3 ? "critico"
      : diasRestantes <= 7 ? "alerta"
      : "calmo";
    return { previsto, executado, pendente, percentual, diasRestantes, intensidade };
  }, [totais, periodoAtivo]);

  // ---------- Produtividade dos técnicos (a partir de OS filtradas)
  const tecnicosAgg: TecnicoAgg[] = useMemo(() => {
    const map = new Map<string, TecnicoAgg>();
    const ensure = (nome: string) => {
      if (!map.has(nome)) {
        map.set(nome, {
          nome, abertas: 0, emAndamento: 0, concluidas: 0,
          preventivas: 0, corretivas: 0, pendencias: 0, score: 0,
        });
      }
      return map.get(nome)!;
    };
    for (const r of osFiltradas) {
      const nome = (r.responsavel || "").trim();
      if (!nome) continue;
      const ag = ensure(nome);
      if (isFechada(r.estado)) ag.concluidas++;
      else if (isAberta(r.estado)) {
        const s = (r.estado || "").toLowerCase();
        if (s === "aberta") ag.abertas++;
        else ag.emAndamento++;
      }
      const tipo = normTipo(r.tipo_servico);
      if (tipo === "preventiva") ag.preventivas++;
      else if (tipo === "corretiva") ag.corretivas++;
    }
    for (const t of map.values()) {
      t.pendencias = t.abertas + t.emAndamento;
      t.score = t.concluidas * 2 + t.emAndamento - t.abertas * 0.5;
    }
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [osFiltradas]);

  const tecnicosUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const r of os) if (r.responsavel) set.add(r.responsavel.trim());
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [os]);

  return {
    loading, error,
    clientes, periodos, periodoAtivo, tecnicosUnicos,
    clientesAgg, totais, metaMensal, tecnicosAgg,
    osFiltradas,
  };
}