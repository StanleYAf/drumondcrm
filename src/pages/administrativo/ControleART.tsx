import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import {
  FileBadge, CircleCheck, ClockAlert, CircleX, AlertTriangle,
  Plus, Pencil, ExternalLink, X, FileX,
} from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { DateInput } from "@/components/DateInput";

type StatusART = "ativo" | "a_vencer" | "vencido";

interface ART {
  id: string;
  numero_art: string;
  responsavel_tecnico: string;
  crea_cau: string | null;
  cliente: string | null;
  descricao_servico: string | null;
  data_emissao: string;
  data_vencimento: string;
  valor: number | null;
  drive_url: string | null;
  observacoes: string | null;
  created_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function statusFromVencimento(data_vencimento: string): StatusART {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = parseDate(data_vencimento);
  const diff = Math.floor((fim.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "a_vencer";
  return "ativo";
}

function fmtDate(s: string): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_STYLE: Record<StatusART, { bg: string; color: string; label: string }> = {
  ativo:    { bg: "#DCFCE7", color: "#15803D", label: "Ativo" },
  a_vencer: { bg: "#FEF3C7", color: "#B45309", label: "A vencer" },
  vencido:  { bg: "#FEE2E2", color: "#B91C1C", label: "Vencida" },
};

export default function ControleART() {
  const { user, displayName } = useAuth();
  const [arts, setArts] = useState<ART[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCliente, setFilterCliente] = useState("");
  const [filterResp, setFilterResp] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | StatusART>("");

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ART | null>(null);
  const [saving, setSaving] = useState(false);

  const [fNumero, setFNumero] = useState("");
  const [fResp, setFResp] = useState("");
  const [fCrea, setFCrea] = useState("");
  const [fCliente, setFCliente] = useState("");
  const [fDescricao, setFDescricao] = useState("");
  const [fEmissao, setFEmissao] = useState("");
  const [fVencimento, setFVencimento] = useState("");
  const [fValor, setFValor] = useState("");
  const [fDrive, setFDrive] = useState("");
  const [fObs, setFObs] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("controle_art" as any)
      .select("*")
      .order("data_vencimento", { ascending: true });
    if (error) toast.error("Erro ao carregar ARTs");
    else setArts((data || []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const enriched = useMemo(() => arts.map(a => ({
    ...a,
    status: statusFromVencimento(a.data_vencimento),
  })), [arts]);

  const filtered = useMemo(() => enriched.filter(a => {
    if (filterCliente && !(a.cliente || "").toLowerCase().includes(filterCliente.toLowerCase())) return false;
    if (filterResp && !(a.responsavel_tecnico || "").toLowerCase().includes(filterResp.toLowerCase())) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  }), [enriched, filterCliente, filterResp, filterStatus]);

  const kpis = useMemo(() => ({
    total:   enriched.length,
    ativas:  enriched.filter(a => a.status === "ativo").length,
    aVencer: enriched.filter(a => a.status === "a_vencer").length,
    vencidas: enriched.filter(a => a.status === "vencido").length,
  }), [enriched]);

  function resetForm() {
    setShowForm(false); setEditItem(null);
    setFNumero(""); setFResp(""); setFCrea(""); setFCliente("");
    setFDescricao(""); setFEmissao(""); setFVencimento("");
    setFValor(""); setFDrive(""); setFObs("");
  }

  function openNew() { resetForm(); setShowForm(true); }

  function openEdit(a: ART) {
    setEditItem(a);
    setFNumero(a.numero_art);
    setFResp(a.responsavel_tecnico);
    setFCrea(a.crea_cau || "");
    setFCliente(a.cliente || "");
    setFDescricao(a.descricao_servico || "");
    setFEmissao(a.data_emissao);
    setFVencimento(a.data_vencimento);
    setFValor(a.valor != null ? String(a.valor) : "");
    setFDrive(a.drive_url || "");
    setFObs(a.observacoes || "");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fNumero.trim() || !fResp.trim() || !fEmissao || !fVencimento) {
      toast.error("Preencha número, responsável e datas");
      return;
    }
    setSaving(true);
    const payload: any = {
      numero_art: fNumero.trim(),
      responsavel_tecnico: fResp.trim(),
      crea_cau: fCrea || null,
      cliente: fCliente || null,
      descricao_servico: fDescricao || null,
      data_emissao: fEmissao,
      data_vencimento: fVencimento,
      valor: fValor ? parseFloat(fValor.replace(",", ".")) : null,
      drive_url: fDrive || null,
      observacoes: fObs || null,
    };
    if (!editItem) {
      payload.created_by = user?.id || null;
      payload.created_by_name = displayName || user?.email || null;
    }
    let error: any = null;
    if (editItem) {
      const r = await (supabase.from("controle_art" as any) as any).update(payload).eq("id", editItem.id);
      error = r.error;
    } else {
      const r = await (supabase.from("controle_art" as any) as any).insert(payload);
      error = r.error;
    }
    setSaving(false);
    if (error) { toast.error("Erro ao salvar ART: " + error.message); return; }
    toast.success(editItem ? "ART atualizada" : "ART cadastrada");
    resetForm();
    await fetchData();
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Controle de ART</h1>
          <p className="text-sm text-[#64748B] mt-1">Acompanhamento de vencimento de Anotações de Responsabilidade Técnica.</p>
        </div>
        <button onClick={openNew} className="h-10 px-5 rounded-[10px] text-sm font-medium text-white inline-flex items-center gap-2 hover:brightness-110" style={{ background: "#1F4E79" }}>
          <Plus className="h-4 w-4" /> Nova ART
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<FileBadge className="h-5 w-5" />} color="#0F172A" label="Total de ARTs" value={kpis.total} />
        <KpiCard icon={<CircleCheck className="h-5 w-5" />} color="#35AA72" label="Ativas" value={kpis.ativas} />
        <KpiCard icon={<ClockAlert className="h-5 w-5" />} color="#F59E0B" label="A vencer (30d)" value={kpis.aVencer} />
        <KpiCard icon={<CircleX className="h-5 w-5" />} color="#F43F5E" label="Vencidas" value={kpis.vencidas} />
      </div>

      {/* Alerta */}
      {kpis.aVencer > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
          <AlertTriangle className="h-5 w-5" style={{ color: "#B45309" }} />
          <div className="flex-1 text-sm" style={{ color: "#92400E" }}>
            {kpis.aVencer} ART(s) vencem nos próximos 30 dias — providencie a renovação.
          </div>
          <button onClick={() => setFilterStatus("a_vencer")} className="text-sm font-medium underline" style={{ color: "#B45309" }}>
            Ver ARTs
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={filterCliente} onChange={e => setFilterCliente(e.target.value)} placeholder="Cliente" className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]" />
        <input value={filterResp} onChange={e => setFilterResp(e.target.value)} placeholder="Responsável técnico" className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="h-9 px-3 rounded-[10px] text-sm border border-[#E2E8F0] bg-white text-[#0F172A]">
          <option value="">Status: todos</option>
          <option value="ativo">Ativa</option>
          <option value="a_vencer">A vencer</option>
          <option value="vencido">Vencida</option>
        </select>
        <button onClick={() => { setFilterCliente(""); setFilterResp(""); setFilterStatus(""); }} className="h-9 px-4 rounded-[10px] text-sm font-medium text-white" style={{ background: "#25598C" }}>
          Limpar
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-[#0F172A]">ARTs cadastradas</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileX className="h-10 w-10 mx-auto text-[#94A3B8]" />
            <div className="mt-3 text-sm text-[#64748B]">
              {arts.length === 0 ? "Nenhuma ART cadastrada ainda." : "Nenhuma ART encontrada com esses filtros."}
            </div>
            {arts.length === 0 && (
              <button onClick={openNew} className="mt-4 h-10 px-5 rounded-[10px] text-sm font-medium text-white inline-flex items-center gap-2" style={{ background: "#1F4E79" }}>
                <Plus className="h-4 w-4" /> Cadastrar primeira ART
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#475569] text-[12px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Nº ART</th>
                  <th className="text-left px-4 py-3">Responsável Técnico</th>
                  <th className="text-left px-4 py-3">CREA/CAU</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Emissão</th>
                  <th className="text-left px-4 py-3">Vencimento</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const st = STATUS_STYLE[a.status];
                  return (
                    <tr key={a.id} className="border-t border-[#F1F5F9] text-[#0F172A]">
                      <td className="px-4 py-3 font-medium">{a.numero_art}</td>
                      <td className="px-4 py-3">{a.responsavel_tecnico}</td>
                      <td className="px-4 py-3">{a.crea_cau || "—"}</td>
                      <td className="px-4 py-3">{a.cliente || "—"}</td>
                      <td className="px-4 py-3">{fmtDate(a.data_emissao)}</td>
                      <td className="px-4 py-3">{fmtDate(a.data_vencimento)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => a.drive_url && window.open(a.drive_url, "_blank")} disabled={!a.drive_url} title={a.drive_url ? "Abrir Drive" : "Sem link"} className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C] disabled:opacity-40 disabled:cursor-not-allowed">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(a)} title="Editar" className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#EAF4FD] hover:text-[#25598C]">
                            <Pencil className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={resetForm}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-[#0F172A]">{editItem ? "Editar ART" : "Nova ART"}</h3>
              <button type="button" onClick={resetForm} className="h-8 w-8 grid place-items-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              <Field label="Número da ART *">
                <input value={fNumero} onChange={e => setFNumero(e.target.value)} required className="form-input" placeholder="Ex: ART-2026-001" />
              </Field>
              <Field label="CREA/CAU">
                <input value={fCrea} onChange={e => setFCrea(e.target.value)} className="form-input" placeholder="Ex: CREA-MG 12345" />
              </Field>
              <Field label="Responsável técnico *">
                <input value={fResp} onChange={e => setFResp(e.target.value)} required className="form-input" />
              </Field>
              <Field label="Cliente">
                <input value={fCliente} onChange={e => setFCliente(e.target.value)} className="form-input" />
              </Field>
              <Field label="Descrição do serviço" className="md:col-span-2">
                <textarea value={fDescricao} onChange={e => setFDescricao(e.target.value)} rows={2} className="form-input" />
              </Field>
              <Field label="Data de emissão *">
                <input type="date" value={fEmissao} onChange={e => setFEmissao(e.target.value)} required className="form-input" />
              </Field>
              <Field label="Data de vencimento *">
                <input type="date" value={fVencimento} onChange={e => setFVencimento(e.target.value)} required className="form-input" />
              </Field>
              <Field label="Valor (R$)">
                <input type="number" step="0.01" min="0" value={fValor} onChange={e => setFValor(e.target.value)} placeholder="0,00" className="form-input" />
              </Field>
              <Field label="Link do documento (Drive)">
                <div className="flex gap-2">
                  <input type="url" value={fDrive} onChange={e => setFDrive(e.target.value)} placeholder="https://..." className="form-input flex-1" />
                  <button type="button" onClick={() => fDrive && window.open(fDrive, "_blank")} disabled={!fDrive} className="h-10 w-10 grid place-items-center rounded-[10px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#EAF4FD] disabled:opacity-40">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </Field>
              <Field label="Observações" className="md:col-span-2">
                <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={3} className="form-input" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E2E8F0]">
              <button type="button" onClick={resetForm} className="h-10 px-4 rounded-[10px] text-sm font-medium border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]">Cancelar</button>
              <button type="submit" disabled={saving} className="h-10 px-5 rounded-[10px] text-sm font-medium text-white hover:brightness-110 disabled:opacity-60" style={{ background: "#1F4E79" }}>
                {saving ? "Salvando..." : editItem ? "Salvar alterações" : "Cadastrar ART"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .form-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #E2E8F0; border-radius: 10px; background: white; font-size: 14px; color: #0F172A; outline: none; transition: border-color .15s; }
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