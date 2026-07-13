import { useState, useMemo, useEffect } from "react";
import { useAppData } from "@/lib/dataContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useSearchParams } from "react-router-dom";
import { CATEGORIA_LABELS, MESES, formatCurrency, getMetasForMonth, calcularComissao, type Categoria, type Lancamento } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Package, Wrench, FileText, Puzzle, TrendingUp, ChevronDown, Bell, X, AlertTriangle, Clock, Target, GitCompare, Users, Trophy, Hash, ChevronUp, Receipt, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

const ICONS: Record<Categoria, React.ElementType> = {
  produto: Package, servico: Wrench, contrato: FileText, acessorio: Puzzle,
};

const CAT_COLORS: Record<Categoria, string> = {
  produto: "#0A84FF", servico: "#30D158", contrato: "#FFD60A", acessorio: "#BF5AF2",
};

function progressColor(pct: number) {
  if (pct >= 90) return "#30D158";
  if (pct >= 70) return "#FFD60A";
  return "#FF453A";
}

function filterByVendedor(items: Lancamento[], vendedor: string | null) {
  if (!vendedor) return items;
  return items.filter(i => i.vendedor === vendedor);
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { month: m - 1, year: y };
}

function sumByMonth(items: Lancamento[], month: number, year: number, vendedor: string | null = null) {
  return filterByVendedor(items, vendedor)
    .filter((i) => { const d = parseLocalDate(i.data); return d.month === month && d.year === year; })
    .reduce((s, i) => s + i.valor, 0);
}

function itemsByMonth(items: Lancamento[], month: number, year: number, vendedor: string | null = null) {
  return filterByVendedor(items, vendedor)
    .filter((i) => { const d = parseLocalDate(i.data); return d.month === month && d.year === year; });
}

interface Alert {
  id: string;
  icon: React.ElementType;
  message: string;
  color: string;
  route: string;
}

type CompareMode = "none" | "prev_month" | "prev_year";
type RankSort = "valor" | "count";

interface ClientRank {
  cliente: string;
  valor: number;
  count: number;
}

export default function Dashboard() {
  const { data, loading, error } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();

  const month = parseInt(searchParams.get("mes") || "") - 1;
  const year = parseInt(searchParams.get("ano") || "");
  const currentMonth = isNaN(month) || month < 0 || month > 11 ? now.getMonth() : month;
  const currentYear = isNaN(year) ? now.getFullYear() : year;

  const vendedorParam = searchParams.get("vendedor") || null;

  const [showPicker, setShowPicker] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareMode>("prev_month");
  const [rankSort, setRankSort] = useState<RankSort>("valor");
  const [stockAlerts, setStockAlerts] = useState<Alert[]>([]);

  // Fetch stock alerts from Supabase
  useEffect(() => {
    if (!user) return;
    supabase.from("produtos_estoque").select("nome, estoque_atual, estoque_minimo, ativo")
      .eq("ativo", true).then(({ data: prods }) => {
        if (!prods) return;
        const alerts: Alert[] = [];
        const zerado = prods.filter(p => Number(p.estoque_atual) === 0);
        if (zerado.length > 0) {
          alerts.push({
            id: "stock-zerado", icon: AlertTriangle,
            message: `${zerado.length} produto(s) com estoque zerado: ${zerado.slice(0, 3).map(p => p.nome).join(", ")}${zerado.length > 3 ? "..." : ""}`,
            color: "#FF453A", route: "/estoque",
          });
        }
        const baixo = prods.filter(p => Number(p.estoque_atual) > 0 && Number(p.estoque_atual) < Number(p.estoque_minimo));
        if (baixo.length > 0) {
          alerts.push({
            id: "stock-baixo", icon: AlertTriangle,
            message: `${baixo.length} produto(s) abaixo do estoque mínimo`,
            color: "#FFD60A", route: "/estoque",
          });
        }
        setStockAlerts(alerts);
      });
  }, [user]);

  function setMonth(m: number) {
    setSearchParams(prev => { prev.set("mes", String(m + 1)); return prev; }, { replace: true });
  }
  function setYear(y: number) {
    setSearchParams(prev => { prev.set("ano", String(y)); return prev; }, { replace: true });
  }
  function setVendedor(v: string | null) {
    setSearchParams(prev => {
      if (v) prev.set("vendedor", v);
      else prev.delete("vendedor");
      return prev;
    }, { replace: true });
  }

  const { metas: currentMetas } = getMetasForMonth(data.historico_metas, currentMonth, currentYear, data.metas, data.meta_semanal);

  const totals: Record<Categoria, number> = {
    produto: sumByMonth(data.lancamentos.produtos, currentMonth, currentYear, vendedorParam),
    servico: sumByMonth(data.lancamentos.servicos, currentMonth, currentYear, vendedorParam),
    contrato: sumByMonth(data.lancamentos.contratos, currentMonth, currentYear, vendedorParam),
    acessorio: sumByMonth(data.lancamentos.acessorios, currentMonth, currentYear, vendedorParam),
  };

  const totalGeral = Object.values(totals).reduce((a, b) => a + b, 0);
  const metaTotal = Object.values(currentMetas).reduce((a, b) => a + b, 0);
  const pctTotal = metaTotal > 0 ? (totalGeral / metaTotal) * 100 : 0;

  // Comparison
  let compMonth = currentMonth;
  let compYear = currentYear;
  if (compareMode === "prev_month") {
    compMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    compYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  } else if (compareMode === "prev_year") {
    compYear = currentYear - 1;
  }

  const compTotals: Record<Categoria, number> = compareMode !== "none" ? {
    produto: sumByMonth(data.lancamentos.produtos, compMonth, compYear, vendedorParam),
    servico: sumByMonth(data.lancamentos.servicos, compMonth, compYear, vendedorParam),
    contrato: sumByMonth(data.lancamentos.contratos, compMonth, compYear, vendedorParam),
    acessorio: sumByMonth(data.lancamentos.acessorios, compMonth, compYear, vendedorParam),
  } : { produto: 0, servico: 0, contrato: 0, acessorio: 0 };

  const compTotalGeral = Object.values(compTotals).reduce((a, b) => a + b, 0);

  function variation(current: number, previous: number): { pct: number; positive: boolean } | null {
    if (compareMode === "none" || previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    return { pct, positive: pct >= 0 };
  }

  const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();

  // Smart Alerts
  const alerts = useMemo(() => {
    const list: Alert[] = [];
    (["produto", "servico", "contrato", "acessorio"] as Categoria[]).forEach(cat => {
      const pct = currentMetas[cat] > 0 ? (totals[cat] / currentMetas[cat]) * 100 : 0;
      if (pct < 50 && isCurrentMonth && now.getDate() > 20) {
        list.push({
          id: `meta-${cat}`, icon: AlertTriangle,
          message: `${CATEGORIA_LABELS[cat]}: apenas ${pct.toFixed(0)}% da meta após dia 20 (${formatCurrency(totals[cat])} / ${formatCurrency(currentMetas[cat])})`,
          color: "#FF453A", route: "/lancamentos",
        });
      }
    });
    // Pós-venda: só alertar para clientes cadastrados nos últimos 15 dias e aguardando > 7 dias
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const oldPending = data.pos_venda.filter(p =>
      p.status === "Aguardando retorno" &&
      p.data >= fifteenDaysAgo &&
      p.data <= sevenDaysAgo
    );
    if (oldPending.length > 0) {
      list.push({
        id: "pos-venda-old", icon: Clock,
        message: `${oldPending.length} cliente(s) aguardando retorno há mais de 7 dias`,
        color: "#FFD60A", route: "/pos-venda",
      });
    }
    // Meta semanal: usar a semana mais recente registrada (não apenas mês atual)
    const sortedIndicators = [...data.indicadores_semanais].sort((a, b) => a.data.localeCompare(b.data));
    if (sortedIndicators.length > 0) {
      const last = sortedIndicators[sortedIndicators.length - 1];
      // Só alertar se o indicador for das últimas 2 semanas
      const indicatorDate = new Date(last.data);
      const daysSinceIndicator = Math.floor((now.getTime() - indicatorDate.getTime()) / 86400000);
      if (daysSinceIndicator <= 14) {
        const missed: string[] = [];
        if (last.captacoes < data.meta_semanal.captacoes) missed.push("Captações");
        if (last.orcamentos < data.meta_semanal.orcamentos) missed.push("Orçamentos");
        if (last.visitas < data.meta_semanal.visitas) missed.push("Visitas");
        if (missed.length > 0) {
          list.push({
            id: "indicador-miss", icon: Target,
            message: `Meta semanal não atingida: ${missed.join(", ")} (${last.vendedor}, S${last.semana})`,
            color: "#FFD60A", route: "/indicadores",
          });
        }
      }
    }
    list.push(...stockAlerts);
    return list;
  }, [data, totals, isCurrentMonth, now, currentMetas, stockAlerts]);

  // Client Ranking
  const clientRanking = useMemo(() => {
    const map = new Map<string, ClientRank>();
    const allCats = [
      ...itemsByMonth(data.lancamentos.produtos, currentMonth, currentYear, vendedorParam),
      ...itemsByMonth(data.lancamentos.servicos, currentMonth, currentYear, vendedorParam),
      ...itemsByMonth(data.lancamentos.contratos, currentMonth, currentYear, vendedorParam),
      ...itemsByMonth(data.lancamentos.acessorios, currentMonth, currentYear, vendedorParam),
    ];
    allCats.forEach(l => {
      const existing = map.get(l.cliente);
      if (existing) {
        existing.valor += l.valor;
        existing.count += 1;
      } else {
        map.set(l.cliente, { cliente: l.cliente, valor: l.valor, count: 1 });
      }
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => rankSort === "valor" ? b.valor - a.valor : b.count - a.count);
    return arr;
  }, [data, currentMonth, currentYear, vendedorParam, rankSort]);

  const chartData = MESES.map((mesNome, i) => {
    const row: Record<string, string | number> = {
      mes: mesNome.substring(0, 3),
      Produtos: sumByMonth(data.lancamentos.produtos, i, currentYear, vendedorParam),
      Serviços: sumByMonth(data.lancamentos.servicos, i, currentYear, vendedorParam),
      Contratos: sumByMonth(data.lancamentos.contratos, i, currentYear, vendedorParam),
      Acessórios: sumByMonth(data.lancamentos.acessorios, i, currentYear, vendedorParam),
    };
    if (compareMode !== "none") {
      const cy = compareMode === "prev_year" ? currentYear - 1 : currentYear;
      row["Prod. Comp."] = sumByMonth(data.lancamentos.produtos, i, cy, vendedorParam);
      row["Serv. Comp."] = sumByMonth(data.lancamentos.servicos, i, cy, vendedorParam);
    }
    return row;
  });

  // ===== Ticket Médio (mês selecionado) =====
  const allItemsMonth = [
    ...itemsByMonth(data.lancamentos.produtos, currentMonth, currentYear, vendedorParam),
    ...itemsByMonth(data.lancamentos.servicos, currentMonth, currentYear, vendedorParam),
    ...itemsByMonth(data.lancamentos.contratos, currentMonth, currentYear, vendedorParam),
    ...itemsByMonth(data.lancamentos.acessorios, currentMonth, currentYear, vendedorParam),
  ];
  const qtdLancamentos = allItemsMonth.length;
  const ticketMedio = qtdLancamentos > 0 ? totalGeral / qtdLancamentos : 0;

  const allItemsCompMonth = compareMode !== "none" ? [
    ...itemsByMonth(data.lancamentos.produtos, compMonth, compYear, vendedorParam),
    ...itemsByMonth(data.lancamentos.servicos, compMonth, compYear, vendedorParam),
    ...itemsByMonth(data.lancamentos.contratos, compMonth, compYear, vendedorParam),
    ...itemsByMonth(data.lancamentos.acessorios, compMonth, compYear, vendedorParam),
  ] : [];
  const ticketMedioComp = allItemsCompMonth.length > 0
    ? allItemsCompMonth.reduce((s, i) => s + i.valor, 0) / allItemsCompMonth.length
    : 0;

  // ===== Comissões: evolução mensal (apenas lançamentos pagos = recebidas) =====
  const CAT_KEYS: { cat: Categoria; arr: keyof typeof data.lancamentos }[] = [
    { cat: "produto", arr: "produtos" },
    { cat: "servico", arr: "servicos" },
    { cat: "contrato", arr: "contratos" },
    { cat: "acessorio", arr: "acessorios" },
  ];
  const comissoesChartData = MESES.map((mesNome, i) => {
    let recebidas = 0;
    let previstas = 0;
    CAT_KEYS.forEach(({ cat, arr }) => {
      const items = itemsByMonth(data.lancamentos[arr] as Lancamento[], i, currentYear, vendedorParam);
      items.forEach((l) => {
        const c = calcularComissao(cat, l.valor, l.custos ?? 0);
        previstas += c;
        if (l.paid) recebidas += c;
      });
    });
    return { mes: mesNome.substring(0, 3), Recebidas: recebidas, Previstas: previstas };
  });
  const comissoesRecebidasMes = comissoesChartData[currentMonth]?.Recebidas ?? 0;
  const comissoesRecebidasAno = comissoesChartData.reduce((s, r) => s + r.Recebidas, 0);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const compLabel = compareMode === "prev_year" ? "vs ano anterior" : "vs mês anterior";

  function VariationBadge({ current, previous, showLabel = false }: { current: number; previous: number; showLabel?: boolean }) {
    if (compareMode === "none") return null;
    if (previous === 0 && current === 0) return <span className="text-[0.85rem] text-foreground/70">{showLabel ? "Sem dados para comparação" : ""}</span>;
    let pct: number;
    let isPositive: boolean;
    if (previous === 0) { pct = 100; isPositive = true; }
    else if (current === 0) { pct = -100; isPositive = false; }
    else { pct = ((current - previous) / previous) * 100; isPositive = pct >= 0; }
    return (
      <span
        className="inline-flex items-center gap-1 text-[0.85rem] font-semibold px-2.5 py-1 rounded-full"
        style={{
          background: isPositive ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)',
          color: isPositive ? '#30D158' : '#FF453A',
        }}
      >
        {isPositive ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%{showLabel ? ` ${compLabel}` : ""}
      </span>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Dashboard</h1>
          <p className="text-base text-foreground/70">Visão geral do faturamento</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-semibold text-foreground bg-secondary">
              {MESES[currentMonth].substring(0, 3)} {currentYear}
              <ChevronDown className="h-5 w-5 text-foreground/70" />
            </button>
            {showPicker && (
              <div className="absolute right-0 top-full mt-2 z-50 p-3 rounded-2xl w-64 bg-popover border border-border backdrop-blur-xl">
                <div className="flex gap-2 mb-3">
                  {[2025, 2026, 2027].map(y => (
                    <button key={y} onClick={() => setYear(y)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${y === currentYear ? 'bg-primary text-foreground' : 'text-foreground/70'}`}>{y}</button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MESES.map((m, i) => (
                    <button key={i} onClick={() => { setMonth(i); setShowPicker(false); }}
                      className={`py-2 rounded-lg text-sm font-medium transition ${i === currentMonth ? 'bg-primary text-foreground' : 'text-foreground/70 hover:bg-muted'}`}>
                      {m.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Filter */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
        <Users className="h-5 w-5 flex-shrink-0 text-foreground/70" />
        <div className="segmented-control">
          <button
            onClick={() => setVendedor(null)}
            className={`segmented-btn text-[0.85rem] ${!vendedorParam ? 'active' : ''}`}>
            Todos
          </button>
          {data.vendedores.map(v => (
            <button key={v}
              onClick={() => setVendedor(v)}
              className={`segmented-btn text-[0.85rem] ${vendedorParam === v ? 'active' : ''}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Banner */}
      {!dismissedAlerts && alerts.length > 0 && (
        <div className="glass-card p-6 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-foreground" />
              <h3 className="text-base font-semibold text-foreground">Alertas ({alerts.length})</h3>
            </div>
            <button onClick={() => setDismissedAlerts(true)}><X className="h-5 w-5 text-foreground/70" /></button>
          </div>
          {alerts.map(a => (
            <button key={a.id} onClick={() => { navigate(a.route); setDismissedAlerts(true); }}
              className="w-full text-left flex items-start gap-3 p-4 rounded-xl transition hover:bg-muted"
              style={{ background: a.color + '12', border: `1px solid ${a.color}30` }}>
              <a.icon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: a.color }} />
              <span className="text-[0.85rem] text-foreground leading-relaxed">{a.message}</span>
            </button>
          ))}
        </div>
      )}

      {/* Compare Toggle */}
      <div className="flex items-center gap-3">
        <GitCompare className="h-5 w-5 text-foreground/70" />
        <div className="segmented-control">
          {([
            { key: "none" as CompareMode, label: "Sem comparação" },
            { key: "prev_month" as CompareMode, label: "Mês anterior" },
            { key: "prev_year" as CompareMode, label: "Ano anterior" },
          ]).map(opt => (
            <button key={opt.key} onClick={() => setCompareMode(opt.key)}
              className={`segmented-btn text-[0.85rem] ${compareMode === opt.key ? 'active' : ''}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Total KPI Card */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(10,132,255,0.18), rgba(10,132,255,0.06))', border: '1px solid rgba(10,132,255,0.3)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6" style={{ color: '#0A84FF' }} />
          <span className="text-base font-semibold text-foreground/70">
            Faturamento Total — {MESES[currentMonth]}
            {vendedorParam && <span className="ml-1 text-[#0A84FF]">({vendedorParam})</span>}
          </span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-[2.5rem] font-extrabold text-foreground leading-tight">{formatCurrency(totalGeral)}</span>
            <div className="mt-1"><VariationBadge current={totalGeral} previous={compTotalGeral} showLabel /></div>
          </div>
          <span className="text-base font-bold px-3 py-1.5 rounded-full"
            style={{ background: `${progressColor(pctTotal)}25`, color: progressColor(pctTotal) }}>
            {pctTotal.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-secondary">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pctTotal, 100)}%`, background: progressColor(pctTotal) }} />
          </div>
          <span className="text-[0.85rem] text-foreground/70 font-medium">Meta: {formatCurrency(metaTotal)}</span>
        </div>
      </div>

      {/* Category KPI Grid */}
      <div className="grid grid-cols-2 gap-5">
        {(["produto", "servico", "contrato", "acessorio"] as Categoria[]).map((cat) => {
          const Icon = ICONS[cat];
          const val = totals[cat];
          const meta = currentMetas[cat];
          const pct = meta > 0 ? (val / meta) * 100 : 0;
          return (
            <div key={cat} className="glass-card p-6 relative" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" style={{ color: CAT_COLORS[cat] }} />
                  <span className="text-base font-semibold text-foreground/70">{CATEGORIA_LABELS[cat]}</span>
                </div>
                <span className="text-[0.8rem] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${progressColor(pct)}25`, color: progressColor(pct) }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <p className="text-[2.5rem] font-extrabold text-foreground mb-1 leading-tight">{formatCurrency(val)}</p>
              <div className="mb-2"><VariationBadge current={val} previous={compTotals[cat]} showLabel /></div>
              <div className="h-2 rounded-full overflow-hidden bg-secondary">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, background: CAT_COLORS[cat] }} />
              </div>
            </div>
          );
        })}
      </div>


      {/* Client Ranking */}
      <div className="glass-card p-6 space-y-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: '#FFD60A' }} />
            <h3 className="text-base font-semibold text-foreground">Ranking de Clientes</h3>
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

      {/* Chart */}
      <div className="glass-card p-6" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <h3 className="text-base font-semibold text-foreground mb-5">Faturamento Mensal — {currentYear}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#AEAEB2', fontSize: 13 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#AEAEB2', fontSize: 13 }} width={60} />
            <Tooltip
              contentStyle={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }}
              formatter={(value: number) => formatCurrency(value)}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="Produtos" fill="#0A84FF" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Serviços" fill="#30D158" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Contratos" fill="#FFD60A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Acessórios" fill="#BF5AF2" radius={[6, 6, 0, 0]} />
            {compareMode === "prev_year" && (
              <>
                <Bar dataKey="Prod. Comp." fill="#0A84FF" radius={[6, 6, 0, 0]} opacity={0.3} />
                <Bar dataKey="Serv. Comp." fill="#30D158" radius={[6, 6, 0, 0]} opacity={0.3} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {(["produto", "servico", "contrato", "acessorio"] as Categoria[]).map(cat => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: CAT_COLORS[cat] }} />
              <span className="text-[0.85rem] text-foreground/70">{CATEGORIA_LABELS[cat]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
