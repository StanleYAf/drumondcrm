import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle, CheckCircle2, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvolucaoBar } from "./EvolucaoBar";
import type { MetaMensal } from "../hooks/useEngenhariaData";

interface Props { meta: MetaMensal; periodoLabel?: string; }

const INTENSIDADE_STYLES = {
  calmo:   { border: "border-border",           glow: "" },
  alerta:  { border: "border-amber-500/40",     glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.15)]" },
  critico: { border: "border-red-500/50",       glow: "shadow-[0_0_24px_-8px_rgba(239,68,68,0.6)]" },
} as const;

export function MetaMensalPanel({ meta, periodoLabel }: Props) {
  const tone = INTENSIDADE_STYLES[meta.intensidade];
  const completed = meta.pendente === 0 && meta.previsto > 0;
  const barTone = completed ? "success"
    : meta.intensidade === "critico" ? "danger"
    : meta.intensidade === "alerta" ? "warning" : "primary";

  return (
    <Card className={cn("p-5 transition-all", tone.border, tone.glow)}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 ring-1 ring-primary/30">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Meta do mês — Preventivas</div>
              <div className="text-xs text-muted-foreground">
                Finalizar o mês sem preventivas pendentes{periodoLabel ? ` · ${periodoLabel}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completed ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Meta cumprida
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  meta.intensidade === "critico" && "bg-red-500/15 text-red-500 border-red-500/30",
                  meta.intensidade === "alerta"  && "bg-amber-500/15 text-amber-500 border-amber-500/30",
                  meta.intensidade === "calmo"   && "bg-secondary text-foreground",
                )}
              >
                {meta.intensidade !== "calmo" && <AlertTriangle className="h-3.5 w-3.5" />}
                {meta.pendente} pendentes
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {meta.diasRestantes} dias restantes
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Cell label="Previsto"   value={meta.previsto} />
          <Cell label="Executado"  value={meta.executado} accent="text-emerald-500" />
          <Cell label="Pendente"   value={meta.pendente} accent={meta.pendente > 0 ? "text-red-500" : "text-emerald-500"} />
          <Cell label="Concluído" value={`${meta.percentual.toFixed(1)}%`} />
        </div>

        <EvolucaoBar value={meta.percentual} tone={barTone} height="lg" />
      </div>
    </Card>
  );
}

function Cell({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums", accent ?? "text-foreground")}>{value}</div>
    </div>
  );
}