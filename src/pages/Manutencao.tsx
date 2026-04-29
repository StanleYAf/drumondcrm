import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Wrench, CheckCircle, ClipboardList, CheckSquare, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { useManutencaoData } from "@/hooks/useManutencaoData";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function mesIndex(mes: string) {
  return MES_ORDEM[mes.trim().toLowerCase()] ?? 0;
}

export default function Manutencao() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<string>("");

  const { indicadores, loading, error } = useManutencaoData();

  const periodos = useMemo(() => {
    const set = new Map<string, { mes: string; ano: number }>();
    for (const i of indicadores) {
      const key = `${i.ano}-${i.mes}`;
      if (!set.has(key)) set.set(key, { mes: i.mes, ano: i.ano });
    }
    return Array.from(set.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return mesIndex(a.mes) - mesIndex(b.mes);
    });
  }, [indicadores]);

  useEffect(() => {
    if (!periodo && periodos.length > 0) {
      const last = periodos[periodos.length - 1];
      setPeriodo(`${last.ano}-${last.mes}`);
    }
  }, [periodos, periodo]);

  const [anoSel, mesSel] = useMemo(() => {
    if (!periodo) return [undefined, undefined] as const;
    const [a, ...rest] = periodo.split("-");
    return [Number(a), rest.join("-")] as const;
  }, [periodo]);

  // Subscribe to filtered tecnicos via hook (separate instance)
  const { tecnicosMes } = useManutencaoData(mesSel, anoSel);
  void tecnicosMes;

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const periodosOrdenados = periodos;
  const idxAtual = periodosOrdenados.findIndex(p => `${p.ano}-${p.mes}` === periodo);
  const atual = idxAtual >= 0 ? indicadores.find(i => i.ano === periodosOrdenados[idxAtual].ano && i.mes === periodosOrdenados[idxAtual].mes) : undefined;
  const anterior = idxAtual > 0 ? indicadores.find(i => i.ano === periodosOrdenados[idxAtual - 1].ano && i.mes === periodosOrdenados[idxAtual - 1].mes) : undefined;

  const num = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);

  const kpis = [
    { label: "Corretivas Abertas", icon: Wrench, field: "total_corretivas_abertas" as const },
    { label: "Corretivas Fechadas", icon: CheckCircle, field: "total_corretivas_fechadas" as const },
    { label: "Preventivas Abertas", icon: ClipboardList, field: "total_preventivas_abertas" as const },
    { label: "Preventivas Fechadas", icon: CheckSquare, field: "total_preventivas_fechadas" as const },
  ];

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const chartData = periodosOrdenados.map(p => {
    const row = indicadores.find(i => i.ano === p.ano && i.mes === p.mes);
    return {
      mes: capitalize(p.mes),
      corretivasAbertas: num(row?.total_corretivas_abertas),
      corretivasFechadas: num(row?.total_corretivas_fechadas),
      preventivasAbertas: num(row?.total_preventivas_abertas),
      preventivasFechadas: num(row?.total_preventivas_fechadas),
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Manutenção</h1>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map(p => (
                <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
                  {p.mes} / {p.ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/manutencao/upload")} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visao" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="eng">Engenharia Clínica</TabsTrigger>
          <TabsTrigger value="pred">Manutenção Predial</TabsTrigger>
          <TabsTrigger value="sla">Análise de SLA</TabsTrigger>
          <TabsTrigger value="tec">Desempenho Técnico</TabsTrigger>
        </TabsList>

        {[
          { v: "eng", label: "Engenharia Clínica" },
          { v: "pred", label: "Manutenção Predial" },
          { v: "sla", label: "Análise de SLA" },
          { v: "tec", label: "Desempenho Técnico" },
        ].map(t => (
          <TabsContent key={t.v} value={t.v} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em construção — {t.label}</p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="visao" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpis.map(kpi => {
              const Icon = kpi.icon;
              const valor = num(atual?.[kpi.field]);
              const valorAnt = anterior ? num(anterior[kpi.field]) : null;
              let pct: number | null = null;
              if (valorAnt !== null && valorAnt !== 0) pct = ((valor - valorAnt) / valorAnt) * 100;
              else if (valorAnt === 0 && valor > 0) pct = 100;
              const corClasse = pct === null ? "text-muted-foreground" : pct > 0 ? "text-green-500" : pct < 0 ? "text-red-500" : "text-muted-foreground";
              const TrendIcon = pct === null ? Minus : pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
              return (
                <Card key={kpi.field}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground">{valor}</div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${corClasse}`}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      <span>
                        {pct === null ? "Sem mês anterior" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs mês anterior`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Corretivas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="corretivasAbertas" name="Abertas" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="corretivasFechadas" name="Fechadas" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preventivas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="preventivasAbertas" name="Abertas" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="preventivasFechadas" name="Fechadas" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}