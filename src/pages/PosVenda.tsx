import { useState, useMemo, useEffect, useCallback } from "react";
import { useAppData } from "@/lib/dataContext";
import { formatDate, type PosVenda, type NotaContato } from "@/lib/types";
import { DateInput } from "@/components/DateInput";
import { Plus, X, PhoneOff, Users, ArrowUpDown, MessageSquare, Clock, Send, Archive, ArchiveRestore } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "Aguardando retorno": { color: "#FF453A", bg: "rgba(255,69,58,0.15)" },
  "Contatado": { color: "#FFD60A", bg: "rgba(255,214,10,0.15)" },
  "Convertido": { color: "#30D158", bg: "rgba(48,209,88,0.15)" },
};

const STATUSES: PosVenda["status"][] = ["Aguardando retorno", "Contatado", "Convertido"];

type SortMode = "data" | "status" | "dias";

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function lastContactDate(p: PosVenda): string {
  if (p.notas && p.notas.length > 0) {
    return p.notas[p.notas.length - 1].timestamp;
  }
  return p.data;
}

export default function PosVendaPage() {
  const { data, setData, loading, error, undoDelete } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterVendedor, setFilterVendedor] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("data");
  const [arquivados, setArquivados] = useState<Set<string>>(new Set());
  const [showArquivados, setShowArquivados] = useState(false);
  const [cliente, setCliente] = useState("");
  const [vendedor, setVendedor] = useState(data.vendedores[0] || "");
  const [status, setStatus] = useState<PosVenda["status"]>("Aguardando retorno");
  const [dataContato, setDataContato] = useState(new Date().toISOString().slice(0, 10));
  const [notaTexto, setNotaTexto] = useState("");

  const pendentes = data.pos_venda.filter(p => p.status === "Aguardando retorno").length;

  // Load archived IDs + run auto-archive on mount
  const refreshArquivados = useCallback(async () => {
    await supabase.rpc("auto_arquivar_leads_e_posvenda" as any);
    const { data: rows } = await supabase
      .from("pos_venda")
      .select("id, arquivado_em")
      .not("arquivado_em", "is", null);
    setArquivados(new Set((rows || []).map((r: any) => r.id)));
  }, []);
  useEffect(() => { refreshArquivados(); }, [refreshArquivados]);

  async function toggleArquivar(id: string) {
    const isArq = arquivados.has(id);
    const arquivado_em = isArq ? null : new Date().toISOString();
    const { error } = await supabase.from("pos_venda").update({ arquivado_em } as any).eq("id", id);
    if (error) { toast.error("Erro ao arquivar"); return; }
    setArquivados((prev) => {
      const next = new Set(prev);
      if (isArq) next.delete(id); else next.add(id);
      return next;
    });
    toast.success(isArq ? "Contato desarquivado" : "Contato arquivado");
  }

  async function handleAdd() {
    if (!cliente.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    const saved = await setData((prev) => ({
      ...prev,
      pos_venda: [...prev.pos_venda, {
        id: crypto.randomUUID(), data: dataContato, cliente: cliente.trim(),
        vendedor, status, notas: [], status_changed_at: new Date().toISOString(),
      }],
    }));
    if (!saved) return;
    setCliente(""); setShowAdd(false);
    toast.success("Contato adicionado");
  }

  async function updateStatus(id: string, newStatus: PosVenda["status"]) {
    const saved = await setData((prev) => ({
      ...prev,
      pos_venda: prev.pos_venda.map((p) => (p.id === id
        ? { ...p, status: newStatus, status_changed_at: new Date().toISOString() }
        : p
      )),
    }));
    if (!saved) return;
    toast.success(`Status atualizado para "${newStatus}"`);
  }

  async function addNota(id: string) {
    if (!notaTexto.trim()) return;
    const nota: NotaContato = {
      id: crypto.randomUUID(),
      texto: notaTexto.trim(),
      timestamp: new Date().toISOString(),
    };
    const saved = await setData((prev) => ({
      ...prev,
      pos_venda: prev.pos_venda.map((p) => (p.id === id
        ? { ...p, notas: [...(p.notas || []), nota] }
        : p
      )),
    }));
    if (!saved) return;
    setNotaTexto("");
    toast.success("Nota adicionada");
  }

  async function handleDelete(id: string) {
    const deletedItem = data.pos_venda.find(p => p.id === id);
    if (!deletedItem) return;
    const saved = await setData((prev) => ({ ...prev, pos_venda: prev.pos_venda.filter(p => p.id !== id) }));
    if (!saved) return;
    setEditId(null);
    undoDelete(id, "Contato excluído.", (prev) => ({
      ...prev, pos_venda: [...prev.pos_venda, deletedItem],
    }));
  }

  const filtered = useMemo(() => {
    let list = data.pos_venda;
    if (showArquivados) {
      list = list.filter(p => arquivados.has(p.id));
    } else {
      list = list.filter(p => !arquivados.has(p.id));
    }
    if (filterStatus !== "Todos") list = list.filter(p => p.status === filterStatus);
    if (filterVendedor) list = list.filter(p => p.vendedor === filterVendedor);

    const sorted = [...list];
    if (sortMode === "data") {
      sorted.sort((a, b) => lastContactDate(b).localeCompare(lastContactDate(a)));
    } else if (sortMode === "status") {
      const order = { "Aguardando retorno": 0, "Contatado": 1, "Convertido": 2 };
      sorted.sort((a, b) => order[a.status] - order[b.status]);
    } else {
      sorted.sort((a, b) => daysSince(a.status_changed_at || a.data) - daysSince(b.status_changed_at || b.data));
      sorted.reverse();
    }
    return sorted;
  }, [data.pos_venda, filterStatus, filterVendedor, sortMode, arquivados, showArquivados]);

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Pós-venda</h1>
          {pendentes > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FF453A', color: 'white' }}>
              {pendentes}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSortMode(s => s === "data" ? "status" : s === "status" ? "dias" : "data")}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-foreground bg-secondary">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            {sortMode === "data" ? "Data" : sortMode === "status" ? "Status" : "Dias"}
          </button>
        </div>
      </div>

      {/* Vendor Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Users className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="segmented-control">
          <button onClick={() => setFilterVendedor(null)}
            className={`segmented-btn ${!filterVendedor ? 'active' : ''}`}>
            Todos
          </button>
          {data.vendedores.map(v => (
            <button key={v} onClick={() => setFilterVendedor(v)}
              className={`segmented-btn ${filterVendedor === v ? 'active' : ''}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="segmented-control w-full overflow-x-auto no-scrollbar">
        {["Todos", ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`segmented-btn flex-1 ${filterStatus === s ? 'active' : ''}`}>
            {s === "Aguardando retorno" ? "Aguardando" : s}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={PhoneOff} title="Nenhum contato" description="Adicione contatos de pós-venda para acompanhar." />
      ) : (
        <div className="ios-list-group">
          {filtered.map(p => {
            const dias = daysSince(p.status_changed_at || p.data);
            const isOverdue = p.status === "Aguardando retorno" && dias > 7;
            const isOpen = editId === p.id;

            return (
              <div key={p.id}>
                <button className="ios-list-item w-full text-left" onClick={() => {
                  setEditId(isOpen ? null : p.id);
                  setNotaTexto("");
                }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.cliente}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {p.vendedor} · {formatDate(p.data)}
                      {(p.notas?.length ?? 0) > 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3 inline" /> {p.notas!.length}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: STATUS_CONFIG[p.status].bg, color: STATUS_CONFIG[p.status].color }}>
                      {p.status}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: isOverdue ? '#FF453A' : '#8E8E93' }}>
                      {dias}d
                    </span>
                  </div>
                </button>

                {/* Expanded Panel */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {/* Status selection */}
                    <div>
                      <p className="text-[11px] font-medium py-1.5 uppercase tracking-wide text-muted-foreground">Status</p>
                      <div className="flex gap-1.5">
                        {STATUSES.map(s => (
                          <button key={s} onClick={() => updateStatus(p.id, s)}
                            className="flex-1 py-2 rounded-xl text-xs font-medium transition"
                            style={{
                              background: p.status === s ? STATUS_CONFIG[s].bg : 'rgba(255,255,255,0.05)',
                              color: p.status === s ? STATUS_CONFIG[s].color : '#8E8E93',
                              border: p.status === s ? `1px solid ${STATUS_CONFIG[s].color}30` : '1px solid transparent',
                            }}>
                            {s === "Aguardando retorno" ? "Aguardando" : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contact Notes History */}
                    <div>
                      <p className="text-[11px] font-medium py-1.5 uppercase tracking-wide text-muted-foreground">
                        Histórico de Contato
                      </p>
                      {(p.notas && p.notas.length > 0) ? (
                        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                          {p.notas.map(n => (
                            <div key={n.id} className="p-2.5 rounded-xl" style={{ background: 'var(--border-subtle, rgba(128,128,128,0.1))', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-xs text-foreground leading-relaxed">{n.texto}</p>
                              <p className="text-[10px] mt-1 text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-0.5" />
                                {new Date(n.timestamp).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs mb-3 text-muted-foreground">Nenhuma nota registrada.</p>
                      )}

                      {/* Add Note */}
                      <div className="flex gap-2">
                        <input
                          value={notaTexto}
                          onChange={e => setNotaTexto(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addNota(p.id); }}
                          className="ios-input flex-1"
                          placeholder="Adicionar nota..."
                        />
                        <button onClick={() => addNota(p.id)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary">
                          <Send className="h-4 w-4 text-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Delete */}
                    <button onClick={() => handleDelete(p.id)}
                      className="w-full text-center py-2.5 rounded-xl text-sm font-medium"
                      style={{ color: '#FF453A', background: 'rgba(255,69,58,0.08)' }}>
                      Excluir contato
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 space-y-4 bg-popover border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Novo Contato</h3>
              <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Cliente</label>
              <input value={cliente} onChange={e => setCliente(e.target.value)} className="ios-input w-full" placeholder="Nome" />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Vendedor</label>
              <select value={vendedor} onChange={e => setVendedor(e.target.value)} className="ios-input w-full">
                {data.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as PosVenda["status"])} className="ios-input w-full">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Data</label>
              <DateInput value={dataContato} onChange={setDataContato} className="ios-input w-full" />
            </div>
            <button onClick={handleAdd} className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary">
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-20 md:bottom-8 right-5 w-14 h-14 rounded-full flex items-center justify-center z-40 shadow-lg bg-primary">
        <Plus className="h-6 w-6 text-foreground" />
      </button>
    </div>
  );
}
