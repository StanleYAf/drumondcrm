import type { IconKey } from "./iconRegistry";

/**
 * Tom semântico do indicador. Mapeia para classes do design system
 * — nenhuma cor hardcoded espalhada nos componentes.
 */
export type IndicadorTone =
  | "neutral" | "info" | "success" | "warning" | "danger" | "primary";

export interface IndicadorDef {
  id: string;
  label: string;
  description: string;
  icon: IconKey;
  tone: IndicadorTone;
  /** caminho de drill-down ao clicar (opcional) */
  href?: string;
  /** ordem padrão (sobrescritível) */
  order: number;
  /** chave da métrica calculada em useEngenhariaData.totals */
  metric:
    | "osAbertas" | "osConcluidas"
    | "corretivasAbertas" | "corretivasConcluidas"
    | "preventivasAbertas" | "preventivasConcluidas"
    | "osVencidas" | "totalTecnicos" | "totalClientesCriticos";
}

export const TONE_CLASSES: Record<IndicadorTone, {
  bg: string; border: string; icon: string; ring: string; text: string;
}> = {
  neutral: { bg: "bg-secondary/40", border: "border-border",      icon: "text-muted-foreground", ring: "ring-border",          text: "text-foreground" },
  info:    { bg: "bg-sky-500/10",   border: "border-sky-500/30",  icon: "text-sky-500",          ring: "ring-sky-500/30",      text: "text-foreground" },
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "text-emerald-500", ring: "ring-emerald-500/30", text: "text-foreground" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "text-amber-500",       ring: "ring-amber-500/30",   text: "text-foreground" },
  danger:  { bg: "bg-red-500/10",   border: "border-red-500/30",  icon: "text-red-500",          ring: "ring-red-500/30",     text: "text-foreground" },
  primary: { bg: "bg-primary/10",   border: "border-primary/30",  icon: "text-primary",          ring: "ring-primary/30",     text: "text-foreground" },
};

/** Catálogo padrão. Pode ser sobrescrito por usuário via useDashboardConfig. */
export const INDICADORES_DEFAULT: IndicadorDef[] = [
  { id: "os-abertas",            metric: "osAbertas",            label: "O.S. abertas",            description: "OS em aberto no período", icon: "clipboard-list",  tone: "info",    order: 1, href: "/manutencao/os?estado=Aberta" },
  { id: "os-concluidas",         metric: "osConcluidas",         label: "O.S. concluídas",         description: "OS fechadas no período",  icon: "clipboard-check", tone: "success", order: 2, href: "/manutencao/os?estado=Fechada" },
  { id: "corretivas-abertas",    metric: "corretivasAbertas",    label: "Corretivas abertas",      description: "Corretivas em aberto",    icon: "wrench",          tone: "danger",  order: 3 },
  { id: "corretivas-concluidas", metric: "corretivasConcluidas", label: "Corretivas concluídas",   description: "Corretivas fechadas",     icon: "check-circle",    tone: "success", order: 4 },
  { id: "preventivas-abertas",   metric: "preventivasAbertas",   label: "Preventivas abertas",     description: "Preventivas pendentes",   icon: "shield-check",    tone: "warning", order: 5 },
  { id: "preventivas-concluidas",metric: "preventivasConcluidas",label: "Preventivas concluídas",  description: "Preventivas executadas",  icon: "check-circle",    tone: "success", order: 6 },
  { id: "os-vencidas",           metric: "osVencidas",           label: "O.S. vencidas",           description: "OS atrasadas (>30d)",     icon: "alert-triangle",  tone: "danger",  order: 7 },
  { id: "clientes-criticos",     metric: "totalClientesCriticos",label: "Clientes em risco",       description: "Status 🔴 Crítico",      icon: "alert-circle",    tone: "danger",  order: 8 },
];

/** Override aplicável pelo usuário. */
export interface IndicadorOverride {
  icon?: IconKey;
  tone?: IndicadorTone;
  label?: string;
  order?: number;
  hidden?: boolean;
}

export type IndicadorOverrides = Record<string, IndicadorOverride>;

export function mergeIndicadores(
  defaults: IndicadorDef[],
  overrides: IndicadorOverrides,
): IndicadorDef[] {
  return defaults
    .map((d) => {
      const o = overrides[d.id] ?? {};
      return {
        ...d,
        icon: o.icon ?? d.icon,
        tone: o.tone ?? d.tone,
        label: o.label ?? d.label,
        order: o.order ?? d.order,
        _hidden: o.hidden === true,
      } as IndicadorDef & { _hidden?: boolean };
    })
    .filter((d) => !(d as any)._hidden)
    .sort((a, b) => a.order - b.order);
}