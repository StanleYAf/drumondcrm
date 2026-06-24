import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion,
  Wrench, CheckCircle2, CalendarCheck, ClipboardList, Clock,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STATUS_META } from "../config/statusClienteRegras";
import type { ClienteAgg } from "../hooks/useEngenhariaData";

interface Props { agg: ClienteAgg; }

const STATUS_ICON = {
  saudavel: ShieldCheck,
  atencao: AlertTriangle,
  critico: ShieldAlert,
  "sem-dados": ShieldQuestion,
} as const;

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

export function ClienteCard({ agg }: Props) {
  const { cliente, status, osVencidas } = agg;
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];

  return (
    <TooltipProvider delayDuration={150}>
      <Card className={cn(
        "transition-all hover:shadow-lg hover:-translate-y-0.5",
        status === "critico" && "border-red-500/40",
        status === "atencao" && "border-amber-500/30",
      )}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{cliente.nome}</p>
              {cliente.responsavel && (
                <p className="text-xs text-muted-foreground truncate">{cliente.responsavel}</p>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("gap-1 cursor-help", meta.cls)}>
                  <Icon className="h-3 w-3" /> {meta.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Status calculado a partir de corretivas abertas, preventivas pendentes e OS vencidas.
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Metric icon={Wrench}        label="Corr. Abertas"  value={agg.corretivasAbertas}     tip="Manutenções corretivas em aberto no período."
              tone={agg.corretivasAbertas >= 5 ? "danger" : agg.corretivasAbertas >= 2 ? "warning" : "neutral"} />
            <Metric icon={CheckCircle2}  label="Corr. Fechadas" value={agg.corretivasConcluidas}  tone="success" tip="Manutenções corretivas concluídas no período." />
            <Metric icon={ClipboardList} label="Prev. Abertas"  value={agg.preventivasAbertas}    tip="Manutenções preventivas pendentes no período."
              tone={agg.preventivasAbertas >= 10 ? "danger" : agg.preventivasAbertas >= 3 ? "warning" : "neutral"} />
            <Metric icon={CalendarCheck} label="Prev. Fechadas" value={agg.preventivasConcluidas} tone="success" tip="Manutenções preventivas concluídas no período." />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border gap-2">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Atualizado: {fmtDate(agg.ultimaAtualizacao)}
            </span>
            {osVencidas > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-red-500/15 text-red-500 border-red-500/30 gap-1 cursor-help">
                    <AlertTriangle className="h-3 w-3" /> {osVencidas} vencida{osVencidas > 1 ? "s" : ""}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>OS abertas há mais de 30 dias.</TooltipContent>
              </Tooltip>
            )}
          </div>

          <Button asChild size="sm" variant="outline" className="w-full gap-1">
            <Link to={`/manutencao/cliente/${cliente.id}`}>
              Ver dashboard completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function Metric({
  icon: I, label, value, tone, tip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number;
  tone: "neutral" | "warning" | "danger" | "success";
  tip: string;
}) {
  const valueCls =
    tone === "danger"  ? "text-red-500"
    : tone === "warning" ? "text-amber-500"
    : tone === "success" ? "text-emerald-500"
    : "text-foreground";
  const iconCls = valueCls === "text-foreground" ? "text-muted-foreground" : valueCls;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-lg bg-secondary/40 p-2 cursor-help">
          <div className="flex items-center justify-center gap-1">
            <I className={cn("h-3.5 w-3.5", iconCls)} />
            <div className={cn("text-lg font-bold tabular-nums leading-none", valueCls)}>{value}</div>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}