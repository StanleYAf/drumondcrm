import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import {
  FileText, CircleCheck, ClockAlert, CircleX, DollarSign, AlertTriangle,
  Plus, Pencil, RefreshCw, ExternalLink, X, FileX,
} from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";

type TipoContrato = "preventivo" | "corretivo" | "full-risk" | "locacao";
type StatusContrato = "ativo" | "a_vencer" | "vencido";

interface Contrato {
  id: string;
  numero_contrato: string;
  cliente_id: string | null;
  tipo: TipoContrato;
  equipamentos_cobertos: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor_mensal: number | null;
  valor_anual: number | null;
  responsavel_comercial: string | null;
  drive_url: string | null;
  observacoes: string | null;
}

interface Cliente { id: string; nome: string }

const TIPO_LABEL: Record<TipoContrato, string> = {
  preventivo: "Preventivo",
  corretivo: "Corretivo",
  "full-risk": "Full-risk",
  locacao: "Locação",
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
  const { user } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
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
  const [fCliente, setFCliente] = useState<string>("");
  const [fTipo, setFTipo] = useState<TipoContrato>("preventivo");
  const [fEquip, setFEquip] = useState("");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");
  const [fMensal, setFMensal] = useState<string>("");
  const [fAnual, setFAnual] = useState<string>("");
  const [fAnualTouched, setFAnualTouched] = useState(false);
  const [fResp, setFResp] = useState("");
  const [fDrive, setFDrive] = useState("");
  const [fObs, setFObs] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cRes, clRes] = await Promise.all([
      supabase.from("contratos").select("*").order("vigencia_fim", { ascending: true }),
      supabase.from("clientes").select("id, nome").order("nome"),
    ]);
    if (cRes.error) toast.error("Erro ao carregar contratos");
    else setContratos((cRes.data || []) as Contrato[]);
    if (!clRes.error) setClientes((clRes.data || []) as Cliente[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clienteMap = useMemo(() => {
    const m = new Map<string, string>();
    clientes.forEach(c => m.set(c.id, c.nome));
    return m;
  }, [clientes]);

  const enriched = useMemo(() => contratos.map(c => ({
    ...c,
    status: statusFromVigencia(c.vigencia_fim),
    cliente_nome: c.cliente_id ? (clienteMap.get(c.cliente_id) || "—") : "—",
  })), [contratos, clienteMap]);

  const filtered = useMemo(() => enriched.filter(c => {
    if (filterCliente && c.cliente_id !== filterCliente) return false;
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
    setFNumero(""); setFCliente(""); setFTipo("preventivo"); setFEquip("");
    setFIni(""); setFFim(""); setFMensal(""); setFAnual(""); setFAnualTouched(false);
    setFResp(""); setFDrive(""); setFObs("");
  }

  function openNew() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(c: Contrato) {
    setEditItem(c); setRenewItem(null);
    setFNumero(c.numero_contrato);
    setFCliente(c.cliente_id || "");
    setFTipo(c.tipo);
    setFEquip(c.equipamentos_cobertos || "");
    setFIni(c.vigencia_inicio);
    setFFim(c.vigencia_fim);
    setFMensal(c.valor_mensal != null ? String(c.valor_mensal) : "");
    setFAnual(c.valor_anual != null ? String(c.valor_anual) : "");
    setFAnualTouched(true);
    setFResp(c.responsavel_comercial || "");
    setFDrive(c.drive_url || "");
    setFObs(c.observacoes || "");
    setShowForm(true);
  }

  function openRenew(c: Contrato) {
    setEditItem(null); setRenewItem(c);
    setFNumero(c.numero_contrato);
    setFCliente(c.cliente_id || "");
    setFTipo(c.tipo);
    setFEquip(c.equipamentos_cobertos || "");
    const novoIni = addDaysISO(c.vigencia_fim, 1);
    setFIni(novoIni);
    setFFim(addDaysISO(novoIni, 365));
    setFMensal(c.valor_mensal != null ? String(c.valor_mensal) : "");
    setFAnual(c.valor_anual != null ? String(c.valor_anual) : "");
    setFAnualTouched(true);
    setFResp(c.responsavel_comercial || "");
    setFDrive(c.drive_url || "");
    setFObs(c.observacoes || "");
    setShowForm(true);
  }

  function onMensalChange(v: string) {
    setFMensal(v);
    if (!fAnualTouched) {
      const n = Number(v);
      setFAnual(Number.isFinite(n) && v !== "" ? String(n * 12) : "");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fNumero.trim() || !fIni || !fFim) {
      toast.error("Preencha número e vigência");
      return;
    }
    setSaving(true);
    const payload = {
      numero_contrato: fNumero.trim(),
      cliente_id: fCliente || null,
      tipo: fTipo,
      equipamentos_cobertos: fEquip || null,
      vigencia_inicio: fIni,
      vigencia_fim: fFim,
      valor_mensal: fMensal === "" ? null : Number(fMensal),
      valor_anual: fAnual === "" ? null : Number(fAnual),
      responsavel_comercial: fResp || null,
      drive_url: fDrive || null,
      observacoes: fObs || null,
    };
    let error;
    if (editItem) {
      ({ error } = await supabase.from("contratos").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await supabase.from("contratos").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Número de contrato já existe" : "Erro ao salvar contrato");
      return;
    }
    toast.success(editItem ? "Contrato atualizado" : renewItem ? "Contrato renovado" : "Contrato cadastrado");
    resetForm();
    fetchData();
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
                      <td className="px-4 py-3 text-[#475569]">{TIPO_LABEL[c.tipo]}</td>
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
              <Field label="Número do contrato">
                <input
                  value={fNumero}
                  onChange={e => setFNumero(e.target.value)}
                  disabled={!!renewItem ? false : false}
                  required
                  className="form-input"
                />
              </Field>
              <Field label="Cliente">
                <select value={fCliente} onChange={e => setFCliente(e.target.value)} className="form-input">
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Tipo">
                <select value={fTipo} onChange={e => setFTipo(e.target.value as TipoContrato)} className="form-input">
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Responsável comercial">
                <input value={fResp} onChange={e => setFResp(e.target.value)} className="form-input" />
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
              <Field label="Valor mensal (R$)">
                <input
                  type="number" step="0.01" min="0"
                  value={fMensal}
                  onChange={e => onMensalChange(e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Valor anual (R$)">
                <input
                  type="number" step="0.01" min="0"
                  value={fAnual}
                  onChange={e => { setFAnual(e.target.value); setFAnualTouched(true); }}
                  className="form-input"
                />
              </Field>
              <Field label="Link do Drive" className="md:col-span-2">
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