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
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

        <TabsContent value="eng" className="mt-4">
          <SetorPanel
            atual={atual}
            prefix="eng"
            num={num}
            prioridadesMode="pct"
          />
        </TabsContent>

        <TabsContent value="pred" className="mt-4">
          <SetorPanel
            atual={atual}
            prefix="pred"
            num={num}
            prioridadesMode="abs"
            extraArCondicionado
          />
        </TabsContent>

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

function corPct(v: number) {
  if (v >= 90) return "hsl(142 71% 45%)"; // verde
  if (v >= 70) return "hsl(48 96% 53%)"; // amarelo
  return "hsl(0 84% 60%)"; // vermelho
}

function SlaBar({ label, value }: { label: string; value: number }) {
  const cor = corPct(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold" style={{ color: cor }}>{value.toFixed(1)}%</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: cor }}
        />
      </div>
    </div>
  );
}

function GaugeFechamento({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  const cor = corPct(v);
  const data = [
    { name: "filled", value: v },
    { name: "rest", value: 100 - v },
  ];
  return (
    <div className="relative w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            startAngle={180}
            endAngle={0}
            cy="80%"
            innerRadius="70%"
            outerRadius="100%"
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={cor} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center pointer-events-none">
        <span className="text-3xl font-bold" style={{ color: cor }}>{v.toFixed(1)}%</span>
        <span className="text-xs text-muted-foreground">Taxa de fechamento</span>
      </div>
    </div>
  );
}

interface SetorPanelProps {
  atual: any;
  prefix: "eng" | "pred";
  num: (v: any) => number;
  prioridadesMode: "pct" | "abs";
  extraArCondicionado?: boolean;
}

function SetorPanel({ atual, prefix, num, prioridadesMode, extraArCondicionado }: SetorPanelProps) {
  const f = (k: string) => num(atual?.[`${prefix}_${k}`]);

  const kpis = [
    { label: "Corretivas Abertas", icon: Wrench, value: f("corretivas_abertas") },
    { label: "Corretivas Fechadas", icon: CheckCircle, value: f("corretivas_fechadas") },
    { label: "Preventivas Abertas", icon: ClipboardList, value: f("preventivas_abertas") },
    { label: "Preventivas Fechadas", icon: CheckSquare, value: f("preventivas_fechadas") },
  ];

  const pctFechamento = f("pct_corretivas_fechadas");

  let prioridades: { name: string; value: number }[];
  if (prioridadesMode === "pct") {
    prioridades = [
      { name: "Emergente", value: f("pct_emergentes") },
      { name: "Urgente", value: f("pct_urgentes") },
      { name: "Pouco Urgente", value: f("pct_poucourgentes") },
    ];
  } else {
    const e = f("os_emergentes");
    const u = f("os_urgentes");
    const p = f("os_pouco_urgentes");
    const total = e + u + p;
    prioridades = total > 0
      ? [
          { name: "Emergente", value: (e / total) * 100 },
          { name: "Urgente", value: (u / total) * 100 },
          { name: "Pouco Urgente", value: (p / total) * 100 },
        ]
      : [
          { name: "Emergente", value: 0 },
          { name: "Urgente", value: 0 },
          { name: "Pouco Urgente", value: 0 },
        ];
  }
  const CORES_PRIO = ["hsl(0 84% 60%)", "hsl(48 96% 53%)", "hsl(217 91% 60%)"];

  const slaBars = [
    { label: "Triagem Emergente", value: f("pct_sla_triagem_emergente") },
    { label: "Triagem Urgente", value: f("pct_sla_triagem_urgente") },
    { label: "Triagem Pouco Urgente", value: f("pct_sla_triagem_poucourgente") },
    { label: "Fechamento Emergente", value: f("pct_sla_fechamento_emergente") },
    { label: "Fechamento Urgente", value: f("pct_sla_fechamento_urgente") },
  ];

  const arItems = extraArCondicionado
    ? [
        { label: "AR SC GD", fech: f("ar_sc_gd_fechadas"), abert: f("ar_sc_gd_abertas") },
        { label: "AR CG GZ", fech: f("ar_cg_gz_fechadas"), abert: f("ar_cg_gz_abertas") },
        { label: "Demais Preventivas", fech: f("demais_fechadas"), abert: f("demais_abertas") },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de Fechamento de Corretivas</CardTitle>
          </CardHeader>
          <CardContent>
            <GaugeFechamento value={pctFechamento} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Prioridades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={prioridades}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${Number(e.value).toFixed(0)}%`}
                >
                  {prioridades.map((_, i) => (
                    <Cell key={i} fill={CORES_PRIO[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {slaBars.map(b => (
            <SlaBar key={b.label} label={b.label} value={b.value} />
          ))}
        </CardContent>
      </Card>

      {extraArCondicionado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ar Condicionado e Demais Preventivas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {arItems.map(item => {
              const pct = item.abert > 0 ? (item.fech / item.abert) * 100 : 0;
              const cor = corPct(pct);
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold" style={{ color: cor }}>
                      {item.fech} / {item.abert} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: cor }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}