import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OSOperacaoRow } from "../hooks/useClienteOperacaoData";

interface Props {
  osPeriodo: OSOperacaoRow[];
  equipamentosTotais: Set<string>;
}

function isAberta(estado: string | null) {
  const s = (estado || "").toLowerCase();
  if (!s) return false;
  if (s === "fechada" || s === "fechado" || s === "concluída" || s === "concluida" || s === "serviço finalizado") return false;
  if (s === "cancelada" || s === "cancelado") return false;
  return true;
}
function isCorretiva(t: string | null) { return (t || "").toLowerCase().includes("corret"); }

export function DisponibilidadeEquipamentos({ osPeriodo, equipamentosTotais }: Props) {
  const total = equipamentosTotais.size;
  const indisponiveis = new Set<string>();
  for (const r of osPeriodo) {
    if (!isCorretiva(r.tipo_servico)) continue;
    if (!isAberta(r.estado)) continue;
    const k = (r.numero_serie || r.tag || "").trim();
    if (k && equipamentosTotais.has(k)) indisponiveis.add(k);
  }
  const indispCount = indisponiveis.size;
  const operCount = Math.max(total - indispCount, 0);
  const pct = total > 0 ? (operCount / total) * 100 : 0;

  const tone = pct >= 95 ? "emerald" : pct >= 85 ? "amber" : "red";
  const stroke = tone === "emerald" ? "hsl(142 71% 45%)" : tone === "amber" ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";

  // SVG gauge (semicircular)
  const R = 80;
  const C = Math.PI * R;
  const dash = (pct / 100) * C;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Disponibilidade dos Equipamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum equipamento cadastrado para este cliente.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">
                <path d={`M 20 100 A ${R} ${R} 0 0 1 180 100`} fill="none" stroke="hsl(var(--secondary))" strokeWidth="16" strokeLinecap="round" />
                <path
                  d={`M 20 100 A ${R} ${R} 0 0 1 180 100`}
                  fill="none" stroke={stroke} strokeWidth="16" strokeLinecap="round"
                  strokeDasharray={`${dash} ${C}`}
                  className="transition-all duration-500"
                />
                <text x="100" y="92" textAnchor="middle" className="fill-foreground" style={{ fontSize: 28, fontWeight: 700 }}>
                  {pct.toFixed(1)}%
                </text>
                <text x="100" y="112" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                  disponibilidade
                </text>
              </svg>
            </div>
            <div className="space-y-3">
              <Row icon={CheckCircle2} label="Operacionais" value={operCount} cls="text-emerald-500" />
              <Row icon={AlertOctagon} label="Indisponíveis" value={indispCount} cls={cn(indispCount > 0 ? "text-red-500" : "text-muted-foreground")} />
              <div className="pt-2 border-t border-border flex justify-between text-sm">
                <span className="text-muted-foreground">Total de equipamentos</span>
                <Badge variant="outline" className="tabular-nums">{total}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Indisponíveis = equipamentos com corretiva em aberto no período.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ icon: I, label, value, cls }: { icon: any; label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
      <span className="inline-flex items-center gap-2 text-sm">
        <I className={cn("h-4 w-4", cls)} /> {label}
      </span>
      <span className={cn("text-lg font-semibold tabular-nums", cls)}>{value}</span>
    </div>
  );
}