import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ListChecks } from "lucide-react";
import type { OSOperacaoRow } from "../hooks/useClienteOperacaoData";

interface Props { os: OSOperacaoRow[]; }

// Paleta determinística — qualquer estado novo recebe cor por hash, sem alterar código.
const PALETTE = [
  "hsl(217 91% 60%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)",
  "hsl(280 70% 60%)", "hsl(190 80% 50%)", "hsl(330 75% 55%)", "hsl(160 60% 45%)",
  "hsl(45 95% 55%)", "hsl(250 70% 60%)", "hsl(20 85% 55%)", "hsl(100 55% 45%)",
];
function colorFor(label: string, idx: number) { return PALETTE[idx % PALETTE.length] || `hsl(${(label.length * 47) % 360} 70% 55%)`; }

export function OsPorEstado({ os }: Props) {
  const counts = new Map<string, number>();
  for (const r of os) {
    const k = (r.estado || "Sem estado").trim() || "Sem estado";
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const data = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" /> OS por Estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
                  {data.map((d, i) => <Cell key={d.name} fill={colorFor(d.name, i)} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, n) => [`${v} (${((v / total) * 100).toFixed(1)}%)`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-1.5 max-h-[260px] overflow-auto pr-1">
              {data.map((d, i) => {
                const pct = (d.value / total) * 100;
                return (
                  <li key={d.name} className="flex items-center justify-between text-sm gap-2">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorFor(d.name, i) }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {d.value} <span className="text-[11px]">({pct.toFixed(1)}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}