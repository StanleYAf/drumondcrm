import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Upload, Wrench, CheckCircle, ClipboardList, CheckSquare, ArrowUp, ArrowDown, Minus, ArrowLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { useManutencaoData } from "@/hooks/useManutencaoData";
import { useClienteOperacaoData } from "@/features/engenharia/hooks/useClienteOperacaoData";
import { DisponibilidadeEquipamentos } from "@/features/engenharia/components/DisponibilidadeEquipamentos";
import { OsPorEstado } from "@/features/engenharia/components/OsPorEstado";
import { OsPorSetor } from "@/features/engenharia/components/OsPorSetor";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function mesIndex(mes: string) {
  return MES_ORDEM[mes.trim().toLowerCase()] ?? 0;
}

export default function Manutencao() {
  const navigate = useNavigate();
  const { clienteId: paramId } = useParams<{ clienteId: string }>();
  const clienteId = paramId || null;
  const [periodo, setPeriodo] = useState<string>("");

  const { indicadores, clientes, clienteSelecionado, loading, error } = useManutencaoData(clienteId);

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
  const { tecnicosMes } = useManutencaoData(clienteId, mesSel, anoSel);
  const { osPeriodo, equipamentosTotais } = useClienteOperacaoData(clienteId, mesSel, anoSel);

  if (!clienteId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Button variant="ghost" onClick={() => navigate("/manutencao")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para Visão Geral
        </Button>
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Cliente não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <Button variant="ghost" size="sm" onClick={() => navigate("/manutencao")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Voltar para Visão Geral
      </Button>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard — {clienteSelecionado?.nome ?? "Cliente"}
          </h1>
          {clienteSelecionado?.responsavel && (
            <p className="text-sm text-muted-foreground mt-1">{clienteSelecionado.responsavel}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button onClick={() => navigate(`/manutencao/upload?cliente=${clienteId}`)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visao" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex sm:grid sm:grid-cols-6 w-full min-w-max sm:min-w-0">
            <TabsTrigger value="visao" className="whitespace-nowrap">Visão Geral</TabsTrigger>
            <TabsTrigger value="oper" className="whitespace-nowrap">Operação</TabsTrigger>
            <TabsTrigger value="eng" className="whitespace-nowrap">Engenharia Clínica</TabsTrigger>
            <TabsTrigger value="pred" className="whitespace-nowrap">Manutenção Predial</TabsTrigger>
            <TabsTrigger value="sla" className="whitespace-nowrap">Análise de SLA</TabsTrigger>
            <TabsTrigger value="tec" className="whitespace-nowrap">Desempenho Técnico</TabsTrigger>
          </TabsList>
        </div>

        {indicadores.length === 0 && (
          <div className="mt-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Nenhum dado disponível ainda. Use <span className="font-medium text-foreground">Importar Excel</span> para carregar o primeiro mês.
          </div>
        )}

        <TabsContent value="tec" className="mt-4">
          <DesempenhoTecnico tecnicos={tecnicosMes} num={num} />
        </TabsContent>

        <TabsContent value="oper" className="mt-4 space-y-4">
          <DisponibilidadeEquipamentos osPeriodo={osPeriodo} equipamentosTotais={equipamentosTotais} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <OsPorEstado os={osPeriodo} />
            <OsPorSetor os={osPeriodo} />
          </div>
        </TabsContent>

        <TabsContent value="sla" className="mt-4 space-y-6">
          {(() => {
            const radarData = [
              { indicador: "Triagem Emergente", Engenharia: num(atual?.eng_pct_sla_triagem_emergente), Predial: num(atual?.pred_pct_sla_triagem_emergente) },
              { indicador: "Triagem Urgente", Engenharia: num(atual?.eng_pct_sla_triagem_urgente), Predial: num(atual?.pred_pct_sla_triagem_urgente) },
              { indicador: "Triagem Pouco Urgente", Engenharia: num(atual?.eng_pct_sla_triagem_poucourgente), Predial: num(atual?.pred_pct_sla_triagem_poucourgente) },
              { indicador: "Fechamento Emergente", Engenharia: num(atual?.eng_pct_sla_fechamento_emergente), Predial: num(atual?.pred_pct_sla_fechamento_emergente) },
              { indicador: "Fechamento Urgente", Engenharia: num(atual?.eng_pct_sla_fechamento_urgente), Predial: num(atual?.pred_pct_sla_fechamento_urgente) },
            ];
            const linhaData = periodosOrdenados.map(p => {
              const row = indicadores.find(i => i.ano === p.ano && i.mes === p.mes);
              const eng = (num(row?.eng_pct_sla_triagem_urgente) + num(row?.eng_pct_sla_fechamento_urgente)) / 2;
              const pred = (num(row?.pred_pct_sla_triagem_urgente) + num(row?.pred_pct_sla_fechamento_urgente)) / 2;
              return { mes: capitalize(p.mes), Engenharia: Number(eng.toFixed(2)), Predial: Number(pred.toFixed(2)) };
            });
            return (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Comparativo de SLA — Engenharia vs Predial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                        <PolarGrid gridType="polygon" stroke="#374151" strokeDasharray="4 4" radialLines />
                        <PolarAngleAxis
                          dataKey="indicador"
                          tick={{ fontSize: 13, fill: "#ffffff" }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tickCount={6}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          stroke="#374151"
                        />
                        <Radar
                          name="Engenharia Clínica"
                          dataKey="Engenharia"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="#3b82f6"
                          fillOpacity={0.3}
                          label={{
                            fill: "#3b82f6",
                            fontSize: 12,
                            fontWeight: 600,
                            formatter: (v: number) => `${Math.round(v)}%`,
                          }}
                        />
                        <Radar
                          name="Manutenção Predial"
                          dataKey="Predial"
                          stroke="#f97316"
                          strokeWidth={2}
                          fill="#f97316"
                          fillOpacity={0.3}
                          label={{
                            fill: "#f97316",
                            fontSize: 12,
                            fontWeight: 600,
                            formatter: (v: number) => `${Math.round(v)}%`,
                          }}
                        />
                        <Tooltip content={<SlaTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          iconType="circle"
                          iconSize={14}
                          wrapperStyle={{ paddingTop: 16, fontSize: 14 }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Evolução Mensal do SLA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={linhaData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip content={<SlaTooltip />} />
                        <Legend />
                        <ReferenceLine y={90} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Meta 90%", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Line type="monotone" dataKey="Engenharia" name="SLA Médio Engenharia" stroke="#3b82f6" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="Predial" name="SLA Médio Predial" stroke="#f97316" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

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
      <SatisfacaoCliente clienteId={clienteId} mes={mesSel} ano={anoSel} />
    </div>
  );
}

function corPct(v: number) {
  if (v >= 90) return "hsl(142 71% 45%)"; // verde
  if (v >= 70) return "hsl(48 96% 53%)"; // amarelo
  return "hsl(0 84% 60%)"; // vermelho
}

function SlaTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const colorFor = (name: string) => (name === "Engenharia" || name === "SLA Médio Engenharia" ? "#3b82f6" : "#f97316");
  const labelFor = (name: string) => {
    if (name === "Engenharia") return "Engenharia Clínica";
    if (name === "Predial") return "Manutenção Predial";
    return name;
  };
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md text-sm">
      {label && <div className="mb-1 font-medium">{label}</div>}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: colorFor(p.dataKey) }} />
            <span className="text-muted-foreground">{labelFor(p.dataKey)}:</span>
            <span className="font-semibold tabular-nums">{Number(p.value ?? 0).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function corPctTec(v: number) {
  if (v >= 80) return "hsl(142 71% 45%)";
  if (v >= 60) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
}

function DesempenhoTecnico({ tecnicos, num }: { tecnicos: any[]; num: (v: any) => number }) {
  const [setor, setSetor] = useState<"todos" | "Engenharia Clínica" | "Predial">("todos");

  const filtrados = useMemo(() => {
    const norm = (s: string) => (s || "").trim().toLowerCase();
    const list = tecnicos.filter(t => {
      if (setor === "todos") return true;
      const s = norm(t.setor);
      if (setor === "Engenharia Clínica") return s.includes("eng");
      return s.includes("pred");
    });
    return [...list].sort((a, b) => num(b.total_os) - num(a.total_os));
  }, [tecnicos, setor, num]);

  const top5 = filtrados.slice(0, 5);
  const maxOs = num(top5[0]?.total_os) || 1;

  const setorBadge = (s: string) => {
    const norm = (s || "").trim().toLowerCase();
    if (norm.includes("eng")) return { label: "Engenharia Clínica", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" };
    return { label: "Predial", cls: "bg-green-500/15 text-green-500 border-green-500/30" };
  };

  const filtros: { v: typeof setor; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "Engenharia Clínica", label: "Engenharia Clínica" },
    { v: "Predial", label: "Predial" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {filtros.map(f => (
          <Button
            key={f.v}
            variant={setor === f.v ? "default" : "outline"}
            size="sm"
            onClick={() => setSetor(f.v)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 5 Técnicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {top5.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado disponível para o período selecionado</p>
          ) : top5.map((t, i) => {
            const total = num(t.total_os);
            const pct = (total / maxOs) * 100;
            const badge = setorBadge(t.setor);
            return (
              <div key={t.id || `${t.nome}-${i}`} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary shrink-0">
                  {i + 1}º
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{t.nome}</span>
                    <Badge variant="outline" className={cn("border", badge.cls)}>{badge.label}</Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold">{total}</div>
                  <div className="text-xs text-muted-foreground">OS realizadas</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tabela Completa</CardTitle>
        </CardHeader>
        <CardContent>
          {filtrados.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado disponível para o período selecionado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Total OS</TableHead>
                    <TableHead className="text-right">Corretivas</TableHead>
                    <TableHead className="text-right">Preventivas</TableHead>
                    <TableHead className="text-right">% Atendimento</TableHead>
                    <TableHead className="text-right">% Fechamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((t, i) => {
                    const badge = setorBadge(t.setor);
                    const pa = num(t.percentual_atendimento);
                    const pf = num(t.percentual_fechamento);
                    return (
                      <TableRow key={t.id || `${t.nome}-${i}`}>
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border", badge.cls)}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{num(t.total_os)}</TableCell>
                        <TableCell className="text-right">{num(t.corretivas)}</TableCell>
                        <TableCell className="text-right">{num(t.preventivas)}</TableCell>
                        <TableCell className="text-right font-semibold" style={{ color: corPctTec(pa) }}>
                          {pa.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-semibold" style={{ color: corPctTec(pf) }}>
                          {pf.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
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
              const total = item.fech + item.abert;
              const pct = total > 0 ? (item.fech / total) * 100 : 0;
              const cor = corPct(pct);
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold" style={{ color: cor }}>
                      {item.fech} / {total} ({pct.toFixed(1)}%)
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
type _AvaliacaoRow = { numero_os: string; nota: number; comentario: string | null; responsavel_tecnico: string | null; arquivado_em: string | null; created_at: string };

function _notaFill(n: number) {
  if (n === 5) return "hsl(142 71% 35%)";
  if (n === 4) return "hsl(142 71% 55%)";
  if (n === 3) return "hsl(45 93% 55%)";
  if (n === 2) return "hsl(25 95% 55%)";
  return "hsl(0 84% 55%)";
}

export function SatisfacaoCliente({
  clienteId,
  mes,
  ano,
  initialItems,
}: {
  clienteId?: string | null;
  mes?: string | null;
  ano?: number | null;
  initialItems?: _AvaliacaoRow[];
}) {
  const [loading, setLoading] = useState(!initialItems);
  const [items, setItems] = useState<_AvaliacaoRow[]>(initialItems ?? []);

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: avals } = await supabase
        .from("avaliacoes_chamados")
        .select("numero_os, nota, comentario, responsavel_tecnico, arquivado_em, created_at");
      let list = ((avals ?? []) as unknown) as _AvaliacaoRow[];

      // Filtra por cliente e/ou período (mes/ano) via join com ordens_servico
      const precisaFiltrarOS = Boolean(clienteId || mes || ano);
      if (precisaFiltrarOS && list.length) {
        const numeros = Array.from(new Set(list.map((a) => a.numero_os)));
        // paginar in() para evitar limites do PostgREST
        const CHUNK = 500;
        const allowed = new Set<string>();
        for (let i = 0; i < numeros.length; i += CHUNK) {
          const slice = numeros.slice(i, i + CHUNK);
          let q = supabase
            .from("ordens_servico")
            .select("numero, cliente_id, mes, ano")
            .in("numero", slice);
          if (clienteId) q = q.eq("cliente_id", clienteId);
          if (mes) q = q.eq("mes", mes);
          if (ano) q = q.eq("ano", ano);
          const { data: os } = await q;
          ((os ?? []) as Array<{ numero: string }>).forEach((o) => allowed.add(o.numero));
        }
        list = list.filter((a) => allowed.has(a.numero_os));
      }
      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clienteId, mes, ano, initialItems]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Satisfação do Cliente</CardTitle></CardHeader>
        <CardContent><div className="h-40 rounded-xl bg-muted/30 animate-pulse" /></CardContent>
      </Card>
    );
  }

  // Quando mes/ano vêm do seletor da página, a filtragem já foi feita no join com ordens_servico.
  // Caso contrário (nenhum período informado), mantém o comportamento antigo (mês atual pela data da avaliação).
  const now = new Date();
  let itemsMes: _AvaliacaoRow[];
  let nomeMes: string;
  if (mes || ano) {
    itemsMes = items;
    const mesLabel = mes ? mes.charAt(0).toUpperCase() + mes.slice(1) : "";
    nomeMes = [mesLabel, ano].filter(Boolean).join(" / ");
  } else {
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    itemsMes = items.filter((a) => {
      const dt = a.arquivado_em ?? a.created_at;
      if (!dt) return false;
      const d = new Date(dt);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });
    nomeMes = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  if (itemsMes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Satisfação do Cliente</CardTitle>
          <p className="text-xs text-muted-foreground capitalize">{nomeMes}</p>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma avaliação registrada em {nomeMes}.
        </CardContent>
      </Card>
    );
  }

  const total = itemsMes.length;
  const media = itemsMes.reduce((s, i) => s + i.nota, 0) / total;
  const criticas = itemsMes.filter((i) => i.nota < 3).length;
  const label = media >= 4.5 ? "Excelente" : media >= 4 ? "Bom" : media >= 3 ? "Regular" : "Ruim";
  const cardCls =
    media >= 4.5 ? "bg-emerald-500/10 border-emerald-500/40"
    : media >= 4 ? "bg-green-500/10 border-green-500/40"
    : media >= 3 ? "bg-yellow-500/10 border-yellow-500/40"
    : "bg-red-500/10 border-red-500/40";
  const dist = [5, 4, 3, 2, 1].map((n) => ({ nota: `${n}★`, notaN: n, qtd: itemsMes.filter((i) => i.nota === n).length }));
  const criticasList = [...itemsMes].filter((i) => i.nota < 3).sort((a, b) => {
    const da = a.arquivado_em ?? a.created_at;
    const db = b.arquivado_em ?? b.created_at;
    return (db ?? "").localeCompare(da ?? "");
  });
  const recentes = [...itemsMes].sort((a, b) => {
    const da = a.arquivado_em ?? a.created_at;
    const db = b.arquivado_em ?? b.created_at;
    return (db ?? "").localeCompare(da ?? "");
  }).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Satisfação do Cliente</h3>
        <span className="text-xs text-muted-foreground capitalize">{nomeMes}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn("border", cardCls)}>
          <CardHeader><CardTitle className="text-base">Média do Mês</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{media.toFixed(1)}</span>
              <Star className="h-6 w-6 fill-current text-yellow-400" />
            </div>
            <div className="text-lg font-semibold">{label}</div>
            <div className="text-sm text-muted-foreground">{total} avalia{total === 1 ? "ção" : "ções"}</div>
          </CardContent>
        </Card>

        <Card className={cn("border", criticas > 0 ? "bg-red-500/10 border-red-500/40" : "bg-emerald-500/10 border-emerald-500/40")}>
          <CardHeader><CardTitle className="text-base">Avaliações Críticas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-5xl font-bold" style={{ color: criticas > 0 ? "hsl(0 84% 55%)" : undefined }}>
              {criticas}
            </div>
            <div className="text-sm text-muted-foreground">Notas abaixo de 3</div>
            <div className="text-xs text-muted-foreground">
              {total > 0 ? `${((criticas / total) * 100).toFixed(0)}% do total do mês` : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Distribuição das Notas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dist} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="nota" stroke="hsl(var(--muted-foreground))" fontSize={12} width={40} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="qtd" radius={[0, 6, 6, 0]}>
                  {dist.map((d) => <Cell key={d.notaN} fill={_notaFill(d.notaN)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {criticasList.length > 0 && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Avaliações Críticas do Mês ({criticasList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticasList.map((a, idx) => {
              const dt = a.arquivado_em ?? a.created_at;
              const dataFmt = dt ? new Date(dt).toLocaleDateString("pt-BR") : "—";
              return (
                <div key={`crit-${a.numero_os}-${idx}`} className="rounded-xl border border-red-500/30 bg-background/50 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className="text-white border-0" style={{ backgroundColor: _notaFill(a.nota) }}>{a.nota} ★</Badge>
                      <span className="text-sm font-medium">OS {a.numero_os}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{dataFmt}</span>
                  </div>
                  {a.comentario && <p className="text-sm text-foreground">{a.comentario}</p>}
                  {a.responsavel_tecnico && <p className="text-xs text-muted-foreground">Técnico: {a.responsavel_tecnico}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Avaliações Recentes do Mês</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {recentes.map((a, idx) => {
            const dt = a.arquivado_em ?? a.created_at;
            const dataFmt = dt ? new Date(dt).toLocaleDateString("pt-BR") : "—";
            return (
              <div key={`${a.numero_os}-${idx}`} className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="text-white border-0" style={{ backgroundColor: _notaFill(a.nota) }}>{a.nota} ★</Badge>
                    <span className="text-sm font-medium">OS {a.numero_os}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{dataFmt}</span>
                </div>
                {a.comentario && <p className="text-sm text-foreground">{a.comentario}</p>}
                {a.responsavel_tecnico && <p className="text-xs text-muted-foreground">Técnico: {a.responsavel_tecnico}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
