import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Wrench, CheckCircle, ClipboardList, CheckSquare, ArrowUp, ArrowDown, Minus, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { DisponibilidadeEquipamentos } from "@/features/engenharia/components/DisponibilidadeEquipamentos";
import { OsPorEstado } from "@/features/engenharia/components/OsPorEstado";
import { OsPorSetor } from "@/features/engenharia/components/OsPorSetor";
import type { OSOperacaoRow } from "@/features/engenharia/hooks/useClienteOperacaoData";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const mesIdx = (m: string) => MES_ORDEM[(m || "").trim().toLowerCase()] ?? 0;
const num = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

interface Cliente { id: string; nome: string; responsavel: string | null }
interface Indicador { cliente_id: string; mes: string; ano: number; [k: string]: any }

export default function PublicoCliente() {
  const { token } = useParams<{ token: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [ordens, setOrdens] = useState<OSOperacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setErro("Link inválido"); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.rpc("get_dados_publicos_cliente" as any, { _token: token });
      if (cancelled) return;
      if (error) { setErro(error.message); setLoading(false); return; }
      if (!data) { setErro("Link inválido ou expirado"); setLoading(false); return; }
      const payload = data as any;
      setCliente(payload.cliente);
      setIndicadores(payload.indicadores || []);
      setOrdens((payload.ordens_servico || []) as OSOperacaoRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const periodos = useMemo(() => {
    const map = new Map<string, { mes: string; ano: number }>();
    for (const i of indicadores) {
      const k = `${i.ano}-${i.mes}`;
      if (!map.has(k)) map.set(k, { mes: i.mes, ano: i.ano });
    }
    return Array.from(map.values()).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : mesIdx(a.mes) - mesIdx(b.mes));
  }, [indicadores]);

  useEffect(() => {
    if (!periodo && periodos.length > 0) {
      const last = periodos[periodos.length - 1];
      setPeriodo(`${last.ano}-${last.mes}`);
    }
  }, [periodos, periodo]);

  const idxAtual = periodos.findIndex(p => `${p.ano}-${p.mes}` === periodo);
  const atual = idxAtual >= 0 ? indicadores.find(i => i.ano === periodos[idxAtual].ano && i.mes === periodos[idxAtual].mes) : undefined;
  const anterior = idxAtual > 0 ? indicadores.find(i => i.ano === periodos[idxAtual - 1].ano && i.mes === periodos[idxAtual - 1].mes) : undefined;

  const periodoAtivo = idxAtual >= 0 ? periodos[idxAtual] : undefined;
  const osPeriodo = useMemo(() => {
    if (!periodoAtivo) return [] as OSOperacaoRow[];
    return ordens.filter(o => o.ano === periodoAtivo.ano && (o.mes || "").toLowerCase() === periodoAtivo.mes.toLowerCase());
  }, [ordens, periodoAtivo]);
  const equipamentosTotais = useMemo(() => {
    const set = new Set<string>();
    for (const o of ordens) {
      const k = (o.numero_serie || o.tag || "").trim();
      if (k) set.add(k);
    }
    return set;
  }, [ordens]);

  const chartData = periodos.map(p => {
    const row = indicadores.find(i => i.ano === p.ano && i.mes === p.mes);
    return {
      mes: cap(p.mes),
      corretivasAbertas: num(row?.total_corretivas_abertas),
      corretivasFechadas: num(row?.total_corretivas_fechadas),
      preventivasAbertas: num(row?.total_preventivas_abertas),
      preventivasFechadas: num(row?.total_preventivas_fechadas),
    };
  });

  const radarData = atual ? [
    { indicador: "Triagem Emergente", Engenharia: num(atual.eng_pct_sla_triagem_emergente), Predial: num(atual.pred_pct_sla_triagem_emergente) },
    { indicador: "Triagem Urgente", Engenharia: num(atual.eng_pct_sla_triagem_urgente), Predial: num(atual.pred_pct_sla_triagem_urgente) },
    { indicador: "Triagem Pouco Urgente", Engenharia: num(atual.eng_pct_sla_triagem_poucourgente), Predial: num(atual.pred_pct_sla_triagem_poucourgente) },
    { indicador: "Fechamento Emergente", Engenharia: num(atual.eng_pct_sla_fechamento_emergente), Predial: num(atual.pred_pct_sla_fechamento_emergente) },
    { indicador: "Fechamento Urgente", Engenharia: num(atual.eng_pct_sla_fechamento_urgente), Predial: num(atual.pred_pct_sla_fechamento_urgente) },
  ] : [];

  const linhaData = periodos.map(p => {
    const row = indicadores.find(i => i.ano === p.ano && i.mes === p.mes);
    const eng = (num(row?.eng_pct_sla_triagem_urgente) + num(row?.eng_pct_sla_fechamento_urgente)) / 2;
    const pred = (num(row?.pred_pct_sla_triagem_urgente) + num(row?.pred_pct_sla_fechamento_urgente)) / 2;
    return { mes: cap(p.mes), Engenharia: Number(eng.toFixed(2)), Predial: Number(pred.toFixed(2)) };
  });

  const kpis = [
    { label: "Corretivas Abertas", icon: Wrench, field: "total_corretivas_abertas" },
    { label: "Corretivas Fechadas", icon: CheckCircle, field: "total_corretivas_fechadas" },
    { label: "Preventivas Abertas", icon: ClipboardList, field: "total_preventivas_abertas" },
    { label: "Preventivas Fechadas", icon: CheckSquare, field: "total_preventivas_fechadas" },
  ];

  if (loading) {
    return <div className="min-h-screen bg-background p-6"><DashboardSkeleton /></div>;
  }

  if (erro || !cliente) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">{erro || "Este link não está mais ativo."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="container mx-auto max-w-7xl px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Painel de Manutenção</p>
            <h1 className="text-2xl font-bold">{cliente.nome}</h1>
            {cliente.responsavel && <p className="text-sm text-muted-foreground">{cliente.responsavel}</p>}
          </div>
          {periodos.length > 0 && (
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
              <SelectContent>
                {periodos.map(p => (
                  <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>{cap(p.mes)} / {p.ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {indicadores.length === 0 && (
          <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Ainda não há dados disponíveis para este cliente.</CardContent></Card>
        )}

        {atual && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {kpis.map(kpi => {
                const Icon = kpi.icon;
                const valor = num((atual as any)[kpi.field]);
                const valorAnt = anterior ? num((anterior as any)[kpi.field]) : null;
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
                      <div className="text-3xl font-bold">{valor}</div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${corClasse}`}>
                        <TrendIcon className="h-3.5 w-3.5" />
                        <span>{pct === null ? "Sem mês anterior" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs mês anterior`}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Corretivas por Mês</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Preventivas por Mês</CardTitle></CardHeader>
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

            <Card>
              <CardHeader><CardTitle className="text-base">Comparativo de SLA — Engenharia vs Predial</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="indicador" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Radar name="Engenharia Clínica" dataKey="Engenharia" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name="Manutenção Predial" dataKey="Predial" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Evolução Mensal do SLA</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={linhaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <ReferenceLine y={90} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Meta 90%", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="Engenharia" stroke="#3b82f6" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="Predial" stroke="#f97316" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <DisponibilidadeEquipamentos osPeriodo={osPeriodo} equipamentosTotais={equipamentosTotais} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <OsPorEstado os={osPeriodo} />
              <OsPorSetor os={osPeriodo} />
            </div>
          </>
        )}

        <footer className="text-center text-xs text-muted-foreground pt-6 pb-2">
          Atualizado em tempo real • Acesso somente leitura
        </footer>
      </main>
    </div>
  );
}