import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import {
  FileText, CircleCheck, ClockAlert, CircleX, DollarSign, AlertTriangle,
  Plus, Pencil, RefreshCw, ExternalLink, X, FileX, FileDown, UserPlus,
} from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import {
  CATEGORIAS_CLIENTE, isValidCNPJ, maskCNPJ, isValidEmail,
} from "@/lib/clienteCategorias";
import {
  applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask,
} from "@/lib/currencyMask";
import { abrirComprovantePDF } from "@/lib/contratoComprovante";

type TipoContrato = "Clínica" | "Consultório" | "Hospital";
type SegmentoContrato = "Humano" | "Veterinário";
type StatusContrato = "ativo" | "a_vencer" | "vencido";

interface Contrato {
  id: string;
  numero_contrato: string;
  cliente_id: string | null;
  contratos_cliente_id: string | null;
  tipo: TipoContrato;
  segmento: SegmentoContrato | null;
  equipamentos_cobertos: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor_mensal: number | null;
  valor_anual: number | null;
  valor_contrato: number | null;
  parcelas: number | null;
  data_faturamento: string | null;
  data_vencimento: string | null;
  retem_iss: boolean | null;
  servico_contratado: string | null;
  status_manual: string | null;
  responsavel_comercial: string | null;
  drive_url: string | null;
  observacoes: string | null;
  created_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
}

interface ContratoCliente {
  id: string;
  nome: string;
  cnpj: string | null;
  categoria: string | null;
  responsavel_financeiro: string | null;
  email: string | null;
}

const TIPO_LABEL: Record<TipoContrato, string> = {
  "Clínica": "Clínica",
  "Consultório": "Consultório",
  "Hospital": "Hospital",
};

const SEGMENTO_LABEL: Record<SegmentoContrato, string> = {
  "Humano": "Humano",
  "Veterinário": "Veterinário",
};

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function statusFromVigencia(vigencia_fim: string): StatusContrato {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = parseDate(vigencia_fim);
  const diff = Math.floor((fim.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "a_vencer";
  return "ativo";
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function addDaysISO(s: string, days: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const STATUS_STYLE: Record<StatusContrato, { bg: string; color: string; label: string }> = {
  ativo: { bg: "#DCFCE7", color: "#15803D", label: "Ativo" },
  a_vencer: { bg: "#FEF3C7", color: "#B45309", label: "A vencer" },
  vencido: { bg: "#FEE2E2", color: "#B91C1C", label: "Vencido" },
};

export default function Contratos() {
  const { user, displayName } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<ContratoCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCliente, setFilterCliente] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | StatusContrato>("");
  const [filterResp, setFilterResp] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Contrato | null>(null);
  const [renewItem, setRenewItem] = useState<Contrato | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [fNumero, setFNumero] = useState("");
  const [clienteMode, setClienteMode] = useState<"existing" | "new">("existing");
  const [fClienteId, setFClienteId] = useState<string>("");
  const [fClienteNome, setFClienteNome] = useState("");
  const [fClienteCNPJ, setFClienteCNPJ] = useState("");
  const [fClienteResp, setFClienteResp] = useState("");
  const [fClienteEmail, setFClienteEmail] = useState("");

  const [fTipo, setFTipo] = useState<TipoContrato>("Clínica");
  const [fSegmento, setFSegmento] = useState<SegmentoContrato>("Humano");
  const [fEquip, setFEquip] = useState("");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");
  const [fMensal, setFMensal] = useState<string>("");      // masked
  const [fAnual, setFAnual] = useState<string>("");        // masked
  const [fAnualTouched, setFAnualTouched] = useState(false);
  const [fValorContrato, setFValorContrato] = useState(""); // masked
  const [fParcelas, setFParcelas] = useState<string>("");
  const [fDataFat, setFDataFat] = useState("");
  const [fDataVenc, setFDataVenc] = useState("");
  const [fRetemISS, setFRetemISS] = useState(false);
  const [fServico, setFServico] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fResp, setFResp] = useState("");
  const [fDrive, setFDrive] = useState("");
  const [fObs, setFObs] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cRes, clRes] = await Promise.all([
      supabase.from("contratos").select("*").order("created_at", { ascending: false }),
      supabase.from("contratos_clientes" as any).select("*").order("nome"),
    ]);
    if (cRes.error) toast.error("Erro ao carregar contratos");
    else setContratos((cRes.data || []) as any);
    if (!clRes.error) setClientes((clRes.data || []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clienteMap = useMemo(() => {
    const m = new Map<string, ContratoCliente>();
    clientes.forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  const enriched = useMemo(() => contratos.map(c => {
    const cli = c.contratos_cliente_id ? clienteMap.get(c.contratos_cliente_id) : null;
    return {
      ...c,
      status: statusFromVigencia(c.vigencia_fim),
      cliente_nome: cli?.nome || "—",
      cliente_obj: cli || null,
    };
  }), [contratos, clienteMap]);

  const filtered = useMemo(() => enriched.filter(c => {
    if (filterCliente && c.contratos_cliente_id !== filterCliente) return false;
    if (filterTipo && c.tipo !== filterTipo) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterResp && !(c.responsavel_comercial || "").toLowerCase().includes(filterResp.toLowerCase())) return false;
    return true;
  }), [enriched, filterCliente, filterTipo, filterStatus, filterResp]);

  const kpis = useMemo(() => {
    const total = enriched.length;
    const ativos = enriched.filter(c => c.status === "ativo").length;
    const aVencer = enriched.filter(c => c.status === "a_vencer").length;
    const vencidos = enriched.filter(c => c.status === "vencido").length;
    const valorMensal = enriched
      .filter(c => c.status === "ativo")
      .reduce((s, c) => s + (Number(c.valor_mensal) || 0), 0);
    return { total, ativos, aVencer, vencidos, valorMensal };
  }, [enriched]);

  function resetForm() {
    setShowForm(false); setEditItem(null); setRenewItem(null);
    setFNumero("");
    setClienteMode("existing");
    setFClienteId(""); setFClienteNome(""); setFClienteCNPJ("");
    setFClienteResp(""); setFClienteEmail("");
    setFTipo("Clínica"); setFEquip("");
    setFSegmento("Humano");
    setFIni(""); setFFim(""); setFMensal(""); setFAnual(""); setFAnualTouched(false);
    setFValorContrato(""); setFParcelas(""); setFDataFat(""); setFDataVenc("");
    setFRetemISS(false); setFServico(""); setFStatus("");
    setFResp(""); setFDrive(""); setFObs("");
  }

  async function generateNextContractNumber(): Promise<string> {
    const ano = new Date().getFullYear();
    const prefix = `CTR-${ano}-`;
    const { data } = await supabase
      .from("contratos")
      .select("numero_contrato")
      .ilike("numero_contrato", `${prefix}%`)
      .order("numero_contrato", { ascending: false })
      .limit(1);
    let next = 1;
    if (data && data.length > 0) {
      const last = data[0].numero_contrato as string;
      const seq = parseInt(last.slice(prefix.length), 10);
      if (Number.isFinite(seq)) next = seq + 1;
    }
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  async function openNew() {
    resetForm();
    const num = await generateNextContractNumber();
    setFNumero(num);
    if (clientes.length === 0) setClienteMode("new");
    setShowForm(true);
  }

  function openEdit(c: Contrato) {
    setEditItem(c); setRenewItem(null);
    setFNumero(c.numero_contrato);
    setClienteMode("existing");
    setFClienteId(c.contratos_cliente_id || "");
    setFTipo((["Clínica","Consultório","Hospital"].includes(c.tipo as string) ? c.tipo : "Clínica") as TipoContrato);
    setFSegmento(((c as any).segmento === "Veterinário" || (c.tipo as string) === "Veterinário") ? "Veterinário" : "Humano");
    setFEquip(c.equipamentos_cobertos || "");
    setFIni(c.vigencia_inicio);
    setFFim(c.vigencia_fim);
    setFMensal(c.valor_mensal != null ? numberToCurrencyMask(c.valor_mensal) : "");
    setFAnual(c.valor_anual != null ? numberToCurrencyMask(c.valor_anual) : "");
    setFAnualTouched(true);
    setFValorContrato(c.valor_contrato != null ? numberToCurrencyMask(c.valor_contrato) : "");
    setFParcelas(c.parcelas != null ? String(c.parcelas) : "");
    setFDataFat(c.data_faturamento || "");
    setFDataVenc(c.data_vencimento || "");
    setFRetemISS(!!c.retem_iss);
    setFServico(c.servico_contratado || "");
    setFStatus(c.status_manual || "");
    setFResp(c.responsavel_comercial || "");
    setFDrive(c.drive_url || "");
    setFObs(c.observacoes || "");
    setShowForm(true);
  }

  async function openRenew(c: Contrato) {
    setEditItem(null); setRenewItem(c);
    const num = await generateNextContractNumber();
    setFNumero(num);
    setClienteMode("existing");
    setFClienteId(c.contratos_cliente_id || "");
    setFTipo((["Clínica","Consultório","Hospital"].includes(c.tipo as string) ? c.tipo : "Clínica") as TipoContrato);
    setFSegmento(((c as any).segmento === "Veterinário" || (c.tipo as string) === "Veterinário") ? "Veterinário" : "Humano");
    setFEquip(c.equipamentos_cobertos || "");
    const novoIni = addDaysISO(c.vigencia_fim, 1);
    setFIni(novoIni);
    setFFim(addDaysISO(novoIni, 365));
    setFMensal(c.valor_mensal != null ? numberToCurrencyMask(c.valor_mensal) : "");
    setFAnual(c.valor_anual != null ? numberToCurrencyMask(c.valor_anual) : "");
    setFAnualTouched(true);
    setFValorContrato(c.valor_contrato != null ? numberToCurrencyMask(c.valor_contrato) : "");
    setFParcelas(c.parcelas != null ? String(c.parcelas) : "");
    setFRetemISS(!!c.retem_iss);
    setFServico(c.servico_contratado || "");
    setFResp(c.responsavel_comercial || "");
    setFDrive(c.drive_url || "");
    setFObs(c.observacoes || "");
    setShowForm(true);
  }

  function onMensalChange(v: string) {
    const masked = applyCurrencyMask(v);
    setFMensal(masked);
    if (!fAnualTouched) {
      const n = parseCurrencyMask(masked);
      setFAnual(n ? numberToCurrencyMask(n * 12) : "");
    }
  }

  function buildComprovanteFrom(c: Contrato) {
    const cli = c.contratos_cliente_id ? clienteMap.get(c.contratos_cliente_id) : null;
    const valor = c.valor_contrato ?? null;
    const parc = c.parcelas ?? null;
    abrirComprovantePDF({
      numero_contrato: c.numero_contrato,
      cliente_nome: cli?.nome || "—",
      cliente_cnpj: cli?.cnpj,
      cliente_categoria: cli?.categoria,
      cliente_email: cli?.email,
      cliente_responsavel_financeiro: cli?.responsavel_financeiro,
      tipo_label: TIPO_LABEL[c.tipo] || (c.tipo as string),
      status_label: c.status_manual || STATUS_STYLE[statusFromVigencia(c.vigencia_fim)].label,
      servico_contratado: c.servico_contratado,
      equipamentos_cobertos: c.equipamentos_cobertos,
      data_faturamento: c.data_faturamento,
      data_vencimento: c.data_vencimento,
      vigencia_inicio: c.vigencia_inicio,
      vigencia_fim: c.vigencia_fim,
      valor_contrato: valor,
      parcelas: parc,
      valor_parcela: valor && parc ? valor / parc : null,
      valor_mensal: c.valor_mensal,
      valor_anual: c.valor_anual,
      retem_iss: c.retem_iss,
      responsavel_comercial: c.responsavel_comercial,
      observacoes: c.observacoes,
      drive_url: c.drive_url,
      created_at: c.created_at,
      created_by_name: c.created_by_name,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validations
    if (!fNumero.trim() || !fIni || !fFim) {
      toast.error("Preencha número e vigência");
      return;
    }
    if (parseDate(fFim) <= parseDate(fIni)) {
      toast.error("Data Fim deve ser maior que Data Início");
      return;
    }

    let clienteId = fClienteId;

    if (clienteMode === "new") {
      if (!fClienteNome.trim()) { toast.error("Informe o nome do cliente"); return; }
      if (fClienteCNPJ && !isValidCNPJ(fClienteCNPJ)) { toast.error("CNPJ inválido"); return; }
      if (fClienteEmail && !isValidEmail(fClienteEmail)) { toast.error("E-mail inválido"); return; }
    } else if (!clienteId) {
      toast.error("Selecione um cliente ou cadastre um novo");
      return;
    }

    setSaving(true);

    // Create cliente if needed
    if (clienteMode === "new") {
      const { data: novoCli, error: cliErr } = await (supabase
        .from("contratos_clientes" as any) as any)
        .insert({
          nome: fClienteNome.trim(),
          cnpj: fClienteCNPJ ? maskCNPJ(fClienteCNPJ) : null,
          responsavel_financeiro: fClienteResp || null,
          email: fClienteEmail || null,
          created_by: user?.id || null,
        })
        .select("*")
        .single();
      if (cliErr || !novoCli) {
        setSaving(false);
        toast.error("Erro ao cadastrar cliente: " + (cliErr?.message || ""));
        return;
      }
      clienteId = (novoCli as any).id;
    }

    const valorContrato = fValorContrato ? parseCurrencyMask(fValorContrato) : null;
    const parcelasNum = fParcelas ? parseInt(fParcelas, 10) : null;

    const payload: any = {
      numero_contrato: fNumero.trim(),
      contratos_cliente_id: clienteId || null,
      tipo: fTipo,
      segmento: fSegmento,
      equipamentos_cobertos: fEquip || null,
      servico_contratado: fServico || null,
      vigencia_inicio: fIni,
      vigencia_fim: fFim,
      data_faturamento: fDataFat || null,
      data_vencimento: fDataVenc || null,
      valor_contrato: valorContrato,
      parcelas: parcelasNum,
      valor_mensal: fMensal ? parseCurrencyMask(fMensal) : null,
      valor_anual: fAnual ? parseCurrencyMask(fAnual) : null,
      retem_iss: fRetemISS,
      status_manual: fStatus || null,
      responsavel_comercial: fResp || null,
      drive_url: fDrive || null,
      observacoes: fObs || null,
    };

    if (!editItem) {
      payload.created_by = user?.id || null;
      payload.created_by_name = displayName || user?.email || null;
    }

    let savedRow: any = null;
    let error: any = null;
    if (editItem) {
      const r = await supabase.from("contratos").update(payload).eq("id", editItem.id).select("*").single();
      error = r.error; savedRow = r.data;
    } else {
      const r = await supabase.from("contratos").insert(payload).select("*").single();
      error = r.error; savedRow = r.data;
    }
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Número de contrato já existe" : "Erro ao salvar contrato");
      return;
    }
    toast.success(editItem ? "Contrato atualizado" : renewItem ? "Contrato renovado" : "Contrato cadastrado");
    resetForm();
    await fetchData();

    // Offer comprovante for new/renewed contracts
    if (!editItem && savedRow) {
      setTimeout(() => buildComprovanteFrom(savedRow as Contrato), 200);
    }
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Contratos</h1>
          <p className="text-sm text-[#64748B]">Gestão administrativa da carteira de contratos.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-sm font-medium text-white transition hover:brightness-110"
          style={{ background: "#50B9EC" }}
        >
          <Plus className="h-4 w-4" /> Novo contrato
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<FileText className="h-5 w-5" />} color="#0F172A" label="Total de contratos" value={kpis.total} />
        <KpiCard icon={<CircleCheck className="h-5 w-5" />} color="#35AA72" label="Ativos" value={kpis.ativos} />
        <KpiCard icon={<ClockAlert className="h-5 w-5" />} color="#F59E0B" label="A vencer (30d)" value={kpis.aVencer} />
        <KpiCard icon={<CircleX className="h-5 w-5" />} color="#F43F5E" label="Vencidos" value={kpis.vencidos} />
        <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: "#1F4E79" }}>
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-white/70">Valor sob gestão</div>
            <DollarSign className="h-5 w-5 text-white/80" />
          </div>
          <div className="mt-1 text-2xl font-bold" style={{ color: "#50B9EC" }}>{fmtBRL(kpis.valorMensal)}</div>
          <div className="text-[11px] text-white/70 mt-0.5">receita mensal recorrente</div>
        </div>
      </div>

      {/* Alerta */}
      {kpis.aVencer > 0 && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: "#FEF3C7", border: "1px solid #F59E0B" }}
        >
          <AlertTriangle className="h-5 w-5" style={{ color: "#B45309" }} />
          <div className="flex-1 text-sm text-[#78350F]">
            <strong>{kpis.aVencer}</strong> contrato(s) vencem nos próximos 30 dias — providencie a renovação.
          </div>
          <button
            onClick={() => setFilterStatus("a_vencer")}
            className="text-sm font-medium underline"
            style={{ color: "#B45309" }}
          >
            Ver contratos
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-xl border border-[#E2E8F0]">
        <select
          value={filterCliente}
          onChange={e => setFilterCliente(e.target.value)}
          className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]"
        >
          <option value="">Cliente: todos</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]"
        >
          <option value="">Tipo: todos</option>
          {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]"
        >
          <option value="">Status: todos</option>
          <option value="ativo">Ativo</option>
          <option value="a_vencer">A vencer</option>
          <option value="vencido">Vencido</option>
        </select>
        <input
          value={filterResp}
          onChange={e => setFilterResp(e.target.value)}
          placeholder="Responsável"
          className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]"
        />
        <button
          onClick={() => { setFilterCliente(""); setFilterTipo(""); setFilterStatus(""); setFilterResp(""); }}
          className="h-9 px-4 rounded-[10px] text-sm font-medium text-white transition hover:brightness-110"
          style={{ background: "#25598C" }}
        >
          Limpar
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-[#0F172A]">Carteira de contratos</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <FileX className="h-12 w-12 mb-3" style={{ color: "#94A3B8" }} />
            <p className="text-sm text-[#64748B] mb-4">
              {contratos.length === 0 ? "Nenhum contrato cadastrado ainda." : "Nenhum contrato encontrado com esses filtros."}
            </p>
            {contratos.length === 0 && (
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-[10px] text-sm font-medium text-white"
                style={{ background: "#1F4E79" }}
              >
                <Plus className="h-4 w-4" /> Cadastrar primeiro contrato
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Nº</th>
                  <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-medium">Equipamentos</th>
                  <th className="text-left px-4 py-2.5 font-medium">Vigência</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor/mês</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = STATUS_STYLE[c.status];
                  return (
                    <tr key={c.id} className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{c.numero_contrato}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-[#475569]">{TIPO_LABEL[c.tipo] || (c.tipo as string) || "—"}</td>
                      <td className="px-4 py-3 text-[#475569] max-w-[260px] truncate" title={c.equipamentos_cobertos || ""}>
                        {c.equipamentos_cobertos || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                        {fmtDate(c.vigencia_inicio)} → {fmtDate(c.vigencia_fim)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#0F172A] whitespace-nowrap">{fmtBRL(c.valor_mensal)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => buildComprovanteFrom(c)}
                            title="Visualizar PDF"
                            className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#1F4E79]"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => c.drive_url && window.open(c.drive_url, "_blank")}
                            disabled={!c.drive_url}
                            title={c.drive_url ? "Abrir Drive" : "Sem link"}
                            className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Editar"
                            className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openRenew(c)}
                            title="Renovar"
                            className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#DCFCE7] hover:text-[#15803D]"
                          >
                            <RefreshCw className="h-4 w-4" />
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 grid place-items-center p-4" onClick={resetForm}>
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <h3 className="text-base font-semibold text-[#0F172A]">
                {renewItem ? "Renovar contrato" : editItem ? "Editar contrato" : "Novo contrato"}
              </h3>
              <button type="button" onClick={resetForm} className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Número do contrato (automático)">
                <input
                  value={fNumero}
                  readOnly
                  className="form-input"
                  style={{ background: "#F1F5F9", cursor: "not-allowed", fontWeight: 600 }}
                />
              </Field>
              <Field label="Status">
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="form-input">
                  <option value="">Automático (vigência)</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Suspenso">Suspenso</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Renegociação">Renegociação</option>
                </select>
              </Field>

              {/* Cliente block */}
              <div className="md:col-span-2 rounded-xl border border-[#E2E8F0] p-3 bg-[#F8FAFC]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-semibold text-[#1F4E79] uppercase tracking-wide">Cliente</span>
                  <div className="ml-auto inline-flex rounded-[10px] bg-white border border-[#E2E8F0] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setClienteMode("existing")}
                      className={`px-3 h-8 text-xs font-medium ${clienteMode === "existing" ? "bg-[#1F4E79] text-white" : "text-[#475569]"}`}
                    >
                      Selecionar existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setClienteMode("new")}
                      className={`px-3 h-8 text-xs font-medium inline-flex items-center gap-1 ${clienteMode === "new" ? "bg-[#1F4E79] text-white" : "text-[#475569]"}`}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Cadastrar novo
                    </button>
                  </div>
                </div>

                {clienteMode === "existing" ? (
                  <Field label="Cliente">
                    {clientes.length === 0 ? (
                      <div className="text-[12px] text-[#64748B] bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-md px-3 py-2">
                        Nenhum cliente cadastrado ainda. Clique em <strong>+ Novo</strong> acima para cadastrar o primeiro.
                      </div>
                    ) : (
                      <select value={fClienteId} onChange={e => setFClienteId(e.target.value)} className="form-input">
                        <option value="">Selecione...</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome}{c.cnpj ? ` — ${c.cnpj}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Nome do cliente *">
                      <input value={fClienteNome} onChange={e => setFClienteNome(e.target.value)} className="form-input" required={clienteMode === "new"} />
                    </Field>
                    <Field label="CNPJ">
                      <input
                        value={fClienteCNPJ}
                        onChange={e => setFClienteCNPJ(maskCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        className="form-input"
                      />
                    </Field>
                    <Field label="Responsável Financeiro">
                      <input value={fClienteResp} onChange={e => setFClienteResp(e.target.value)} className="form-input" />
                    </Field>
                    <Field label="E-mail" className="md:col-span-2">
                      <input type="email" value={fClienteEmail} onChange={e => setFClienteEmail(e.target.value)} className="form-input" />
                    </Field>
                  </div>
                )}
              </div>

              <Field label="Tipo">
                <select value={fTipo} onChange={e => setFTipo(e.target.value as TipoContrato)} className="form-input">
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Segmento">
                <select value={fSegmento} onChange={e => setFSegmento(e.target.value as SegmentoContrato)} className="form-input">
                  {Object.entries(SEGMENTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Responsável comercial">
                <input value={fResp} onChange={e => setFResp(e.target.value)} className="form-input" />
              </Field>
              <Field label="Serviço contratado" className="md:col-span-2">
                <input value={fServico} onChange={e => setFServico(e.target.value)} className="form-input" placeholder="Ex: Manutenção preventiva mensal" />
              </Field>
              <Field label="Equipamentos cobertos" className="md:col-span-2">
                <textarea value={fEquip} onChange={e => setFEquip(e.target.value)} rows={2} className="form-input" />
              </Field>
              <Field label="Vigência início">
                <input type="date" value={fIni} onChange={e => setFIni(e.target.value)} required className="form-input" />
              </Field>
              <Field label="Vigência fim">
                <input type="date" value={fFim} onChange={e => setFFim(e.target.value)} required className="form-input" />
              </Field>
              <Field label="Data de faturamento">
                <input type="date" value={fDataFat} onChange={e => setFDataFat(e.target.value)} className="form-input" />
              </Field>
              <Field label="Data de vencimento">
                <input type="date" value={fDataVenc} onChange={e => setFDataVenc(e.target.value)} className="form-input" />
              </Field>
              <Field label="Valor do contrato">
                <input
                  inputMode="numeric"
                  value={fValorContrato}
                  onChange={e => setFValorContrato(applyCurrencyMask(e.target.value))}
                  placeholder="R$ 0,00"
                  className="form-input"
                />
              </Field>
              <Field label="Parcelas">
                <input
                  type="number" min="1" step="1"
                  value={fParcelas}
                  onChange={e => setFParcelas(e.target.value)}
                  className="form-input"
                />
                {fValorContrato && fParcelas && parseInt(fParcelas) > 0 && (
                  <div className="text-[11px] text-[#64748B] mt-1">
                    Valor por parcela: <strong>{fmtBRL(parseCurrencyMask(fValorContrato) / parseInt(fParcelas))}</strong>
                  </div>
                )}
              </Field>
              <Field label="Valor mensal">
                <input
                  inputMode="numeric"
                  value={fMensal}
                  onChange={e => onMensalChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className="form-input"
                />
              </Field>
              <Field label="Valor anual">
                <input
                  inputMode="numeric"
                  value={fAnual}
                  onChange={e => { setFAnual(applyCurrencyMask(e.target.value)); setFAnualTouched(true); }}
                  placeholder="R$ 0,00"
                  className="form-input"
                />
              </Field>
              <Field label="Retém ISS?" className="md:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer h-10">
                  <input type="checkbox" checked={fRetemISS} onChange={e => setFRetemISS(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm text-[#475569]">Sim, retém ISS sobre a nota fiscal</span>
                </label>
              </Field>
              <Field label="Link do Contrato" className="md:col-span-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={fDrive}
                    onChange={e => setFDrive(e.target.value)}
                    placeholder="https://..."
                    className="form-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => fDrive && window.open(fDrive, "_blank")}
                    disabled={!fDrive}
                    title="Testar link"
                    className="h-10 w-10 grid place-items-center rounded-[10px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C] disabled:opacity-40"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </Field>
              <Field label="Observações" className="md:col-span-2">
                <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={3} className="form-input" />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 rounded-[10px] text-sm font-medium border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 rounded-[10px] text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
                style={{ background: renewItem ? "#35AA72" : "#1F4E79" }}
              >
                {renewItem ? "Confirmar renovação" : "Salvar contrato"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .form-input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          color: #0F172A;
          outline: none;
          transition: border-color .15s;
        }
        textarea.form-input { height: auto; padding: 10px 12px; resize: vertical; }
        .form-input:focus { border-color: #50B9EC; box-shadow: 0 0 0 3px rgba(80,185,236,0.15); }
      `}</style>
    </div>
  );
}

function KpiCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number }) {
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