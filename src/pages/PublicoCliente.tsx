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

function extractLogoPath(v: string | null): string | null {
  if (!v) return null;
  const clean = v.split("?")[0];
  const m = clean.match(/client-logos\/(.+)$/);
  return m ? m[1] : clean;
}

async function getSignedLogoUrl(v: string | null): Promise<string | null> {
  const path = extractLogoPath(v);
  if (!path) return null;
  const { data } = await supabase.storage
    .from("client-logos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl || null;
}

interface Cliente { id: string; nome: string; responsavel: string | null; logo_url: string | null }
interface Indicador { cliente_id: string; mes: string; ano: number; [k: string]: any }

export default function PublicoCliente() {
  const { token } = useParams<{ token: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clienteLogoUrl, setClienteLogoUrl] = useState<string | null>(null);
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

  useEffect(() => {
    if (!cliente?.logo_url) {
      setClienteLogoUrl(null);
      return;
    }
    getSignedLogoUrl(cliente.logo_url).then(url => setClienteLogoUrl(url));
  }, [cliente?.logo_url]);

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
    <div className="min-h-screen w-full bg-[#F4F8FB]">
      {/* DSH Hub branded header */}
      <header
        className="relative flex items-center justify-between px-4 sm:px-8 py-5 text-white overflow-hidden"
        style={{ background: "linear-gradient(90deg, #1F4E79 0%, #25598C 100%)" }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1600 80" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 40 L200 40 L230 20 L260 60 L290 10 L320 70 L350 40 L800 40 L830 25 L860 55 L890 15 L920 65 L950 40 L1600 40"
            stroke="white" strokeOpacity="0.12" strokeWidth="1.5" fill="none"
          />
        </svg>
        <div className="relative flex items-center gap-3 min-w-0">
          <svg width="42" height="42" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 33C19 33 5 23.5 5 13.5C5 9.36 8.36 6 12.5 6C15.1 6 17.4 7.3 19 9.3C20.6 7.3 22.9 6 25.5 6C29.64 6 33 9.36 33 13.5C33 23.5 19 33 19 33Z" stroke="#50B9EC" strokeWidth="1.8" fill="none" />
            <path d="M9 17h4l2-4 3 8 2-5 2 3h7" stroke="#50B9EC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <div className="leading-tight" translate="no">
            <div className="text-xl font-bold tracking-tight">
              <span className="text-white">DSH</span>
              <span style={{ color: "#50B9EC" }}>Hub</span>
            </div>
            <div className="text-[11px] text-white/70">Painel de Manutenção · Acesso do Cliente</div>
          </div>
        </div>
        <div className="relative hidden md:flex items-center gap-3 text-center min-w-0 px-4">
          {clienteLogoUrl && (
            <img src={clienteLogoUrl} alt={cliente.nome} className="h-12 w-12 rounded-lg object-contain bg-white/10" />
          )}
          <div className="flex flex-col items-center">
            <div className="text-[18px] font-bold truncate">{cliente.nome}</div>
            <div className="text-[12px]" style={{ color: "#BCD7EC" }}>
              {cliente.responsavel || "Relatório de Manutenção"}
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-3">
          {periodos.length > 0 && (
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/15">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {periodos.map(p => (
                  <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>{cap(p.mes)} / {p.ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>
      <div className="md:hidden px-4 py-3 bg-white border-b border-[#E2E8F0]">
        <div className="text-base font-bold text-[#1F4E79]">{cliente.nome}</div>
        {cliente.responsavel && <div className="text-xs text-muted-foreground">{cliente.responsavel}</div>}
      </div>

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

        <footer className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground pt-6 pb-4">
          <span className="font-semibold" style={{ color: "#1F4E79" }}>DSH</span>
          <span style={{ color: "#50B9EC" }} className="font-semibold">Hub</span>
          <span className="opacity-60">·</span>
          <span>Atualizado em tempo real • Acesso somente leitura</span>
        </footer>
      </main>
    </div>
  );
}