import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvolucaoBar } from "./EvolucaoBar";
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
  const { cliente, status, pctPreventivas, totalOsAbertas, osVencidas } = agg;
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  const barTone = status === "critico" ? "danger" : status === "atencao" ? "warning" : "success";

  return (
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
              <p className="text-xs text-muted-foreground truncate">Resp.: {cliente.responsavel}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("gap-1", meta.cls)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            <Icon className="h-3 w-3" /> {meta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Cell label="OS abertas" value={totalOsAbertas} tone={totalOsAbertas > 0 ? "warning" : "neutral"} />
          <Cell label="Vencidas"   value={osVencidas} tone={osVencidas > 0 ? "danger" : "neutral"} />
          <Cell label="Corretivas" value={agg.corretivasAbertas} tone={agg.corretivasAbertas >= 5 ? "danger" : "neutral"} />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Preventivas executadas</span>
            <span className="tabular-nums font-medium">{pctPreventivas.toFixed(1)}%</span>
          </div>
          <EvolucaoBar value={pctPreventivas} tone={barTone} height="sm" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
          <span>Última atualização: {fmtDate(agg.ultimaAtualizacao)}</span>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full gap-1">
          <Link to={`/manutencao/cliente/${cliente.id}`}>
            Ver dashboard completo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Cell({ label, value, tone }: { label: string; value: number; tone: "neutral" | "warning" | "danger" }) {
  const cls = tone === "danger" ? "text-red-500" : tone === "warning" ? "text-amber-500" : "text-foreground";
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <div className={cn("text-lg font-bold tabular-nums", cls)}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}