import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users } from "lucide-react";
import type { TecnicoAgg } from "../hooks/useEngenhariaData";

interface Props { tecnicos: TecnicoAgg[]; }

export function ProdutividadeTecnicos({ tecnicos }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Produtividade dos técnicos
        </CardTitle>
        <Badge variant="outline" className="gap-1">
          <Trophy className="h-3 w-3" /> {tecnicos.length} ativos
        </Badge>
      </CardHeader>
      <CardContent>
        {tecnicos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem dados de OS para o período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Abertas</TableHead>
                  <TableHead className="text-right">Em andamento</TableHead>
                  <TableHead className="text-right">Concluídas</TableHead>
                  <TableHead className="text-right">Prev.</TableHead>
                  <TableHead className="text-right">Corr.</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tecnicos.map((t, idx) => (
                  <TableRow key={t.nome}>
                    <TableCell className="font-medium text-muted-foreground">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.abertas}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.emAndamento}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-500 font-medium">{t.concluidas}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.preventivas}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.corretivas}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{t.score.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}