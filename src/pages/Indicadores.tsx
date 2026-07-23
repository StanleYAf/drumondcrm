import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "@/lib/dataContext";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/integrations/supabase/client";
import { MESES, indicadorSchema, formatCurrency, calcularComissao, type IndicadorSemanal, type Categoria, type Lancamento } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Plus, Target, FileText, MapPin, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Pencil, BarChart3, Trash2, Receipt, Banknote, Trophy, Users, Hash, TrendingUp, CheckCircle2, Phone, Briefcase, ListChecks } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

function pctColor(val: number, meta: number) {
  const pct = meta > 0 ? (val / meta) * 100 : 0;
  if (pct >= 100) return "#30D158";
  if (pct >= 60) return "#FFD60A";
  return "#FF453A";
}

function pctValue(val: number, meta: number) {
  return meta > 0 ? ((val / meta) * 100).toFixed(0) : "0";
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { month: m - 1, year: y };
}

function filterByVendedor(items: Lancamento[], vendedor: string | null) {
  if (!vendedor) return items;
  return items.filter(i => i.vendedor === vendedor);
}

function itemsByMonth(items: Lancamento[], month: number, year: number, vendedor: string | null = null) {
  return filterByVendedor(items, vendedor)
    .filter((i) => { const d = parseLocalDate(i.data); return d.month === month && d.year === year; });
}

type SortKey = "semana" | "vendedor" | "captacoes" | "orcamentos" | "visitas";
type RankSort = "valor" | "count";
const ITEMS_PER_PAGE = 10;

export default function Indicadores() {
  const { data, setData, loading, error, undoDelete } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();

  const vendedorParam = searchParams.get("vendedor") || "Todos";
  const mesParam = searchParams.get("mes") || MESES[new Date().getMonth()];
  const anoParam = parseInt(searchParams.get("ano") || "") || new Date().getFullYear();

  function setFilterVendedor(v: string) {
    setSearchParams(prev => { prev.set("vendedor", v); return prev; }, { replace: true });
  }

  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("semana");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const [semana, setSemana] = useState("");
  const [mes, setMes] = useState(mesParam);
  const [vendedor, setVendedor] = useState(data.vendedores[0] || "");
  const [captacoes, setCaptacoes] = useState("");
  const [orcamentos, setOrcamentos] = useState("");
  const [visitas, setVisitas] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [editItem, setEditItem] = useState<IndicadorSemanal | null>(null);
  const [editSemana, setEditSemana] = useState("");
  const [editMes, setEditMes] = useState("");
  const [editVendedor, setEditVendedor] = useState("");
  const [editCaptacoes, setEditCaptacoes] = useState("");
  const [editOrcamentos, setEditOrcamentos] = useState("");
  const [editVisitas, setEditVisitas] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [rankSort, setRankSort] = useState<RankSort>("valor");

  const currentMonthIdx = MESES.indexOf(mesParam);
  const vendedorFilter = vendedorParam === "Todos" ? null : vendedorParam;

  // ===== Indicadores Comerciais (mesmo cálculo do Dashboard) =====
  const allItemsMonth = useMemo(() => [
    ...itemsByMonth(data.lancamentos.produtos, currentMonthIdx, anoParam, vendedorFilter),
    ...itemsByMonth(data.lancamentos.servicos, currentMonthIdx, anoParam, vendedorFilter),
    ...itemsByMonth(data.lancamentos.contratos, currentMonthIdx, anoParam, vendedorFilter),
    ...itemsByMonth(data.lancamentos.acessorios, currentMonthIdx, anoParam, vendedorFilter),
  ], [data.lancamentos, currentMonthIdx, anoParam, vendedorFilter]);
  const qtdLancamentos = allItemsMonth.length;
  const totalGeralMes = allItemsMonth.reduce((s, i) => s + i.valor, 0);
  const ticketMedio = qtdLancamentos > 0 ? totalGeralMes / qtdLancamentos : 0;

  const CAT_KEYS: { cat: Categoria; arr: keyof typeof data.lancamentos }[] = [
    { cat: "produto", arr: "produtos" },
    { cat: "servico", arr: "servicos" },
    { cat: "contrato", arr: "contratos" },
    { cat: "acessorio", arr: "acessorios" },
  ];
  const comissoesChartData = useMemo(() => MESES.map((mesNome, i) => {
    let recebidas = 0;
    let previstas = 0;
    CAT_KEYS.forEach(({ cat, arr }) => {
      const items = itemsByMonth(data.lancamentos[arr] as Lancamento[], i, anoParam, vendedorFilter);
      items.forEach((l) => {
        const c = calcularComissao(cat, l.valor, l.custos ?? 0);
        previstas += c;
        if (l.paid) recebidas += c;
      });
    });
    return { mes: mesNome.substring(0, 3), Recebidas: recebidas, Previstas: previstas };
  }), [data.lancamentos, anoParam, vendedorFilter]);
  const comissoesRecebidasMes = comissoesChartData[currentMonthIdx]?.Recebidas ?? 0;
  const comissoesRecebidasAno = comissoesChartData.reduce((s, r) => s + r.Recebidas, 0);

  // Evolução Mensal do Ticket Médio
  const ticketMedioChartData = useMemo(() => MESES.map((mesNome, i) => {
    const items = [
      ...itemsByMonth(data.lancamentos.produtos, i, anoParam, vendedorFilter),
      ...itemsByMonth(data.lancamentos.servicos, i, anoParam, vendedorFilter),
      ...itemsByMonth(data.lancamentos.contratos, i, anoParam, vendedorFilter),
      ...itemsByMonth(data.lancamentos.acessorios, i, anoParam, vendedorFilter),
    ];
    const total = items.reduce((s, l) => s + l.valor, 0);
    return { mes: mesNome.substring(0, 3), "Ticket Médio": items.length > 0 ? total / items.length : 0 };
  }), [data.lancamentos, anoParam, vendedorFilter]);

  // Ranking de Clientes
  const clientRanking = useMemo(() => {
    const map = new Map<string, { cliente: string; valor: number; count: number }>();
    allItemsMonth.forEach(l => {
      const existing = map.get(l.cliente);
      if (existing) { existing.valor += l.valor; existing.count += 1; }
      else { map.set(l.cliente, { cliente: l.cliente, valor: l.valor, count: 1 }); }
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => rankSort === "valor" ? b.valor - a.valor : b.count - a.count);
    return arr;
  }, [allItemsMonth, rankSort]);

  function validate(s: string, m: string, v: string, c: string, o: string, vi: string) {
    const result = indicadorSchema.safeParse({
      semana: parseInt(s) || 0, mes: m, vendedor: v,
      captacoes: parseInt(c) || 0, orcamentos: parseInt(o) || 0, visitas: parseInt(vi) || 0,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      return errs;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(semana, mes, vendedor, captacoes, orcamentos, visitas);
    if (errs) { setFormErrors(errs); toast.error("Corrija os campos inválidos"); return; }
    setFormErrors({});
    const item: IndicadorSemanal = {
      id: crypto.randomUUID(), data: new Date().toISOString().slice(0, 10),
      semana: parseInt(semana), mes, vendedor,
      captacoes: parseInt(captacoes) || 0, orcamentos: parseInt(orcamentos) || 0,
      visitas: parseInt(visitas) || 0, ano: anoParam,
    };
    const saved = await setData((prev) => ({ ...prev, indicadores_semanais: [...prev.indicadores_semanais, item] }));
    if (!saved) return;
    setSemana(""); setCaptacoes(""); setOrcamentos(""); setVisitas(""); setShowForm(false);
    toast.success("Indicador registrado com sucesso");
  }

  function openEdit(item: IndicadorSemanal) {
    setEditItem(item);
    setEditSemana(String(item.semana));
    setEditMes(item.mes);
    setEditVendedor(item.vendedor);
    setEditCaptacoes(String(item.captacoes));
    setEditOrcamentos(String(item.orcamentos));
    setEditVisitas(String(item.visitas));
    setEditErrors({});
  }

  async function handleEditSave() {
    if (!editItem) return;
    const errs = validate(editSemana, editMes, editVendedor, editCaptacoes, editOrcamentos, editVisitas);
    if (errs) { setEditErrors(errs); toast.error("Corrija os campos inválidos"); return; }
    setEditErrors({});
    const saved = await setData(prev => ({
      ...prev,
      indicadores_semanais: prev.indicadores_semanais.map(i =>
        i.id === editItem.id ? {
          ...i, semana: parseInt(editSemana), mes: editMes, vendedor: editVendedor,
          captacoes: parseInt(editCaptacoes), orcamentos: parseInt(editOrcamentos), visitas: parseInt(editVisitas),
        } : i
      ),
    }));
    if (!saved) return;
    setEditItem(null);
    toast.success("Indicador atualizado");
  }

  async function handleDelete(id: string) {
    const deletedItem = data.indicadores_semanais.find(i => i.id === id);
    if (!deletedItem) return;
    const saved = await setData(prev => ({ ...prev, indicadores_semanais: prev.indicadores_semanais.filter(i => i.id !== id) }));
    if (!saved) return;
    undoDelete(id, "Indicador excluído.", (prev) => ({
      ...prev, indicadores_semanais: [...prev.indicadores_semanais, deletedItem],
    }));
  }

  const filtered = useMemo(() => {
    let items = data.indicadores_semanais.filter(i =>
      (vendedorParam === "Todos" || i.vendedor === vendedorParam)
    );
    const q = searchQuery.toLowerCase().trim();
    if (q) items = items.filter(i => i.vendedor.toLowerCase().includes(q) || i.mes.toLowerCase().includes(q) || String(i.semana).includes(q));
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "semana") cmp = a.semana - b.semana;
      else if (sortKey === "vendedor") cmp = a.vendedor.localeCompare(b.vendedor);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [data.indicadores_semanais, vendedorParam, searchQuery, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const totalCap = filtered.reduce((s, i) => s + i.captacoes, 0);
  const totalOrc = filtered.reduce((s, i) => s + i.orcamentos, 0);
  const totalVis = filtered.reduce((s, i) => s + i.visitas, 0);

  const chartData = data.indicadores_semanais
    .filter((i) => i.mes === mesParam && i.ano === anoParam && (vendedorParam === "Todos" || i.vendedor === vendedorParam))
    .map((i) => ({ name: `S${i.semana}`, Captações: i.captacoes, Orçamentos: i.orcamentos, Visitas: i.visitas }));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  }

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  function ErrorMsg({ msg }: { msg?: string }) {
    if (!msg) return null;
    return <p className="text-[11px] mt-1 font-medium" style={{ color: '#FF453A' }}>{msg}</p>;
  }

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5 pb-24">
      <h1 className="text-2xl font-bold text-foreground">Indicadores</h1>

      <Tabs defaultValue="semanais" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="semanais">Indicadores Semanais</TabsTrigger>
          <TabsTrigger value="rotina">Rotina</TabsTrigger>
        </TabsList>

        <TabsContent value="semanais" className="space-y-5 mt-5">
      <div className="flex items-center justify-end">
        <button onClick={() => { setShowForm(!showForm); setFormErrors({}); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-foreground bg-primary">
          <Plus className="h-4 w-4" />Registrar semana
        </button>
      </div>

      {/* Segmented Control */}
      <div className="segmented-control w-full overflow-x-auto no-scrollbar">
        {["Todos", ...data.vendedores].map(v => (
          <button key={v} onClick={() => { setFilterVendedor(v); setPage(0); }}
            className={`segmented-btn flex-1 ${vendedorParam === v ? 'active' : ''}`}>{v}</button>
        ))}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Captações", value: totalCap, icon: Target, color: "#0A84FF" },
          { label: "Orçamentos", value: totalOrc, icon: FileText, color: "#30D158" },
          { label: "Visitas", value: totalVis, icon: MapPin, color: "#FFD60A" },
        ].map(m => (
          <div key={m.label} className="glass-card p-3 text-center">
            <m.icon className="h-4 w-4 mx-auto mb-1" style={{ color: m.color }} />
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-[10px] mt-0.5 text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Nova Semana</h3>
            <button onClick={() => setShowForm(false)} className="text-sm text-primary">Cancelar</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Semana</label>
                <input type="number" value={semana} onChange={e => setSemana(e.target.value)} className="ios-input w-full" placeholder="Nº" />
                <ErrorMsg msg={formErrors.semana} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)} className="ios-input w-full">
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Vendedor</label>
              <select value={vendedor} onChange={e => setVendedor(e.target.value)} className="ios-input w-full">
                {data.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <ErrorMsg msg={formErrors.vendedor} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Captações</label>
                <input type="number" value={captacoes} onChange={e => setCaptacoes(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={formErrors.captacoes} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Orçamentos</label>
                <input type="number" value={orcamentos} onChange={e => setOrcamentos(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={formErrors.orcamentos} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Visitas</label>
                <input type="number" value={visitas} onChange={e => setVisitas(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={formErrors.visitas} />
              </div>
            </div>
            <button type="submit" className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary">
              Registrar
            </button>
          </form>
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            className="ios-input w-full pl-10" placeholder="Buscar vendedor, mês ou semana..." />
        </div>
        <select value={sortKey} onChange={e => { setSortKey(e.target.value as SortKey); setPage(0); }}
          className="ios-input text-xs w-auto min-w-[110px]">
          <option value="semana">Semana</option>
          <option value="vendedor">Vendedor</option>
          <option value="captacoes">Captações</option>
          <option value="orcamentos">Orçamentos</option>
          <option value="visitas">Visitas</option>
        </select>
        <button onClick={() => setSortAsc(!sortAsc)} className="p-2.5 rounded-xl bg-secondary flex-shrink-0">
          {sortAsc ? <ChevronUp className="h-4 w-4 text-foreground" /> : <ChevronDown className="h-4 w-4 text-foreground" />}
        </button>
      </div>

      {/* Records List */}
      <div>
        <p className="ios-section-title">REGISTROS ({filtered.length})</p>
        {filtered.length === 0 ? (
          <EmptyState icon={BarChart3} title="Nenhum registro" description="Registre indicadores semanais para acompanhar o desempenho." />
        ) : (
          <div className="ios-list-group">
            {paginated.map(i => (
              <div key={i.id} className="ios-list-item">
                <button className="flex-1 text-left" onClick={() => openEdit(i)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">S{i.semana} — {i.vendedor}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{i.mes}</span>
                  </div>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {[
                      { label: "Cap", val: i.captacoes, meta: data.meta_semanal.captacoes },
                      { label: "Orç", val: i.orcamentos, meta: data.meta_semanal.orcamentos },
                      { label: "Vis", val: i.visitas, meta: data.meta_semanal.visitas },
                    ].map(m => (
                      <span key={m.label} className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: pctColor(m.val, m.meta) + '20', color: pctColor(m.val, m.meta) }}>
                        {m.label}: {m.val} ({pctValue(m.val, m.meta)}%)
                      </span>
                    ))}
                  </div>
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(i)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </button>
                  <button onClick={() => handleDelete(i.id)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF453A' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
              className="p-2 rounded-lg disabled:opacity-30 bg-muted">
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <span className="text-xs font-medium text-muted-foreground">{currentPage + 1} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1}
              className="p-2 rounded-lg disabled:opacity-30 bg-muted">
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Gráfico — {mesParam}</h3>
        {chartData.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sem dados para exibir</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="25%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }} width={35} />
              <Tooltip contentStyle={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 12 }} />
              <Bar dataKey="Captações" fill="#0A84FF" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Orçamentos" fill="#30D158" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Visitas" fill="#FFD60A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ===== Indicadores Comerciais ===== */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Indicadores Comerciais</h2>
        </div>

        {/* Ticket Médio + Comissões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card p-6" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" style={{ color: '#0A84FF' }} />
                <span className="text-base font-semibold text-foreground/70">Ticket Médio — {mesParam}</span>
              </div>
            </div>
            <p className="text-[2rem] font-extrabold text-foreground mb-1 leading-tight">{formatCurrency(ticketMedio)}</p>
            <span className="text-[0.85rem] text-foreground/70">
              <Hash className="h-3.5 w-3.5 inline mr-0.5" />
              {qtdLancamentos} lançamento{qtdLancamentos !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="glass-card p-6" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5" style={{ color: '#30D158' }} />
                <span className="text-base font-semibold text-foreground/70">Comissões Recebidas — {mesParam}</span>
              </div>
            </div>
            <p className="text-[2rem] font-extrabold text-foreground mb-1 leading-tight">{formatCurrency(comissoesRecebidasMes)}</p>
            <span className="text-[0.85rem] text-foreground/70">
              Acumulado em {anoParam}: <span className="font-semibold text-foreground">{formatCurrency(comissoesRecebidasAno)}</span>
            </span>
          </div>
        </div>

        {/* Evolução das Comissões */}
        <div className="glass-card p-6 mt-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Banknote className="h-5 w-5" style={{ color: '#30D158' }} />
            <h3 className="text-base font-semibold text-foreground">Evolução das Comissões — {anoParam}</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={comissoesChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#AEAEB2', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#AEAEB2', fontSize: 12 }} width={70} />
              <Tooltip
                contentStyle={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: 13 }}
                formatter={(value: number) => formatCurrency(value)}
                cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#AEAEB2' }} />
              <Line type="monotone" dataKey="Recebidas" stroke="#30D158" strokeWidth={3} dot={{ r: 4, fill: '#30D158' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Previstas" stroke="#0A84FF" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#0A84FF' }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[0.8rem] text-foreground/60 mt-3">
            "Recebidas" considera lançamentos marcados como pagos. "Previstas" inclui todas as comissões geradas no período.
          </p>
        </div>

        {/* Evolução Mensal do Ticket Médio */}
        <div className="glass-card p-6 mt-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Receipt className="h-5 w-5" style={{ color: '#0A84FF' }} />
            <h3 className="text-base font-semibold text-foreground">Evolução Mensal do Ticket Médio — {anoParam}</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={ticketMedioChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#AEAEB2', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#AEAEB2', fontSize: 12 }} width={70} />
              <Tooltip
                contentStyle={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: 13 }}
                formatter={(value: number) => formatCurrency(value)}
                cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#AEAEB2' }} />
              <Line type="monotone" dataKey="Ticket Médio" stroke="#0A84FF" strokeWidth={3} dot={{ r: 4, fill: '#0A84FF' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking de Clientes */}
        <div className="glass-card p-6 mt-5 space-y-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: '#FFD60A' }} />
              <h3 className="text-base font-semibold text-foreground">Ranking de Clientes — {mesParam}</h3>
            </div>
            <div className="segmented-control">
              <button onClick={() => setRankSort("valor")}
                className={`segmented-btn text-[0.85rem] ${rankSort === "valor" ? "active" : ""}`}>
                Valor
              </button>
              <button onClick={() => setRankSort("count")}
                className={`segmented-btn text-[0.85rem] ${rankSort === "count" ? "active" : ""}`}>
                Qtd
              </button>
            </div>
          </div>

          {clientRanking.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto mb-2 text-foreground/70" />
              <p className="text-[0.85rem] text-foreground/70">Nenhum lançamento neste período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientRanking.slice(0, 10).map((c, idx) => (
                <div key={c.cliente} className="flex items-center gap-3 p-4 rounded-xl transition hover:bg-muted bg-muted/50 border border-foreground/10">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-[0.85rem] font-bold flex-shrink-0"
                    style={{
                      background: idx === 0 ? '#FFD60A20' : idx === 1 ? 'rgba(255,255,255,0.08)' : idx === 2 ? '#BF5AF220' : 'rgba(255,255,255,0.04)',
                      color: idx === 0 ? '#FFD60A' : idx === 1 ? '#AEAEB2' : idx === 2 ? '#BF5AF2' : '#8E8E93',
                    }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{c.cliente}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.85rem] text-foreground/70">
                        <Hash className="h-3.5 w-3.5 inline mr-0.5" />{c.count} lançamento{c.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-bold text-foreground flex-shrink-0">{formatCurrency(c.valor)}</span>
                </div>
              ))}
              {clientRanking.length > 10 && (
                <p className="text-center text-[0.85rem] pt-1 text-foreground/70">
                  +{clientRanking.length - 10} clientes
                </p>
              )}
            </div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="rotina" className="mt-5">
          <RotinaTab />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 space-y-4 bg-popover border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Editar Indicador</h3>
              <button onClick={() => setEditItem(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Semana</label>
                <input type="number" value={editSemana} onChange={e => setEditSemana(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={editErrors.semana} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Mês</label>
                <select value={editMes} onChange={e => setEditMes(e.target.value)} className="ios-input w-full">
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Vendedor</label>
              <select value={editVendedor} onChange={e => setEditVendedor(e.target.value)} className="ios-input w-full">
                {data.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Captações</label>
                <input type="number" value={editCaptacoes} onChange={e => setEditCaptacoes(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={editErrors.captacoes} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Orçamentos</label>
                <input type="number" value={editOrcamentos} onChange={e => setEditOrcamentos(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={editErrors.orcamentos} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Visitas</label>
                <input type="number" value={editVisitas} onChange={e => setEditVisitas(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={editErrors.visitas} />
              </div>
            </div>
            <button onClick={handleEditSave} className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary">
              Salvar Alterações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
