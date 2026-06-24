import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OSOperacaoRow } from "../hooks/useClienteOperacaoData";

interface Props { os: OSOperacaoRow[]; max?: number; }

export function OsPorSetor({ os, max = 12 }: Props) {
  const counts = new Map<string, number>();
  for (const r of os) {
    const raw = (r.localizacao || "").trim();
    const k = raw || "(Sem setor)";
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const ranked = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const total = ranked.reduce((s, d) => s + d.value, 0);
  const top = ranked.slice(0, max);
  const maior = top[0]?.value || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" /> OS por Setor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {top.map((d) => {
                const pct = (d.value / total) * 100;
                const width = (d.value / maior) * 100;
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs gap-2">
                      <span className="truncate font-medium" title={d.name}>{d.name}</span>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {d.value} <span className="text-[11px]">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500",
                        )}
                        style={{ width: `${Math.max(width, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {ranked.length > max && (
              <p className="text-[11px] text-muted-foreground mt-3 text-right">
                Exibindo top {max} de {ranked.length} setores
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}