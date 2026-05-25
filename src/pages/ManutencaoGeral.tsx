import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const mesIdx = (m: string) => MES_ORDEM[(m || "").trim().toLowerCase()] ?? 0;
const num = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

interface Cliente { id: string; nome: string; responsavel: string | null; ativo: boolean; }
interface Indicador { cliente_id: string; mes: string; ano: number; [k: string]: any; }

function statusColor(sla: number) {
  if (sla >= 80) return "hsl(142 71% 45%)";
  if (sla >= 60) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
}
function statusBadgeCls(sla: number) {
  if (sla >= 80) return "bg-green-500/15 text-green-500 border-green-500/30";
  if (sla >= 60) return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
  return "bg-red-500/15 text-red-500 border-red-500/30";
}

export default function ManutencaoGeral() {
  const navigate = useNavigate();
  const { hasCargo } = useAuth();
  const isAdmin = hasCargo("admin");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cRes, iRes, osRes] = await Promise.all([
          supabase.from("clientes").select("id, nome, responsavel, ativo").eq("ativo", true).order("nome"),
          supabase.from("indicadores_manutencao").select("*"),
          supabase.from("ordens_servico").select("estado, mes, ano"),
        ]);
        if (cRes.error) throw cRes.error;
        if (iRes.error) throw iRes.error;
        if (osRes.error) throw osRes.error;
        if (!cancelled) {
          setClientes((cRes.data || []) as Cliente[]);
          setIndicadores((iRes.data || []) as Indicador[]);
          setOrdensServico(osRes.data || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const [anoSel, mesSel] = useMemo(() => {
    if (!periodo) return [undefined, undefined] as const;
    const [a, ...r] = periodo.split("-");
    return [Number(a), r.join("-")] as const;
  }, [periodo]);

  const indicadoresMes = useMemo(
    () => indicadores.filter(i => i.ano === anoSel && i.mes === mesSel),
    [indicadores, anoSel, mesSel],
  );

  const porCliente = useMemo(() => {
    return clientes.map(c => {
      const ind = indicadoresMes.find(i => i.cliente_id === c.id);
      const slaEng = num(ind?.eng_pct_sla_triagem_urgente);
      const slaPred = num(ind?.pred_pct_sla_triagem_urgente);
      const slaMedio = ind ? (slaEng + slaPred) / 2 : 0;
      const totalOs = num(ind?.total_corretivas_abertas) + num(ind?.total_preventivas_abertas);
      return {
        cliente: c,
        ind,
        slaEng,
        slaPred,
        slaMedio,
        totalOs,
        corretivasAbertas: num(ind?.total_corretivas_abertas),
        corretivasFechadas: num(ind?.total_corretivas_fechadas),
        preventivasAbertas: num(ind?.total_preventivas_abertas),
        preventivasFechadas: num(ind?.total_preventivas_fechadas),
      };
    });
  }, [clientes, indicadoresMes]);

  const estadoCores: Record<string, string> = {
    "Fechada": "#22c55e",
    "Aberta": "#ef4444",
    "Cancelada": "#6b7280",
    "Aguardando peças": "#f97316",
    "Aguardando Análise Crítica": "#eab308",
    "Em Espera": "#a855f7",
    "em manutenção": "#3b82f6",
    "Em execução": "#06b6d4",
    "Aguardando analise": "#ec4899",
  };
  const corPadrao = "#94a3b8";

  const dadosGrafico = useMemo(() => {
    const osMes = ordensServico.filter(os => os.ano === anoSel && os.mes === mesSel);
    if (osMes.length === 0) return [];

    const contagem = new Map<string, number>();
    for (const os of osMes) {
      const estado = os.estado || "Sem estado";
      contagem.set(estado, (contagem.get(estado) || 0) + 1);
    }

    const total = osMes.length;
    const dados = Array.from(contagem.entries()).map(([estado, qtd]) => ({
      estado,
      qtd,
      pct: (qtd / total) * 100,
    }));

    const principais = dados.filter(d => d.pct >= 1);
    const outros = dados.filter(d => d.pct < 1);

    const resultado = principais.map(d => ({
      name: d.estado,
      value: d.qtd,
      fill: estadoCores[d.estado] || corPadrao,
      pct: d.pct,
    }));

    if (outros.length > 0) {
      const qtdOutros = outros.reduce((s, d) => s + d.qtd, 0);
      const pctOutros = outros.reduce((s, d) => s + d.pct, 0);
      resultado.push({
        name: "Outros",
        value: qtdOutros,
        fill: corPadrao,
        pct: pctOutros,
      });
    }

    return resultado.sort((a, b) => b.value - a.value);
  }, [ordensServico, anoSel, mesSel]);

  const renderLabel = (entry: any) => {
    const pct = entry.pct;
    if (pct < 3) return "";
    return `${entry.value}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const pct = p.payload.pct as number;
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="font-semibold text-foreground text-sm">{p.name}</p>
          <p className="text-muted-foreground text-xs">Quantidade: {p.value}</p>
          <p className="text-muted-foreground text-xs">Percentual: {pct.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {payload.map((entry: any) => (
          <div key={entry.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.value} ({entry.payload.value})</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral — Manutenção</h1>
          <p className="text-sm text-muted-foreground mt-1">Indicadores consolidados de todos os clientes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map(p => (
                <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
                  {cap(p.mes)} / {p.ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => navigate("/manutencao/clientes")} variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" /> Gerenciar Clientes
            </Button>
          )}
        </div>
      </div>

      {periodos.length === 0 && clientes.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda. Acesse <strong>Gerenciar Clientes</strong> para começar.
          </CardContent>
        </Card>
      )}

      {(periodos.length > 0 || clientes.length > 0) && (
        <>
          {periodos.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Nenhum dado de manutenção importado ainda. Os clientes ativos aparecem abaixo — abra um deles e use <strong>Importar Excel</strong> para carregar o primeiro mês.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {porCliente.map(p => {
              const semDados = !p.ind;
              return (
                <Card key={p.cliente.id}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{p.cliente.nome}</p>
                        {p.cliente.responsavel && (
                          <p className="text-xs text-muted-foreground truncate">{p.cliente.responsavel}</p>
                        )}
                      </div>
                      {semDados ? (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Sem dados</Badge>
                      ) : (
                        <Badge variant="outline" className={statusBadgeCls(p.slaMedio)}>
                          {p.slaMedio >= 80 ? "Bom" : p.slaMedio >= 60 ? "Atenção" : "Crítico"}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.corretivasAbertas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Corr. Abertas</div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.corretivasFechadas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Corr. Fechadas</div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.preventivasAbertas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Prev. Abertas</div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.preventivasFechadas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Prev. Fechadas</div>
                      </div>
                    </div>


                    <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => navigate(`/manutencao/cliente/${p.cliente.id}`)}>
                      Ver dashboard completo <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Gráfico de Pizza - Estado das Ordens de Serviço */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Estado das Ordens de Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              {dadosGrafico.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma OS encontrada no período
                </div>
              ) : (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius="80%"
                        labelLine={false}
                        label={renderLabel}
                      >
                        {dadosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}