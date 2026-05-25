import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import {
  ClipboardList, Search, X, Activity, AlertTriangle, CheckCircle2, Inbox, Repeat, Zap, Plus,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from "recharts";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface OS {
  id: string;
  cliente_id: string | null;
  mes: string | null;
  ano: number | null;
  numero: string | null;
  tipo_servico: string | null;
  estado: string | null;
  solicitante: string | null;
  localizacao: string | null;
  tipo_equipamento: string | null;
  numero_serie: string | null;
  tag: string | null;
  modelo: string | null;
  fabricante: string | null;
  responsavel: string | null;
  data_criacao: string | null;
  data_conclusao: string | null;
  prioridade: string | null;
  problema_relatado: string | null;
  plano: string | null;
  quadro_trabalho: string | null;
  atendimento: string | null;
  estado_tempo_atendimento: string | null;
  estado_tempo_fechamento: string | null;
}

interface Cliente { id: string; nome: string }

const FECHADAS = new Set(["Fechada", "Serviço finalizado"]);
function normalizeEstado(e: string | null): "Fechada" | "Aberta" | "Cancelada" | "Outro" {
  if (!e) return "Outro";
  const v = e.trim();
  if (v === "Cancelada") return "Cancelada";
  if (FECHADAS.has(v)) return "Fechada";
  return "Aberta";
}

function fmtDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const PAGE_SIZE = 25;

export default function ManutencaoOS() {
  const { hasCargo } = useAuth();
  const isAdmin = hasCargo("admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<OS[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // filtros
  const [fCliente, setFCliente] = useState<string>("all");
  const [fMes, setFMes] = useState<string>("all");
  const [fBusca, setFBusca] = useState<string>("");
  const [fEstado, setFEstado] = useState<string>("all");
  const [fTipo, setFTipo] = useState<string>("all");
  const [fSetor, setFSetor] = useState<string>("all");
  const [fPrioridade, setFPrioridade] = useState<string>("all");
  const [onlyReincidentes, setOnlyReincidentes] = useState(false);

  const [page, setPage] = useState(1);

  const [detailOS, setDetailOS] = useState<OS | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: cls } = await supabase
        .from("clientes").select("id, nome").eq("ativo", true).order("nome");

      // Paginação manual: PostgREST limita a 1000 linhas por request
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error: osErr } = await supabase
          .from("ordens_servico")
          .select("*")
          .order("data_criacao", { ascending: false })
          .range(from, from + pageSize - 1);
        if (osErr) throw osErr;
        const chunk = data || [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
        if (from > 200000) break; // safety
      }
      setClientes((cls || []) as Cliente[]);
      setRows(all as OS[]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Erro ao carregar OS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = fBusca.trim().toLowerCase();
    return rows.filter((r) => {
      if (fCliente !== "all" && r.cliente_id !== fCliente) return false;
      if (fMes !== "all" && r.mes !== fMes) return false;
      if (fEstado !== "all" && normalizeEstado(r.estado) !== fEstado) return false;
      if (fTipo !== "all" && (r.tipo_servico || "") !== fTipo) return false;
      if (fSetor !== "all" && (r.quadro_trabalho || "") !== fSetor) return false;
      if (fPrioridade !== "all" && (r.prioridade || "") !== fPrioridade) return false;
      if (q) {
        const hay = [r.numero, r.solicitante, r.tipo_equipamento, r.responsavel, r.tag, r.numero_serie]
          .map((v) => (v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, fCliente, fMes, fBusca, fEstado, fTipo, fSetor, fPrioridade]);

  // Reincidência: equipamentos (tag||numero_serie) com 3+ OS corretivas no período filtrado
  const reincidentes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      if (r.tipo_servico !== "Manutenção Corretiva") continue;
      const key = (r.tag || r.numero_serie || "").trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const set = new Set<string>();
    counts.forEach((v, k) => { if (v >= 3) set.add(k); });
    return set;
  }, [filtered]);

  const equipamentosComCorretivas = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      if (r.tipo_servico !== "Manutenção Corretiva") continue;
      const key = (r.tag || r.numero_serie || "").trim();
      if (key) set.add(key);
    }
    return set.size;
  }, [filtered]);

  const displayed = useMemo(() => {
    if (!onlyReincidentes) return filtered;
    return filtered.filter((r) => {
      const key = (r.tag || r.numero_serie || "").trim();
      return key && reincidentes.has(key);
    });
  }, [filtered, onlyReincidentes, reincidentes]);

  // KPIs (sobre filtered, não sobre displayed)
  const kpis = useMemo(() => {
    const total = filtered.length;
    let abertas = 0, fechadas = 0, buscaAtiva = 0;
    for (const r of filtered) {
      const est = normalizeEstado(r.estado);
      if (est === "Aberta") abertas++;
      if (est === "Fechada") fechadas++;
      if (r.tipo_servico === "Busca Ativa") buscaAtiva++;
    }

    // Disponibilidade por equipamento:
    // Para cada equipamento (tag||numero_serie), considera o período desde a
    // primeira OS registrada até hoje. Dias indisponíveis = soma dos
    // intervalos das OS corretivas (data_criacao → data_conclusao, ou hoje
    // se ainda aberta). Disponibilidade = (dias_totais - indisponiveis) / totais.
    // A métrica exibida é a média das disponibilidades por equipamento.
    const parseDate = (s?: string | null) => {
      if (!s) return null;
      const [y, m, d] = s.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d).getTime();
    };
    const today = new Date();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const DAY = 86400000;

    const porEquip = new Map<string, { first: number; indisp: number }>();
    for (const r of filtered) {
      const key = (r.tag || r.numero_serie || "").trim();
      if (!key) continue;
      const criacao = parseDate(r.data_criacao);
      if (criacao == null) continue;
      const entry = porEquip.get(key) || { first: criacao, indisp: 0 };
      if (criacao < entry.first) entry.first = criacao;
      if (r.tipo_servico === "Manutenção Corretiva") {
        const fim = parseDate(r.data_conclusao) ?? todayMs;
        const dias = Math.max(0, Math.round((fim - criacao) / DAY));
        entry.indisp += dias;
      }
      porEquip.set(key, entry);
    }
    let somaPct = 0;
    let qtdEquip = 0;
    porEquip.forEach(({ first, indisp }) => {
      const totalDias = Math.max(1, Math.round((todayMs - first) / DAY) + 1);
      const indispLimit = Math.min(indisp, totalDias);
      const pct = ((totalDias - indispLimit) / totalDias) * 100;
      somaPct += pct;
      qtdEquip++;
    });
    const disponibilidade = qtdEquip > 0
      ? Math.round((somaPct / qtdEquip) * 10) / 10
      : 0;

    const reincPct = equipamentosComCorretivas > 0
      ? Math.round((reincidentes.size / equipamentosComCorretivas) * 1000) / 10
      : 0;
    return { total, abertas, fechadas, buscaAtiva, reincQtd: reincidentes.size, reincPct, disponibilidade };
  }, [filtered, reincidentes, equipamentosComCorretivas]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [fCliente, fMes, fBusca, fEstado, fTipo, fSetor, fPrioridade, onlyReincidentes]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const pageRows = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setFCliente("all"); setFMes("all"); setFBusca("");
    setFEstado("all"); setFTipo("all"); setFSetor("all"); setFPrioridade("all");
    setOnlyReincidentes(false);
  };

  const dispColor = kpis.disponibilidade >= 85 ? "text-emerald-500"
    : kpis.disponibilidade >= 70 ? "text-amber-500" : "text-red-500";

  // Gráfico de estado das OS (baseado nos filtros aplicados)
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
    "Serviço finalizado": "#22c55e",
  };
  const corPadrao = "#94a3b8";

  const dadosGraficoEstado = useMemo(() => {
    if (filtered.length === 0) return [];
    const contagem = new Map<string, number>();
    for (const os of filtered) {
      const estado = os.estado || "Sem estado";
      if (FECHADAS.has(estado)) continue; // ocultar fechadas do gráfico
      contagem.set(estado, (contagem.get(estado) || 0) + 1);
    }
    const totalVisivel = Array.from(contagem.values()).reduce((s, v) => s + v, 0);
    if (totalVisivel === 0) return [];
    const dados = Array.from(contagem.entries()).map(([estado, qtd]) => ({
      estado, qtd, pct: (qtd / totalVisivel) * 100,
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
      resultado.push({ name: "Outros", value: qtdOutros, fill: corPadrao, pct: pctOutros });
    }
    return resultado.sort((a, b) => b.value - a.value);
  }, [filtered]);

  const renderLabelEstado = (entry: any) => (entry.pct < 3 ? "" : `${entry.value}`);

  const TooltipEstado = ({ active, payload }: any) => {
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

  const LegendEstado = ({ payload }: any) => {
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Ordens de Serviço
            </h1>
            <p className="text-sm text-muted-foreground">Acompanhe e analise as OS de manutenção</p>
          </div>
          {isAdmin && <NovaOSDialog clientes={clientes} onCreated={fetchAll} />}
        </header>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs text-muted-foreground">Cliente</Label>
                <Select value={fCliente} onValueChange={setFCliente}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Mês</Label>
                <Select value={fMes} onValueChange={setFMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MESES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={fBusca}
                    onChange={(e) => setFBusca(e.target.value)}
                    placeholder="Número, solicitante, equipamento, responsável..."
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={fEstado} onValueChange={setFEstado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="Fechada">Fechada</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={fTipo} onValueChange={setFTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Manutenção Corretiva">Corretiva</SelectItem>
                    <SelectItem value="Manutenção Preventiva">Preventiva</SelectItem>
                    <SelectItem value="Busca Ativa">Busca Ativa</SelectItem>
                    <SelectItem value="Instalação">Instalação</SelectItem>
                    <SelectItem value="Vistoria Diária">Vistoria Diária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Setor</Label>
                <Select value={fSetor} onValueChange={setFSetor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Engenharia Clínica">Engenharia Clínica</SelectItem>
                    <SelectItem value="Predial">Predial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <Select value={fPrioridade} onValueChange={setFPrioridade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Emergente">Emergente</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                    <SelectItem value="Pouco urgente">Pouco Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              {onlyReincidentes && (
                <Badge variant="outline" className="gap-1">
                  <Repeat className="h-3 w-3" /> Mostrando apenas reincidentes
                  <button onClick={() => setOnlyReincidentes(false)} className="ml-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-1" /> Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={ClipboardList} label="Total de OS" value={kpis.total} />
          <KpiCard icon={Inbox} label="OS Abertas" value={kpis.abertas} accent="text-red-500" />
          <KpiCard icon={CheckCircle2} label="OS Fechadas" value={kpis.fechadas} accent="text-emerald-500" />
          <KpiCard
            icon={Activity} label="Busca Ativa" value={kpis.buscaAtiva}
            tooltip="OS geradas proativamente pela equipe"
          />
          <KpiCard
            icon={Repeat}
            label="Reincidência"
            value={kpis.reincQtd}
            suffix={equipamentosComCorretivas > 0 ? `${kpis.reincPct}%` : undefined}
            tooltip="Equipamentos com 3 ou mais OS corretivas no período"
            accent="text-amber-500"
            onClick={() => setOnlyReincidentes((v) => !v)}
            active={onlyReincidentes}
          />
          <KpiCard
            icon={Zap}
            label="Disponibilidade"
            value={`${kpis.disponibilidade}%`}
            tooltip="Percentual de OS corretivas resolvidas"
            accent={dispColor}
          />
        </div>

        {/* Gráfico de Pizza - Estado das Ordens de Serviço */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Estado das Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGraficoEstado.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma OS encontrada no período
              </div>
            ) : (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie
                      data={dadosGraficoEstado}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius="80%"
                      labelLine={false}
                      label={renderLabelEstado}
                    >
                      {dadosGraficoEstado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ReTooltip content={<TooltipEstado />} />
                    <Legend content={<LegendEstado />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OS encontradas ({displayed.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={8} />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchAll} />
            ) : displayed.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma OS encontrada"
                description="Nenhuma OS encontrada para os filtros selecionados"
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Criação</TableHead>
                        <TableHead>SLA Atendimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <button
                              onClick={() => setDetailOS(r)}
                              className="text-primary hover:underline font-medium"
                            >
                              {r.numero || "—"}
                            </button>
                          </TableCell>
                          <TableCell><EstadoBadge estado={r.estado} /></TableCell>
                          <TableCell className="text-sm">{r.tipo_servico || "—"}</TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{r.tipo_equipamento || "—"}</div>
                            {r.tag && <div className="text-xs text-muted-foreground">Tag: {r.tag}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{r.solicitante || "—"}</TableCell>
                          <TableCell className="text-sm">{r.responsavel || "—"}</TableCell>
                          <TableCell><PrioridadeBadge prioridade={r.prioridade} /></TableCell>
                          <TableCell className="text-sm">{fmtDateBR(r.data_criacao)}</TableCell>
                          <TableCell><SlaBadge value={r.estado_tempo_atendimento} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {displayed.length} registro(s) • Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Próximo
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <DetailDialog os={detailOS} onClose={() => setDetailOS(null)} />
      </div>
    </TooltipProvider>
  );
}

function KpiCard({
  icon: Icon, label, value, suffix, tooltip, accent, onClick, active,
}: {
  icon: any; label: string; value: number | string; suffix?: string;
  tooltip?: string; accent?: string; onClick?: () => void; active?: boolean;
}) {
  const body = (
    <Card
      className={`${onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""} ${active ? "border-primary" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
        </div>
        <div className={`mt-2 text-2xl font-semibold ${accent || ""}`}>{value}</div>
        {suffix && <div className="text-xs text-muted-foreground mt-0.5">{suffix} dos equipamentos</div>}
      </CardContent>
    </Card>
  );
  if (!tooltip) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild><div>{body}</div></TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function EstadoBadge({ estado }: { estado: string | null }) {
  const n = normalizeEstado(estado);
  if (n === "Fechada") return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20">Fechada</Badge>;
  if (n === "Cancelada") return <Badge variant="secondary">Cancelada</Badge>;
  if (n === "Aberta") return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15 border-red-500/20">Aberta</Badge>;
  return <Badge variant="outline">{estado || "—"}</Badge>;
}

function PrioridadeBadge({ prioridade }: { prioridade: string | null }) {
  if (!prioridade) return <span className="text-muted-foreground">—</span>;
  const p = prioridade.trim();
  if (p === "Emergente") return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15 border-red-500/20">Emergente</Badge>;
  if (p === "Urgente") return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 border-amber-500/20">Urgente</Badge>;
  if (p === "Pouco urgente") return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/15 border-blue-500/20">Pouco Urgente</Badge>;
  return <Badge variant="outline">{p}</Badge>;
}

function SlaBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const n = value.trim().toLowerCase();
  const ok = n === "regular" || n === "no prazo" || n === "dentro do prazo" || n.startsWith("regular");
  return ok
    ? <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20">Regular</Badge>
    : <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Atrasado</Badge>;
}

function DetailDialog({ os, onClose }: { os: OS | null; onClose: () => void }) {
  return (
    <Dialog open={!!os} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            OS {os?.numero || "—"}
          </DialogTitle>
        </DialogHeader>
        {os && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <EstadoBadge estado={os.estado} />
              {os.tipo_servico && <Badge variant="outline">{os.tipo_servico}</Badge>}
              <PrioridadeBadge prioridade={os.prioridade} />
              {os.quadro_trabalho && <Badge variant="secondary">{os.quadro_trabalho}</Badge>}
            </div>

            <Section title="Equipamento">
              <Field label="Tipo" value={os.tipo_equipamento} />
              <Field label="Tag" value={os.tag} />
              <Field label="Nº de Série" value={os.numero_serie} />
              <Field label="Modelo" value={os.modelo} />
              <Field label="Fabricante" value={os.fabricante} />
              <Field label="Localização" value={os.localizacao} />
            </Section>

            <Section title="Atendimento">
              <Field label="Solicitante" value={os.solicitante} />
              <Field label="Responsável" value={os.responsavel} />
              <Field label="Criação" value={fmtDateBR(os.data_criacao)} />
              <Field label="Conclusão" value={fmtDateBR(os.data_conclusao)} />
              <Field label="SLA Atendimento" value={os.estado_tempo_atendimento} />
              <Field label="SLA Fechamento" value={os.estado_tempo_fechamento} />
            </Section>

            {os.problema_relatado && (
              <Section title="Problema relatado">
                <p className="col-span-2 whitespace-pre-wrap text-muted-foreground">{os.problema_relatado}</p>
              </Section>
            )}

            {os.plano && (
              <Section title="Plano">
                <p className="col-span-2 whitespace-pre-wrap text-muted-foreground">{os.plano}</p>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function NovaOSDialog({ clientes, onCreated }: { clientes: Cliente[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cliente_id: "",
    tipo_servico: "",
    estado: "Aberta",
    prioridade: "",
    tipo_equipamento: "",
    tag: "",
    solicitante: "",
    responsavel: "",
    problema_relatado: "",
    quadro_trabalho: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.cliente_id) { toast.error("Selecione o cliente"); return; }
    if (!form.tipo_servico) { toast.error("Informe o tipo de serviço"); return; }
    setSaving(true);
    try {
      const hoje = new Date();
      const iso = hoje.toISOString().slice(0, 10);
      const mes = MESES[hoje.getMonth()];
      const ano = hoje.getFullYear();
      const numero = `M-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("ordens_servico").insert({
        cliente_id: form.cliente_id,
        mes, ano,
        numero,
        tipo_servico: form.tipo_servico,
        estado: form.estado,
        prioridade: form.prioridade || null,
        tipo_equipamento: form.tipo_equipamento || null,
        tag: form.tag || null,
        solicitante: form.solicitante || null,
        responsavel: form.responsavel || null,
        problema_relatado: form.problema_relatado || null,
        quadro_trabalho: form.quadro_trabalho || null,
        data_criacao: iso,
      });
      if (error) throw error;
      toast.success(`OS ${numero} criada`);
      setOpen(false);
      setForm({
        cliente_id: "", tipo_servico: "", estado: "Aberta", prioridade: "",
        tipo_equipamento: "", tag: "", solicitante: "", responsavel: "",
        problema_relatado: "", quadro_trabalho: "",
      });
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar OS");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Nova OS</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastrar nova OS</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Cliente *</Label>
            <Select value={form.cliente_id} onValueChange={set("cliente_id")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de Serviço *</Label>
            <Select value={form.tipo_servico} onValueChange={set("tipo_servico")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manutenção Corretiva">Corretiva</SelectItem>
                <SelectItem value="Manutenção Preventiva">Preventiva</SelectItem>
                <SelectItem value="Busca Ativa">Busca Ativa</SelectItem>
                <SelectItem value="Instalação">Instalação</SelectItem>
                <SelectItem value="Vistoria Diária">Vistoria Diária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={set("estado")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Aberta">Aberta</SelectItem>
                <SelectItem value="Fechada">Fechada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.prioridade} onValueChange={set("prioridade")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Emergente">Emergente</SelectItem>
                <SelectItem value="Urgente">Urgente</SelectItem>
                <SelectItem value="Pouco urgente">Pouco Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Setor</Label>
            <Select value={form.quadro_trabalho} onValueChange={set("quadro_trabalho")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Engenharia Clínica">Engenharia Clínica</SelectItem>
                <SelectItem value="Predial">Predial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de Equipamento</Label>
            <Input value={form.tipo_equipamento} onChange={(e) => set("tipo_equipamento")(e.target.value)} />
          </div>
          <div>
            <Label>Tag</Label>
            <Input value={form.tag} onChange={(e) => set("tag")(e.target.value)} />
          </div>
          <div>
            <Label>Solicitante</Label>
            <Input value={form.solicitante} onChange={(e) => set("solicitante")(e.target.value)} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set("responsavel")(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Problema Relatado</Label>
            <Textarea
              value={form.problema_relatado}
              onChange={(e) => set("problema_relatado")(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar OS"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}