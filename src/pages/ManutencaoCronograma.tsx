import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import {
  Plus, Pencil, Power, X, CalendarClock, ListChecks, Clock, CheckCircle2, Trash2, Printer, LayoutGrid, List,
} from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TipoServico = "P" | "C" | "T" | "Q" | "AA" | "V";
type StatusPlan = "planejado" | "adiada" | "executado" | "desativado" | "instalado";

interface Cliente { id: string; nome: string; }
interface Equipamento {
  id: string;
  cliente_id: string;
  equipamento: string;
  modelo: string | null;
  marca: string | null;
  localizacao: string | null;
  identificacao: string | null;
  registro_anvisa: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tem_contrato_terceiro: boolean;
  status: string; // "Ativo" | "Desativado"
  fornecedor: string | null;
  descontinuidade: boolean;
  periodicidade: string | null;
  ativo: boolean;
  unidade: string | null;
  setor: string | null;
  tipo_posse: string | null;
}
interface Planejamento {
  id: string;
  equipamento_id: string;
  ano: number;
  mes: number;
  tipo_servico: TipoServico;
  status: StatusPlan;
  observacao: string | null;
}

const TIPOS: { key: TipoServico; label: string; color: string; bg: string }[] = [
  { key: "P",  label: "Preventiva",             color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "C",  label: "Calibração",             color: "#7C3AED", bg: "#EDE9FE" },
  { key: "T",  label: "Teste Seg. Elétrica",    color: "#B45309", bg: "#FEF3C7" },
  { key: "Q",  label: "Qualificação",           color: "#0F766E", bg: "#CCFBF1" },
  { key: "AA", label: "Análise Ar e Água",      color: "#BE185D", bg: "#FCE7F3" },
  { key: "V",  label: "Validação",              color: "#4338CA", bg: "#E0E7FF" },
];
const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.key, t])) as Record<TipoServico, typeof TIPOS[number]>;

const STATUS_PLAN: { key: StatusPlan; label: string; color: string; bg: string; dot: string }[] = [
  { key: "planejado",  label: "Planejado",  color: "#1D4ED8", bg: "#DBEAFE", dot: "🔵" },
  { key: "adiada",     label: "Adiada",     color: "#C2410C", bg: "#FED7AA", dot: "🟠" },
  { key: "executado",  label: "Executado",  color: "#15803D", bg: "#DCFCE7", dot: "🟢" },
  { key: "desativado", label: "Desativado", color: "#475569", bg: "#E2E8F0", dot: "⚫" },
  { key: "instalado",  label: "Instalado",  color: "#7C3AED", bg: "#EDE9FE", dot: "🟣" },
];
const STATUS_MAP = Object.fromEntries(STATUS_PLAN.map(s => [s.key, s])) as Record<StatusPlan, typeof STATUS_PLAN[number]>;

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const PERIODICIDADES = ["Mensal", "Trimestral", "Semestral", "Anual"];
const TIPOS_POSSE = ["Próprio", "Locado", "Comodato", "Empréstimo"] as const;
type TipoPosse = typeof TIPOS_POSSE[number];
const POSSE_BADGE: Record<Exclude<TipoPosse, "Próprio">, { bg: string; color: string }> = {
  Locado: { bg: "#DBEAFE", color: "#1D4ED8" },
  Comodato: { bg: "#EDE9FE", color: "#7C3AED" },
  "Empréstimo": { bg: "#FFEDD5", color: "#C2410C" },
};

export default function ManutencaoCronograma() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "Ativo" | "Desativado">("");
  const [filtroPeriodicidade, setFiltroPeriodicidade] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoServico>("");
  const [filtroMes, setFiltroMes] = useState<number>(0); // 0 = todos
  const [filtroPosse, setFiltroPosse] = useState<"" | TipoPosse>("");
  const [colunasExtras, setColunasExtras] = useState(false);
  const [viewMode, setViewMode] = useState<"grade" | "lista">("grade");

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Equipamento | null>(null);
  const [saving, setSaving] = useState(false);

  const [fEquip, setFEquip] = useState("");
  const [fModelo, setFModelo] = useState("");
  const [fMarca, setFMarca] = useState("");
  const [fLocal, setFLocal] = useState("");
  const [fIdent, setFIdent] = useState("");
  const [fAnvisa, setFAnvisa] = useState("");
  const [fSerie, setFSerie] = useState("");
  const [fPatri, setFPatri] = useState("");
  const [fTerceiro, setFTerceiro] = useState(false);
  const [fStatus, setFStatus] = useState("Ativo");
  const [fFornec, setFFornec] = useState("");
  const [fDescont, setFDescont] = useState(false);
  const [fPeriod, setFPeriod] = useState("Mensal");
  const [fUnidade, setFUnidade] = useState("");
  const [fSetor, setFSetor] = useState("");
  const [fPosse, setFPosse] = useState<TipoPosse>("Próprio");

  // Load clientes
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) { setErro("Erro ao carregar clientes"); setLoading(false); return; }
      const list = (data || []) as Cliente[];
      setClientes(list);
      if (list.length && !clienteId) setClienteId(list[0].id);
      setLoading(false);
    })();
  }, [user]);

  const fetchGrade = useCallback(async () => {
    if (!clienteId) { setEquipamentos([]); setPlanejamentos([]); return; }
    setLoadingGrade(true);
    setErro(null);
    const { data: eqs, error: e1 } = await supabase
      .from("cronograma_equipamentos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("equipamento");
    if (e1) { setErro("Erro ao carregar equipamentos"); setLoadingGrade(false); return; }
    const list = (eqs || []) as Equipamento[];
    setEquipamentos(list);
    const ids = list.map(e => e.id);
    if (ids.length === 0) { setPlanejamentos([]); setLoadingGrade(false); return; }
    const { data: pls, error: e2 } = await supabase
      .from("cronograma_planejamento")
      .select("*")
      .in("equipamento_id", ids)
      .eq("ano", ano);
    if (e2) { setErro("Erro ao carregar planejamento"); setLoadingGrade(false); return; }
    setPlanejamentos((pls || []) as Planejamento[]);
    setLoadingGrade(false);
  }, [clienteId, ano]);

  useEffect(() => { fetchGrade(); }, [fetchGrade]);

  const filtered = useMemo(() => equipamentos.filter(e => {
    const q = busca.trim().toLowerCase();
    if (q && !((e.equipamento || "").toLowerCase().includes(q) || (e.localizacao || "").toLowerCase().includes(q))) return false;
    if (filtroStatus && e.status !== filtroStatus) return false;
    if (filtroPeriodicidade && (e.periodicidade || "") !== filtroPeriodicidade) return false;
    if (filtroPosse && (e.tipo_posse || "Próprio") !== filtroPosse) return false;
    return true;
  }), [equipamentos, busca, filtroStatus, filtroPeriodicidade, filtroPosse]);

  const plansByCell = useMemo(() => {
    const map = new Map<string, Planejamento[]>();
    for (const p of planejamentos) {
      const k = `${p.equipamento_id}:${p.mes}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [planejamentos]);

  const kpis = useMemo(() => {
    const ativos = equipamentos.filter(e => e.status !== "Desativado");
    const terceiros = equipamentos.filter(e => (e.tipo_posse || "Próprio") !== "Próprio").length;
    if (filtroMes > 0) {
      const doMes = planejamentos.filter(p => p.mes === filtroMes);
      const planejadosMes = doMes.filter(p => p.status === "planejado").length;
      const adiadosMes = doMes.filter(p => p.status === "adiada").length;
      const execMes = doMes.filter(p => p.status === "executado").length;
      const pctMes = doMes.length === 0 ? 0 : Math.round((execMes / doMes.length) * 100);
      return {
        equipamentos: ativos.length,
        terceiros,
        modo: "mes" as const,
        planejadosMes, adiadosMes, execMes, pctMes,
        noMes: 0, adiados: 0, pct: 0,
      };
    }
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    const noMes = ano === anoAtual
      ? planejamentos.filter(p => p.mes === mesAtual && p.status === "planejado").length
      : 0;
    const adiados = planejamentos.filter(p => p.status === "adiada").length;
    const totalAno = planejamentos.length;
    const execAno = planejamentos.filter(p => p.status === "executado").length;
    const pct = totalAno === 0 ? 0 : Math.round((execAno / totalAno) * 100);
    return { equipamentos: ativos.length, terceiros, modo: "ano" as const, noMes, adiados, pct, planejadosMes: 0, adiadosMes: 0, execMes: 0, pctMes: 0 };
  }, [equipamentos, planejamentos, ano, filtroMes]);

  function resetForm() {
    setShowForm(false); setEditItem(null);
    setFEquip(""); setFModelo(""); setFMarca(""); setFLocal("");
    setFIdent(""); setFAnvisa(""); setFSerie(""); setFPatri("");
    setFTerceiro(false); setFStatus("Ativo"); setFFornec("");
    setFDescont(false); setFPeriod("Mensal");
    setFUnidade(""); setFSetor(""); setFPosse("Próprio");
  }

  function openNew() {
    if (!clienteId) { toast.error("Selecione um cliente primeiro"); return; }
    resetForm(); setShowForm(true);
  }

  function openEdit(e: Equipamento) {
    setEditItem(e);
    setFEquip(e.equipamento);
    setFModelo(e.modelo || "");
    setFMarca(e.marca || "");
    setFLocal(e.localizacao || "");
    setFIdent(e.identificacao || "");
    setFAnvisa(e.registro_anvisa || "");
    setFSerie(e.numero_serie || "");
    setFPatri(e.patrimonio || "");
    setFTerceiro(!!e.tem_contrato_terceiro);
    setFStatus(e.status || "Ativo");
    setFFornec(e.fornecedor || "");
    setFDescont(!!e.descontinuidade);
    setFPeriod(e.periodicidade || "Mensal");
    setFUnidade(e.unidade || "");
    setFSetor(e.setor || "");
    setFPosse(((e.tipo_posse as TipoPosse) || "Próprio"));
    setShowForm(true);
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!fEquip.trim()) { toast.error("Informe o nome do equipamento"); return; }
    setSaving(true);
    const payload: any = {
      cliente_id: clienteId,
      equipamento: fEquip.trim(),
      modelo: fModelo || null,
      marca: fMarca || null,
      localizacao: fLocal || null,
      identificacao: fIdent || null,
      registro_anvisa: fAnvisa || null,
      numero_serie: fSerie || null,
      patrimonio: fPatri || null,
      tem_contrato_terceiro: fTerceiro,
      status: fStatus,
      fornecedor: fFornec || null,
      descontinuidade: fDescont,
      periodicidade: fPeriod || null,
      unidade: fUnidade || null,
      setor: fSetor || null,
      tipo_posse: fPosse || "Próprio",
    };
    let err: any = null;
    if (editItem) {
      const r = await supabase.from("cronograma_equipamentos").update(payload).eq("id", editItem.id);
      err = r.error;
    } else {
      const r = await supabase.from("cronograma_equipamentos").insert(payload);
      err = r.error;
    }
    setSaving(false);
    if (err) { toast.error("Erro ao salvar: " + err.message); return; }
    toast.success(editItem ? "Equipamento atualizado" : "Equipamento cadastrado");
    resetForm();
    await fetchGrade();
  }

  async function toggleAtivo(e: Equipamento) {
    const novo = e.status === "Desativado" ? "Ativo" : "Desativado";
    const { error } = await supabase.from("cronograma_equipamentos").update({ status: novo }).eq("id", e.id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    toast.success(novo === "Ativo" ? "Equipamento ativado" : "Equipamento desativado");
    await fetchGrade();
  }

  async function addPlan(equipamento_id: string, mes: number, tipo_servico: TipoServico, status: StatusPlan) {
    const { error } = await supabase.from("cronograma_planejamento").insert({
      equipamento_id, ano, mes, tipo_servico, status,
    });
    if (error) { toast.error("Erro ao adicionar: " + error.message); return; }
    await fetchGrade();
  }
  async function addPlans(equipamento_id: string, mes: number, tipos: TipoServico[], status: StatusPlan) {
    if (tipos.length === 0) return;
    const rows = tipos.map(tipo_servico => ({ equipamento_id, ano, mes, tipo_servico, status }));
    const { error } = await supabase.from("cronograma_planejamento").insert(rows);
    if (error) { toast.error("Erro ao adicionar: " + error.message); return; }
    toast.success(tipos.length === 1 ? "Serviço adicionado" : `${tipos.length} serviços adicionados`);
    await fetchGrade();
  }
  async function updatePlanStatus(id: string, status: StatusPlan) {
    const { error } = await supabase.from("cronograma_planejamento").update({ status }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    await fetchGrade();
  }
  async function removePlan(id: string) {
    const { error } = await supabase.from("cronograma_planejamento").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    await fetchGrade();
  }

  if (loading) return <ListSkeleton />;
  if (erro && equipamentos.length === 0 && clientes.length === 0) {
    return <ErrorState message={erro} onRetry={() => window.location.reload()} />;
  }

  const anoAtual = new Date().getFullYear();
  const anosOptions = Array.from({ length: 7 }, (_, i) => anoAtual - 3 + i);
  const mesAtualIdx = new Date().getMonth(); // 0-11
  const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  function handleSetFiltroMes(m: number) {
    setFiltroMes(m);
    if (m > 0) setViewMode("lista");
    else setViewMode("grade");
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Controle de Cronogramas</h1>
          <p className="text-sm text-[#64748B] mt-1">Planejamento anual de manutenções preventivas, calibrações e testes por equipamento.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-1">Cliente</div>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="h-10 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A] min-w-[220px]">
              {clientes.length === 0 && <option value="">Nenhum cliente</option>}
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-1">Ano</div>
            <select value={ano} onChange={e => setAno(Number(e.target.value))} className="h-10 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
              {anosOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-1">Mês</div>
            <select value={filtroMes} onChange={e => handleSetFiltroMes(Number(e.target.value))} className="h-10 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
              <option value={0}>Todos os meses</option>
              {MESES_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-1">Visualização</div>
            <div className="inline-flex h-10 rounded-[10px] border border-[#E2E8F0] bg-white overflow-hidden">
              <button type="button" onClick={() => setViewMode("grade")} className={`px-3 text-xs font-medium inline-flex items-center gap-1.5 ${viewMode === "grade" ? "bg-[#1F4E79] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"}`}>
                <LayoutGrid className="h-3.5 w-3.5" /> Grade Anual
              </button>
              <button type="button" onClick={() => setViewMode("lista")} className={`px-3 text-xs font-medium inline-flex items-center gap-1.5 ${viewMode === "lista" ? "bg-[#1F4E79] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"}`}>
                <List className="h-3.5 w-3.5" /> Lista Mensal
              </button>
            </div>
          </div>
          <button onClick={openNew} className="h-10 px-5 rounded-[10px] text-sm font-medium text-white inline-flex items-center gap-2 hover:brightness-110" style={{ background: "#1F4E79" }}>
            <Plus className="h-4 w-4" /> Novo Equipamento
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">Tipos:</span>
          {TIPOS.map(t => (
            <span key={t.key} className="inline-flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center justify-center min-w-[26px] px-1.5 h-[22px] rounded-md text-[11px] font-bold" style={{ background: t.bg, color: t.color }}>{t.key}</span>
              <span className="text-[#475569]">{t.label}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">Status:</span>
          {STATUS_PLAN.map(s => (
            <span key={s.key} className="inline-flex items-center gap-1 text-xs text-[#475569]"><span>{s.dot}</span>{s.label}</span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={<ListChecks className="h-5 w-5" />} color="#1F4E79" label="Equipamentos Ativos" value={kpis.equipamentos} />
        {kpis.modo === "mes" ? (
          <>
            <KpiCard icon={<CalendarClock className="h-5 w-5" />} color="#0F766E" label={`Planejados em ${MESES_FULL[filtroMes - 1]}`} value={kpis.planejadosMes} />
            <KpiCard icon={<Clock className="h-5 w-5" />} color="#C2410C" label={`Adiados em ${MESES_FULL[filtroMes - 1]}`} value={kpis.adiadosMes} />
            <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} color="#15803D" label={`% Executado em ${MESES_FULL[filtroMes - 1]}`} value={`${kpis.pctMes}%`} />
          </>
        ) : (
          <>
            <KpiCard icon={<CalendarClock className="h-5 w-5" />} color="#0F766E" label="Planejados no Mês" value={kpis.noMes} />
            <KpiCard icon={<Clock className="h-5 w-5" />} color="#C2410C" label="Adiados no Ano" value={kpis.adiados} />
            <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} color="#15803D" label="% Executado no Ano" value={`${kpis.pct}%`} />
          </>
        )}
        <KpiCard icon={<ListChecks className="h-5 w-5" />} color="#7C3AED" label="Equipamentos de Terceiros" value={kpis.terceiros} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar equipamento ou localização" className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A] min-w-[260px]" />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
          <option value="">Status: Todos</option>
          <option value="Ativo">Ativo</option>
          <option value="Desativado">Desativado</option>
        </select>
        <select value={filtroPeriodicidade} onChange={e => setFiltroPeriodicidade(e.target.value)} className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
          <option value="">Periodicidade: Todas</option>
          {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)} className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
          <option value="">Tipo: Todos</option>
          {TIPOS.map(t => <option key={t.key} value={t.key}>{t.key} — {t.label}</option>)}
        </select>
        <select value={filtroPosse} onChange={e => setFiltroPosse(e.target.value as any)} className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
          <option value="">Posse: Todos</option>
          {TIPOS_POSSE.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => setColunasExtras(v => !v)} className="h-9 px-3 rounded-[10px] text-sm font-medium border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9]">
          {colunasExtras ? "Ocultar colunas extras" : "Mostrar colunas extras"}
        </button>
        <button onClick={() => { setBusca(""); setFiltroStatus(""); setFiltroPeriodicidade(""); setFiltroTipo(""); setFiltroPosse(""); }} className="h-9 px-4 rounded-[10px] text-sm font-medium text-white" style={{ background: "#25598C" }}>
          Limpar
        </button>
      </div>

      {/* Grade */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            Cronograma {ano}
            {viewMode === "lista" && filtroMes > 0 && <span className="text-[#64748B] font-normal"> — {MESES_FULL[filtroMes - 1]}</span>}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">{filtered.length} equipamento(s)</span>
            {viewMode === "lista" && (
              <button onClick={() => window.print()} className="h-8 px-3 rounded-md text-xs font-medium text-white inline-flex items-center gap-1.5 print:hidden" style={{ background: "#1F4E79" }}>
                <Printer className="h-3.5 w-3.5" /> Exportar PDF
              </button>
            )}
          </div>
        </div>
        {loadingGrade ? (
          <div className="p-10 text-center text-sm text-[#64748B]">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarClock className="h-10 w-10 mx-auto text-[#94A3B8]" />
            <div className="mt-3 text-sm text-[#64748B]">
              {equipamentos.length === 0
                ? "Nenhum equipamento cadastrado ainda para este cliente. Clique em 'Novo Equipamento' para começar."
                : "Nenhum equipamento encontrado com esses filtros."}
            </div>
            {equipamentos.length === 0 && clienteId && (
              <button onClick={openNew} className="mt-4 h-10 px-5 rounded-[10px] text-sm font-medium text-white inline-flex items-center gap-2" style={{ background: "#1F4E79" }}>
                <Plus className="h-4 w-4" /> Novo Equipamento
              </button>
            )}
          </div>
        ) : viewMode === "lista" ? (
          <ListaMensal
            equipamentos={filtered}
            planejamentos={planejamentos}
            mes={filtroMes > 0 ? filtroMes : mesAtualIdx + 1}
            ano={ano}
            onAddPlans={addPlans}
            onUpdate={updatePlanStatus}
            onRemove={removePlan}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate" style={{ borderSpacing: 0 }}>
              <thead className="bg-[#F8FAFC] text-[#475569] text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-3 sticky left-0 z-20 bg-[#F8FAFC] border-b border-[#E2E8F0] min-w-[220px]">Equipamento</th>
                  <th className="text-left px-3 py-3 sticky z-20 bg-[#F8FAFC] border-b border-[#E2E8F0] min-w-[160px]" style={{ left: 220 }}>Localização</th>
                  <th className="text-left px-3 py-3 sticky z-20 bg-[#F8FAFC] border-b border-[#E2E8F0] min-w-[120px]" style={{ left: 380 }}>Periodicidade</th>
                  {MESES.map((m, i) => {
                    const isCurrent = i === mesAtualIdx && ano === anoAtual;
                    return (
                      <th key={m} className={`text-center px-2 py-3 border-b border-[#E2E8F0] min-w-[80px] ${isCurrent ? "bg-[#EAF4FD]" : ""}`}>
                        {m}{isCurrent && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#50B9EC]" />}
                      </th>
                    );
                  })}
                  <th className="text-right px-3 py-3 sticky right-0 z-20 bg-[#F8FAFC] border-b border-[#E2E8F0] min-w-[90px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(eq => {
                  const desat = eq.status === "Desativado";
                  return (
                    <tr key={eq.id} className={`border-t border-[#F1F5F9] ${desat ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>
                      <td className={`px-3 py-2 sticky left-0 z-10 bg-white border-b border-[#F1F5F9] font-medium ${desat ? "line-through" : ""}`}>
                        <div>{eq.equipamento}</div>
                        {(eq.marca || eq.modelo) && <div className="text-[11px] text-[#94A3B8]">{[eq.marca, eq.modelo].filter(Boolean).join(" • ")}</div>}
                      </td>
                      <td className={`px-3 py-2 sticky z-10 bg-white border-b border-[#F1F5F9] ${desat ? "line-through" : ""}`} style={{ left: 220 }}>
                        {eq.localizacao || "—"}
                      </td>
                      <td className={`px-3 py-2 sticky z-10 bg-white border-b border-[#F1F5F9] ${desat ? "line-through" : ""}`} style={{ left: 380 }}>
                        {eq.periodicidade || "—"}
                      </td>
                      {MESES.map((_, i) => {
                        const mes = i + 1;
                        const items = plansByCell.get(`${eq.id}:${mes}`) || [];
                        const isCurrent = i === mesAtualIdx && ano === anoAtual;
                        return (
                          <td key={mes} className={`px-1 py-1 border-b border-[#F1F5F9] align-middle ${isCurrent ? "bg-[#EAF4FD]/40" : ""}`}>
                            <CellPopover
                              equipamentoId={eq.id}
                              mes={mes}
                              items={items}
                              destaqueTipo={filtroTipo || null}
                              onAddPlans={addPlans}
                              onUpdate={updatePlanStatus}
                              onRemove={removePlan}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 sticky right-0 z-10 bg-white border-b border-[#F1F5F9]">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(eq)} title="Editar" className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => toggleAtivo(eq)} title={desat ? "Ativar" : "Desativar"} className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C]">
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo/Editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={resetForm}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-[#0F172A]">{editItem ? "Editar Equipamento" : "Novo Equipamento"}</h3>
              <button type="button" onClick={resetForm} className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              <Field label="Equipamento *" className="md:col-span-2">
                <input value={fEquip} onChange={e => setFEquip(e.target.value)} required className="form-input" />
              </Field>
              <Field label="Marca"><input value={fMarca} onChange={e => setFMarca(e.target.value)} className="form-input" /></Field>
              <Field label="Modelo"><input value={fModelo} onChange={e => setFModelo(e.target.value)} className="form-input" /></Field>
              <Field label="Localização"><input value={fLocal} onChange={e => setFLocal(e.target.value)} className="form-input" /></Field>
              <Field label="Identificação"><input value={fIdent} onChange={e => setFIdent(e.target.value)} className="form-input" /></Field>
              <Field label="Registro ANVISA"><input value={fAnvisa} onChange={e => setFAnvisa(e.target.value)} className="form-input" /></Field>
              <Field label="Número de Série"><input value={fSerie} onChange={e => setFSerie(e.target.value)} className="form-input" /></Field>
              <Field label="Patrimônio"><input value={fPatri} onChange={e => setFPatri(e.target.value)} className="form-input" /></Field>
              <Field label="Fornecedor"><input value={fFornec} onChange={e => setFFornec(e.target.value)} className="form-input" /></Field>
              <Field label="Periodicidade">
                <select value={fPeriod} onChange={e => setFPeriod(e.target.value)} className="form-input">
                  {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="form-input">
                  <option value="Ativo">Ativo</option>
                  <option value="Desativado">Desativado</option>
                </select>
              </Field>
              <ToggleField label="Tem contrato com terceiro" checked={fTerceiro} onChange={setFTerceiro} />
              <ToggleField label="Descontinuidade" checked={fDescont} onChange={setFDescont} />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E2E8F0]">
              <button type="button" onClick={resetForm} className="h-10 px-4 rounded-[10px] text-sm font-medium border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]">Cancelar</button>
              <button type="submit" disabled={saving} className="h-10 px-5 rounded-[10px] text-sm font-medium text-white hover:brightness-110 disabled:opacity-60" style={{ background: "#1F4E79" }}>
                {saving ? "Salvando..." : editItem ? "Salvar alterações" : "Cadastrar equipamento"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .form-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #E2E8F0; border-radius: 10px; background: white; font-size: 14px; color: #0F172A; outline: none; transition: border-color .15s; }
        select.form-input { appearance: auto; }
        .form-input:focus { border-color: #50B9EC; box-shadow: 0 0 0 3px rgba(80,185,236,0.15); }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function KpiCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#64748B]">{label}</div>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="mt-1 text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[12px] font-medium text-[#475569] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between h-[40px] px-3 rounded-[10px] border border-[#E2E8F0] bg-white cursor-pointer mt-6">
      <span className="text-[13px] text-[#0F172A]">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className="relative w-10 h-6 rounded-full transition" style={{ background: checked ? "#1F4E79" : "#CBD5E1" }}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition" style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }} />
      </button>
    </label>
  );
}

function CellPopover({
  equipamentoId, mes, items, destaqueTipo, onAddPlans, onUpdate, onRemove,
}: {
  equipamentoId: string;
  mes: number;
  items: Planejamento[];
  destaqueTipo: TipoServico | null;
  onAddPlans: (eq: string, mes: number, tipos: TipoServico[], status: StatusPlan) => void;
  onUpdate: (id: string, status: StatusPlan) => void;
  onRemove: (id: string) => void;
}) {
  const [status, setStatus] = useState<StatusPlan>("planejado");
  const [selecionados, setSelecionados] = useState<Record<TipoServico, boolean>>({
    P: false, C: false, T: false, Q: false, AA: false, V: false,
  });
  const toggle = (k: TipoServico) => setSelecionados(prev => ({ ...prev, [k]: !prev[k] }));
  const setCombo = (keys: TipoServico[]) => {
    const next = { P: false, C: false, T: false, Q: false, AA: false, V: false } as Record<TipoServico, boolean>;
    keys.forEach(k => { next[k] = true; });
    setSelecionados(next);
  };
  const handleAdd = () => {
    const tipos = (Object.keys(selecionados) as TipoServico[]).filter(k => selecionados[k]);
    if (tipos.length === 0) return;
    onAddPlans(equipamentoId, mes, tipos, status);
    setSelecionados({ P: false, C: false, T: false, Q: false, AA: false, V: false });
  };
  const anySel = (Object.keys(selecionados) as TipoServico[]).some(k => selecionados[k]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group w-full min-h-[36px] rounded-md hover:bg-[#EAF4FD] transition flex items-center justify-center gap-1 flex-wrap px-1 py-1">
          {items.length === 0 ? (
            <span className="text-[#94A3B8] opacity-40 group-hover:opacity-100 text-lg leading-none">+</span>
          ) : (
            items.map(p => {
              const t = TIPO_MAP[p.tipo_servico];
              const s = STATUS_MAP[p.status];
              const fade = destaqueTipo && p.tipo_servico !== destaqueTipo;
              return (
                <span
                  key={p.id}
                  className="inline-flex items-center justify-center min-w-[24px] px-1.5 h-[22px] rounded-md text-[11px] font-bold"
                  style={{
                    background: s.bg,
                    color: s.color,
                    opacity: fade ? 0.25 : 1,
                    border: `1px solid ${s.color}33`,
                  }}
                  title={`${t.label} — ${s.label}`}
                >
                  {p.tipo_servico}
                </span>
              );
            })
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[320px] p-3">
        <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold mb-2">
          {MESES[mes - 1]} — Serviços
        </div>
        {items.length === 0 ? (
          <div className="text-xs text-[#94A3B8] py-2">Nenhum serviço lançado.</div>
        ) : (
          <ul className="space-y-1.5 mb-3">
            {items.map(p => {
              const t = TIPO_MAP[p.tipo_servico];
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center min-w-[26px] px-1.5 h-[22px] rounded-md text-[11px] font-bold" style={{ background: t.bg, color: t.color }}>{p.tipo_servico}</span>
                  <select value={p.status} onChange={e => onUpdate(p.id, e.target.value as StatusPlan)} className="flex-1 h-8 px-2 rounded-md text-xs border border-[#E2E8F0] bg-white text-[#0F172A]">
                    {STATUS_PLAN.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button onClick={() => onRemove(p.id)} title="Remover" className="h-7 w-7 grid place-items-center rounded text-[#64748B] hover:text-[#EF4444] hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-[#E2E8F0] pt-3">
          <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold mb-2">Adicionar serviço(s)</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {[
              { label: "P",   keys: ["P"] as TipoServico[] },
              { label: "PT",  keys: ["P", "T"] as TipoServico[] },
              { label: "PC",  keys: ["P", "C"] as TipoServico[] },
              { label: "PTC", keys: ["P", "T", "C"] as TipoServico[] },
            ].map(c => (
              <button key={c.label} type="button" onClick={() => setCombo(c.keys)} className="h-7 px-2 rounded-md text-[11px] font-semibold border border-[#E2E8F0] bg-[#F8FAFC] text-[#1F4E79] hover:bg-[#EAF4FD]">
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {TIPOS.map(t => (
              <label key={t.key} className={`flex items-center gap-1.5 h-8 px-2 rounded-md border cursor-pointer text-[11px] ${selecionados[t.key] ? "border-[#1F4E79] bg-[#EAF4FD]" : "border-[#E2E8F0] bg-white"}`}>
                <input type="checkbox" checked={selecionados[t.key]} onChange={() => toggle(t.key)} className="h-3.5 w-3.5 accent-[#1F4E79]" />
                <span className="font-bold" style={{ color: t.color }}>{t.key}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <select value={status} onChange={e => setStatus(e.target.value as StatusPlan)} className="flex-1 h-8 px-2 rounded-md text-xs border border-[#E2E8F0] bg-white text-[#0F172A]">
              {STATUS_PLAN.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button onClick={handleAdd} disabled={!anySel} className="h-8 px-3 rounded-md text-xs font-medium text-white disabled:opacity-40" style={{ background: "#1F4E79" }}>
              Adicionar
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ListaMensal({
  equipamentos, planejamentos, mes, ano, onAddPlans, onUpdate, onRemove,
}: {
  equipamentos: Equipamento[];
  planejamentos: Planejamento[];
  mes: number;
  ano: number;
  onAddPlans: (eq: string, mes: number, tipos: TipoServico[], status: StatusPlan) => void;
  onUpdate: (id: string, status: StatusPlan) => void;
  onRemove: (id: string) => void;
}) {
  const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const byEq = new Map<string, Planejamento[]>();
  for (const p of planejamentos) {
    if (p.mes !== mes) continue;
    if (!byEq.has(p.equipamento_id)) byEq.set(p.equipamento_id, []);
    byEq.get(p.equipamento_id)!.push(p);
  }
  return (
    <div className="print-area">
      <div className="hidden print:block px-5 py-4 border-b border-[#E2E8F0]">
        <h1 className="text-lg font-bold text-[#0F172A]">Cronograma de Manutenções — {MESES_FULL[mes - 1]} / {ano}</h1>
      </div>
      <div className="divide-y divide-[#F1F5F9]">
        {equipamentos.map(eq => {
          const items = byEq.get(eq.id) || [];
          const desat = eq.status === "Desativado";
          return (
            <div key={eq.id} className={`px-5 py-3 flex flex-wrap items-center gap-4 ${desat ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>
              <div className="min-w-[240px] flex-1">
                <div className={`text-sm font-medium ${desat ? "line-through" : ""}`}>{eq.equipamento}</div>
                {(eq.marca || eq.modelo) && <div className="text-[11px] text-[#94A3B8]">{[eq.marca, eq.modelo].filter(Boolean).join(" • ")}</div>}
              </div>
              <div className="min-w-[140px] text-xs text-[#475569]">
                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Localização</div>
                {eq.localizacao || "—"}
              </div>
              <div className="min-w-[110px] text-xs text-[#475569]">
                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Periodicidade</div>
                {eq.periodicidade || "—"}
              </div>
              <div className="flex-1 min-w-[240px] flex flex-wrap items-center gap-1.5">
                {items.length === 0 ? (
                  <span className="text-xs text-[#94A3B8] italic">Sem serviços neste mês</span>
                ) : items.map(p => {
                  const t = TIPO_MAP[p.tipo_servico];
                  const s = STATUS_MAP[p.status];
                  return (
                    <span key={p.id} className="inline-flex items-center gap-1 h-7 pl-1.5 pr-1 rounded-md border" style={{ background: t.bg, borderColor: `${t.color}33` }}>
                      <span className="text-[11px] font-bold" style={{ color: t.color }}>{p.tipo_servico}</span>
                      <span className="text-[10px] font-medium px-1.5 h-5 rounded inline-flex items-center" style={{ background: s.color, color: "#fff" }}>{s.label}</span>
                      <select value={p.status} onChange={e => onUpdate(p.id, e.target.value as StatusPlan)} className="h-6 text-[10px] bg-transparent border-0 outline-none print:hidden">
                        {STATUS_PLAN.map(st => <option key={st.key} value={st.key}>{st.label}</option>)}
                      </select>
                      <button onClick={() => onRemove(p.id)} className="h-5 w-5 grid place-items-center rounded text-[#64748B] hover:text-[#EF4444] print:hidden">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                <div className="print:hidden">
                  <QuickAddButton onAdd={(tipos, status) => onAddPlans(eq.id, mes, tipos, status)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickAddButton({ onAdd }: { onAdd: (tipos: TipoServico[], status: StatusPlan) => void }) {
  const [open, setOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<Record<TipoServico, boolean>>({
    P: false, C: false, T: false, Q: false, AA: false, V: false,
  });
  const [status, setStatus] = useState<StatusPlan>("planejado");
  const toggle = (k: TipoServico) => setSelecionados(prev => ({ ...prev, [k]: !prev[k] }));
  const setCombo = (keys: TipoServico[]) => {
    const next = { P: false, C: false, T: false, Q: false, AA: false, V: false } as Record<TipoServico, boolean>;
    keys.forEach(k => { next[k] = true; });
    setSelecionados(next);
  };
  const handleAdd = () => {
    const tipos = (Object.keys(selecionados) as TipoServico[]).filter(k => selecionados[k]);
    if (tipos.length === 0) return;
    onAdd(tipos, status);
    setSelecionados({ P: false, C: false, T: false, Q: false, AA: false, V: false });
    setOpen(false);
  };
  const anySel = (Object.keys(selecionados) as TipoServico[]).some(k => selecionados[k]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-7 px-2 rounded-md text-[11px] font-medium border border-dashed border-[#CBD5E1] text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#1F4E79] inline-flex items-center gap-1">
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {[
            { label: "P",   keys: ["P"] as TipoServico[] },
            { label: "PT",  keys: ["P", "T"] as TipoServico[] },
            { label: "PC",  keys: ["P", "C"] as TipoServico[] },
            { label: "PTC", keys: ["P", "T", "C"] as TipoServico[] },
          ].map(c => (
            <button key={c.label} type="button" onClick={() => setCombo(c.keys)} className="h-7 px-2 rounded-md text-[11px] font-semibold border border-[#E2E8F0] bg-[#F8FAFC] text-[#1F4E79] hover:bg-[#EAF4FD]">
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {TIPOS.map(t => (
            <label key={t.key} className={`flex items-center gap-1.5 h-8 px-2 rounded-md border cursor-pointer text-[11px] ${selecionados[t.key] ? "border-[#1F4E79] bg-[#EAF4FD]" : "border-[#E2E8F0] bg-white"}`}>
              <input type="checkbox" checked={selecionados[t.key]} onChange={() => toggle(t.key)} className="h-3.5 w-3.5 accent-[#1F4E79]" />
              <span className="font-bold" style={{ color: t.color }}>{t.key}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <select value={status} onChange={e => setStatus(e.target.value as StatusPlan)} className="flex-1 h-8 px-2 rounded-md text-xs border border-[#E2E8F0] bg-white text-[#0F172A]">
            {STATUS_PLAN.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!anySel} className="h-8 px-3 rounded-md text-xs font-medium text-white disabled:opacity-40" style={{ background: "#1F4E79" }}>
            Adicionar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}