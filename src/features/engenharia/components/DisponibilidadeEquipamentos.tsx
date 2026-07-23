import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const indispDetalhes: Array<{ key: string; tipo_equipamento: string | null; tag: string | null; numero_serie: string | null; localizacao: string | null; os_id: string | number | null }> = [];
  for (const r of osPeriodo) {
    if (!isCorretiva(r.tipo_servico)) continue;
    if (!isAberta(r.estado)) continue;
    const k = (r.numero_serie || r.tag || "").trim();
    if (k && equipamentosTotais.has(k)) {
      if (!indisponiveis.has(k)) {
        indisponiveis.add(k);
        indispDetalhes.push({
          key: k,
          tipo_equipamento: (r as any).tipo_equipamento ?? null,
          tag: (r as any).tag ?? null,
          numero_serie: (r as any).numero_serie ?? null,
          localizacao: (r as any).localizacao ?? null,
          os_id: (r as any).id ?? null,
        });
      }
    }
  }
  const indispCount = indisponiveis.size;
  const operCount = Math.max(total - indispCount, 0);
  const pct = total > 0 ? (operCount / total) * 100 : 0;

  const [openIndisp, setOpenIndisp] = useState(false);
  const indispOrdenados = [...indispDetalhes].sort((a, b) => {
    const la = (a.localizacao || "").toLowerCase();
    const lb = (b.localizacao || "").toLowerCase();
    if (la !== lb) return la.localeCompare(lb);
    const na = (a.tipo_equipamento || "").toLowerCase();
    const nb = (b.tipo_equipamento || "").toLowerCase();
    return na.localeCompare(nb);
  });

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
              <Row
                icon={AlertOctagon}
                label="Indisponíveis"
                value={indispCount}
                cls={cn(indispCount > 0 ? "text-red-500" : "text-muted-foreground")}
                onClick={indispCount > 0 ? () => setOpenIndisp(true) : undefined}
              />
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

      <Dialog open={openIndisp} onOpenChange={setOpenIndisp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Equipamentos Indisponíveis ({indispCount})</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>TAG/Nº Série</TableHead>
                  <TableHead>Localização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indispOrdenados.map((e) => (
                  <TableRow key={String(e.os_id ?? e.key)}>
                    <TableCell>{e.tipo_equipamento || "—"}</TableCell>
                    <TableCell className="tabular-nums">{e.tag || e.numero_serie || "—"}</TableCell>
                    <TableCell>{e.localizacao || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({ icon: I, label, value, cls, onClick }: { icon: any; label: string; value: number; cls: string; onClick?: () => void }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2",
        clickable && "cursor-pointer hover:bg-secondary/70 transition-colors"
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <span className="inline-flex items-center gap-2 text-sm">
        <I className={cn("h-4 w-4", cls)} /> {label}
      </span>
      <span className={cn("text-lg font-semibold tabular-nums", cls)}>{value}</span>
    </div>
  );
}