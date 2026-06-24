/**
 * Regras centralizadas de classificação de saúde do cliente.
 * Para ajustar thresholds, edite apenas este arquivo.
 */

export type StatusCliente = "saudavel" | "atencao" | "critico" | "sem-dados";

export interface ClienteMetrics {
  corretivasAbertas: number;
  preventivasPendentes: number;
  osVencidas: number;
  temDados: boolean;
}

export const STATUS_THRESHOLDS = {
  critico:  { corretivas: 5, preventivas: 10, vencidas: 3 },
  atencao:  { corretivas: 2, preventivas: 3,  vencidas: 1 },
} as const;

export function classificarCliente(m: ClienteMetrics): StatusCliente {
  if (!m.temDados) return "sem-dados";
  const t = STATUS_THRESHOLDS;
  if (
    m.corretivasAbertas >= t.critico.corretivas ||
    m.preventivasPendentes >= t.critico.preventivas ||
    m.osVencidas >= t.critico.vencidas
  ) return "critico";
  if (
    m.corretivasAbertas >= t.atencao.corretivas ||
    m.preventivasPendentes >= t.atencao.preventivas ||
    m.osVencidas >= t.atencao.vencidas
  ) return "atencao";
  return "saudavel";
}

export const STATUS_META: Record<StatusCliente, { label: string; emoji: string; cls: string; dot: string }> = {
  saudavel:    { label: "Saudável", emoji: "🟢", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", dot: "bg-emerald-500" },
  atencao:     { label: "Atenção",  emoji: "🟡", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",       dot: "bg-amber-500" },
  critico:     { label: "Crítico",  emoji: "🔴", cls: "bg-red-500/15 text-red-500 border-red-500/30",             dot: "bg-red-500" },
  "sem-dados": { label: "Sem dados", emoji: "⚪", cls: "bg-muted text-muted-foreground border-border",             dot: "bg-muted-foreground" },
};