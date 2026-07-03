import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask } from "@/lib/currencyMask";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  Plus, Search, MoreHorizontal, User, Building2, Phone, Mail,
  DollarSign, MessageSquare, GripVertical, X, Pencil, Trash2, ArrowRight, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/DateInput";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Types ──────────────────────────────────────────────────────
type Origem = "Instagram" | "Facebook" | "Indicação" | "Site" | "Google" | "WhatsApp" | "Outro";
type Tipo = "Clínica" | "Hospital" | "Veterinário" | "Consultório";
type Etapa = "novo_lead" | "primeiro_contato" | "em_qualificacao" | "convertido" | "perdido";
type EmpresaInterna = "DSH" | "Dmedical";
const EMPRESAS_INTERNAS: EmpresaInterna[] = ["DSH", "Dmedical"];
const EMPRESA_INTERNA_COLORS: Record<EmpresaInterna, string> = {
  DSH: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  Dmedical: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

interface Lead {
  id: string;
  user_id: string;
  nome_cliente: string;
  empresa: string | null;
  empresa_interna: EmpresaInterna;
  telefone: string;
  email: string | null;
  origem: Origem;
  tipo: Tipo | null;
  valor_estimado: number | null;
  responsavel: string | null;
  etapa: Etapa;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

const ORIGENS: Origem[] = ["Instagram", "Facebook", "Indicação", "Site", "Google", "WhatsApp", "Outro"];
const ETAPAS: { key: Etapa; label: string; color: string }[] = [
  { key: "novo_lead", label: "Novo Lead", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { key: "primeiro_contato", label: "Primeiro Contato", color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" },
  { key: "em_qualificacao", label: "Em Qualificação", color: "bg-orange-500/20 border-orange-500/40 text-orange-300" },
  { key: "convertido", label: "Convertido", color: "bg-green-500/20 border-green-500/40 text-green-300" },
  { key: "perdido", label: "Perdido", color: "bg-zinc-500/20 border-zinc-500/40 text-zinc-400" },
];

const ORIGEM_COLORS: Record<Origem, string> = {
  Instagram: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Facebook: "bg-blue-600/20 text-blue-300 border-blue-600/30",
  Indicação: "bg-green-500/20 text-green-300 border-green-500/30",
  Site: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Google: "bg-red-500/20 text-red-300 border-red-500/30",
  WhatsApp: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Outro: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};
const TIPOS: Tipo[] = ["Clínica", "Hospital", "Veterinário", "Consultório"];
const TIPO_COLORS: Record<Tipo, string> = {
  Clínica: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  Hospital: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Veterinário: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Consultório: "bg-sky-500/20 text-sky-300 border-sky-500/30",
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const phoneMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

// ── Droppable Column ───────────────────────────────────────────
function KanbanColumn({
  etapa,
  leads,
  onCardClick,
  onEdit,
  onMoveTo,
  onDelete,
}: {
  etapa: (typeof ETAPAS)[number];
  leads: Lead[];
  onCardClick: (l: Lead) => void;
  onEdit: (l: Lead) => void;
  onMoveTo: (l: Lead, e: Etapa) => void;
  onDelete: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.key });
  const total = leads.reduce((s, l) => s + (l.valor_estimado || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-0 rounded-xl border transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : "border-border bg-card/30"
      }`}
    >
      <div className={`px-4 py-3 rounded-t-xl border-b ${etapa.color}`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{etapa.label}</span>
          <Badge variant="secondary" className="text-xs">{leads.length}</Badge>
        </div>
        <p className="text-xs mt-1 opacity-80">{formatCurrency(total)}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
              onEdit={() => onEdit(lead)}
              onMoveTo={(e) => onMoveTo(lead, e)}
              onDelete={() => onDelete(lead)}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum lead</p>
        )}
      </div>
    </div>
  );
}

// ── Sortable Card ──────────────────────────────────────────────
function SortableLeadCard({
  lead,
  onClick,
  onEdit,
  onMoveTo,
  onDelete,
}: {
  lead: Lead;
  onClick: () => void;
  onEdit: () => void;
  onMoveTo: (e: Etapa) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", etapa: lead.etapa },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <LeadCard lead={lead} onClick={onClick} onEdit={onEdit} onMoveTo={onMoveTo} onDelete={onDelete} dragListeners={listeners} />
    </div>
  );
}

function LeadCard({
  lead,
  onClick,
  onEdit,
  onMoveTo,
  onDelete,
  dragListeners,
}: {
  lead: Lead;
  onClick: () => void;
  onEdit: () => void;
  onMoveTo: (e: Etapa) => void;
  onDelete: () => void;
  dragListeners?: any;
}) {
  return (
    <Card
      className="p-3 cursor-pointer hover:border-primary/40 transition-colors bg-background/60 backdrop-blur-sm border-border/60"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button {...dragListeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{lead.nome_cliente}</p>
            {lead.empresa && <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>}
            <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 ${EMPRESA_INTERNA_COLORS[lead.empresa_interna || "DSH"]}`}>
              {lead.empresa_interna || "DSH"}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
            {ETAPAS.filter((e) => e.key !== lead.etapa).map((e) => (
              <DropdownMenuItem key={e.key} onClick={() => onMoveTo(e.key)}>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />{e.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ORIGEM_COLORS[lead.origem]}`}>
          {lead.origem}
        </Badge>
        {lead.tipo && (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIPO_COLORS[lead.tipo]}`}>
            {lead.tipo}
          </Badge>
        )}
        {(lead.valor_estimado ?? 0) > 0 && (
          <span className="text-xs text-emerald-400 font-medium">{formatCurrency(lead.valor_estimado!)}</span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          <User className="h-3 w-3" /> {lead.responsavel || "—"}
        </span>
        <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}</span>
      </div>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Vendas() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterResp, setFilterResp] = useState("all");
  const [filterOrigem, setFilterOrigem] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  // Form state
  const emptyForm = {
    nome_cliente: "", empresa: "", empresa_interna: "DSH" as EmpresaInterna, telefone: "", email: "",
    origem: "Outro" as Origem, tipo: "" as Tipo | "", valor_estimado: "", responsavel: "", observacoes: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Detail note
  const [newNote, setNewNote] = useState("");

  // Vendedores
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);

  // ── Fetch ──
  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (!error && data) setLeads(data as unknown as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Fetch vendedores ativos
  useEffect(() => {
    supabase.from("vendedores").select("id, nome").eq("ativo", true).order("nome").then(({ data }) => {
      if (data) {
        // Deduplicate by name
        const unique = [...new Map(data.map((v) => [v.nome, v])).values()];
        setVendedores(unique);
      }
    });
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  // ── Filtered leads ──
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const s = search.toLowerCase();
        if (!l.nome_cliente.toLowerCase().includes(s) && !(l.empresa || "").toLowerCase().includes(s)) return false;
      }
      if (filterResp !== "all" && l.responsavel !== filterResp) return false;
      if (filterOrigem !== "all" && l.origem !== filterOrigem) return false;
      if (filterTipo !== "all" && l.tipo !== filterTipo) return false;
      if (filterDateStart && l.created_at < filterDateStart) return false;
      if (filterDateEnd && l.created_at > filterDateEnd + "T23:59:59") return false;
      return true;
    });
  }, [leads, search, filterResp, filterOrigem, filterTipo, filterDateStart, filterDateEnd]);

  const responsaveis = useMemo(() => [...new Set(leads.map((l) => l.responsavel).filter(Boolean))], [leads]);

  // ── CRUD ──
  const handleSave = async () => {
    if (!form.nome_cliente.trim() || !form.telefone.trim() || !form.origem) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const payload = {
      nome_cliente: form.nome_cliente.trim(),
      empresa: form.empresa.trim() || null,
      empresa_interna: form.empresa_interna,
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      origem: form.origem as any,
      tipo: form.tipo ? (form.tipo as Tipo) : null,
      valor_estimado: parseCurrencyMask(form.valor_estimado) || 0,
      responsavel: form.responsavel.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };

    if (editLead) {
      const { error } = await supabase.from("leads").update(payload as any).eq("id", editLead.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Lead atualizado");
    } else {
      const { error } = await supabase.from("leads").insert({ ...payload, user_id: user!.id, etapa: "novo_lead" as any });
      if (error) { toast.error("Erro ao criar lead"); return; }
      toast.success("Lead criado");
    }
    setShowModal(false);
    setEditLead(null);
    setForm(emptyForm);
  };

  const handleMoveTo = async (lead: Lead, etapa: Etapa) => {
    await supabase.from("leads").update({ etapa: etapa as any }).eq("id", lead.id);
  };

  const handleDelete = async (lead: Lead) => {
    await supabase.from("leads").delete().eq("id", lead.id);
    toast.success("Lead excluído");
    if (detailLead?.id === lead.id) setDetailLead(null);
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({
      nome_cliente: lead.nome_cliente,
      empresa: lead.empresa || "",
      empresa_interna: (lead.empresa_interna || "DSH") as EmpresaInterna,
      telefone: lead.telefone,
      email: lead.email || "",
      origem: lead.origem,
      tipo: lead.tipo || "",
      valor_estimado: lead.valor_estimado ? numberToCurrencyMask(lead.valor_estimado) : "",
      responsavel: lead.responsavel || "",
      observacoes: lead.observacoes || "",
    });
    setShowModal(true);
  };

  const handleAddNote = async () => {
    if (!detailLead || !newNote.trim()) return;
    const now = new Date().toLocaleString("pt-BR");
    const updated = `${detailLead.observacoes || ""}\n[${now}] ${newNote.trim()}`.trim();
    await supabase.from("leads").update({ observacoes: updated } as any).eq("id", detailLead.id);
    setDetailLead({ ...detailLead, observacoes: updated });
    setNewNote("");
    toast.success("Anotação adicionada");
  };

  // ── DnD ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Determine target etapa: either the column itself or the column of the card we dropped on
    let targetEtapa: Etapa | null = null;
    const etapaMatch = ETAPAS.find((et) => et.key === overId);
    if (etapaMatch) {
      targetEtapa = etapaMatch.key;
    } else {
      // Dropped on a card — use that card's etapa
      const targetLead = leads.find((l) => l.id === overId);
      if (targetLead) {
        targetEtapa = targetLead.etapa;
      }
    }

    if (targetEtapa && lead.etapa !== targetEtapa) {
      // Optimistic update
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, etapa: targetEtapa! } : l)));
      const { error } = await supabase.from("leads").update({ etapa: targetEtapa as any }).eq("id", lead.id);
      if (error) {
        toast.error("Erro ao mover lead");
        fetchLeads(); // revert
      }
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (loading) {
    return <div className="p-6 text-muted-foreground">Carregando pipeline...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold">Pipeline de Vendas</h1>
          <Button onClick={() => { setEditLead(null); setForm(emptyForm); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Lead
          </Button>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar nome/empresa..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterResp} onValueChange={setFilterResp}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {responsaveis.map((r) => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">De</span>
            <DateInput className="w-36 h-9" value={filterDateStart} onChange={setFilterDateStart} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">até</span>
            <DateInput className="w-36 h-9" value={filterDateEnd} onChange={setFilterDateEnd} />
            {(filterDateStart || filterDateEnd) && (
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setFilterDateStart(""); setFilterDateEnd(""); }}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-min">
            {ETAPAS.map((etapa) => (
              <KanbanColumn
                key={etapa.key}
                etapa={etapa}
                leads={filtered.filter((l) => l.etapa === etapa.key)}
                onCardClick={setDetailLead}
                onEdit={openEdit}
                onMoveTo={handleMoveTo}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <div className="w-[280px]">
                <LeadCard lead={activeLead} onClick={() => {}} onEdit={() => {}} onMoveTo={() => {}} onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal — Create/Edit */}
      <Dialog open={showModal} onOpenChange={(o) => { if (!o) { setShowModal(false); setEditLead(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do cliente *</Label>
              <Input value={form.nome_cliente} onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })} />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
            </div>
            <div>
              <Label>Empresa *</Label>
              <Select value={form.empresa_interna} onValueChange={(v) => setForm({ ...form, empresa_interna: v as EmpresaInterna })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPRESAS_INTERNAS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: phoneMask(e.target.value) })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Origem *</Label>
              <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v as Origem })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo || "none"} onValueChange={(v) => setForm({ ...form, tipo: (v === "none" ? "" : v) as Tipo })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor estimado</Label>
              <Input value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: applyCurrencyMask(e.target.value) })} placeholder="R$ 0,00" />
            </div>
            <div>
              <Label>Responsável *</Label>
              <Select value={form.responsavel} onValueChange={(v) => setForm({ ...form, responsavel: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
            <Button className="w-full" onClick={handleSave}>{editLead ? "Salvar alterações" : "Cadastrar Lead"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawer — Lead Details */}
      <Sheet open={!!detailLead} onOpenChange={(o) => { if (!o) setDetailLead(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailLead && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{detailLead.nome_cliente}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {detailLead.empresa && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" /> {detailLead.empresa}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {detailLead.telefone}
                </div>
                {detailLead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {detailLead.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" /> {detailLead.responsavel || "—"}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={ORIGEM_COLORS[detailLead.origem]}>{detailLead.origem}</Badge>
                  <Badge variant="outline" className={EMPRESA_INTERNA_COLORS[detailLead.empresa_interna || "DSH"]}>
                    {detailLead.empresa_interna || "DSH"}
                  </Badge>
                  {detailLead.tipo && (
                    <Badge variant="outline" className={TIPO_COLORS[detailLead.tipo]}>{detailLead.tipo}</Badge>
                  )}
                  <Badge variant="outline" className={ETAPAS.find((e) => e.key === detailLead.etapa)?.color}>
                    {ETAPAS.find((e) => e.key === detailLead.etapa)?.label}
                  </Badge>
                </div>
                {(detailLead.valor_estimado ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <DollarSign className="h-4 w-4" /> {formatCurrency(detailLead.valor_estimado!)}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Criado {formatDistanceToNow(new Date(detailLead.created_at), { addSuffix: true, locale: ptBR })}
                </div>

                {/* Observações / Histórico */}
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Observações e Histórico
                  </h3>
                  {detailLead.observacoes ? (
                    <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {detailLead.observacoes}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma observação</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicionar anotação..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>Salvar</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
