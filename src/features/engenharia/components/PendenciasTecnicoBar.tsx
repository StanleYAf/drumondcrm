import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TecnicoAgg } from "../hooks/useEngenhariaData";

interface Props { tecnicos: TecnicoAgg[]; max?: number; }

export function PendenciasTecnicoBar({ tecnicos, max = 10 }: Props) {
  const ranked = [...tecnicos].sort((a, b) => b.pendencias - a.pendencias).slice(0, max);
  const maior = ranked[0]?.pendencias || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Pendências por técnico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem pendências no período.
          </p>
        ) : (
          <div className="space-y-3">
            {ranked.map((t) => {
              const pct = (t.pendencias / maior) * 100;
              const tone =
                t.pendencias >= 15 ? "from-red-500/80 to-red-500"
                : t.pendencias >= 8 ? "from-amber-500/80 to-amber-500"
                : "from-primary/80 to-primary";
              return (
                <div key={t.nome} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate pr-2">{t.nome}</span>
                    <span className="tabular-nums text-muted-foreground">{t.pendencias} pendências</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", tone)}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}