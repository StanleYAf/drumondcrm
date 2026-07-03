import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Pencil, Trash2, Calendar, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/DateInput";

type Setor = "engenharia" | "comercial" | "financeiro";
type Status = "pendente" | "execucao" | "feita";
type Prioridade = "alta" | "media" | "normal" | "baixa";

interface Demanda {
  id: string;
  setor: Setor;
  titulo: string;
  descricao: string | null;
  status: Status;
  prioridade: Prioridade;
  responsavel_id: string;
  criado_por: string;
  data_entrega: string | null;
  created_at: string;
  updated_at: string;
}

interface Colaborador {
  user_id: string;
  display_name: string | null;
}

const STATUSES: { key: Status; label: string; color: string }[] = [
  { key: "pendente", label: "Pendentes", color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" },
  { key: "execucao", label: "Execução", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  { key: "feita", label: "Feitas", color: "bg-green-500/20 border-green-500/40 text-green-300" },
];

const SETOR_LABEL: Record<Setor, string> = {
  engenharia: "Engenharia",
  comercial: "Comercial",
  financeiro: "Financeiro",
};

const PRIORIDADES: { key: Prioridade; label: string; badge: string; order: number }[] = [
  { key: "alta", label: "Alta", badge: "bg-red-500/20 border-red-500/40 text-red-300", order: 0 },
  { key: "media", label: "Média", badge: "bg-orange-500/20 border-orange-500/40 text-orange-300", order: 1 },
  { key: "normal", label: "Normal", badge: "bg-sky-500/20 border-sky-500/40 text-sky-300", order: 2 },
  { key: "baixa", label: "Baixa", badge: "bg-slate-500/20 border-slate-500/40 text-slate-300", order: 3 },
];
const PRIORIDADE_MAP = Object.fromEntries(PRIORIDADES.map((p) => [p.key, p])) as Record<Prioridade, typeof PRIORIDADES[number]>;

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
const todayIso = () => new Date().toISOString().slice(0, 10);

function KanbanColumn({
  status,
  demandas,
  onEdit,
  onDelete,
  colaboradoresMap,
}: {
  status: (typeof STATUSES)[number];
  demandas: Demanda[];
  onEdit: (d: Demanda) => void;
  onDelete: (d: Demanda) => void;
  colaboradoresMap: Map<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[260px] rounded-xl border transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : "border-border bg-card/30"
      }`}
    >
      <div className={`px-4 py-3 rounded-t-xl border-b ${status.color}`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{status.label}</span>
          <Badge variant="secondary" className="text-xs">{demandas.length}</Badge>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
        <SortableContext items={demandas.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {demandas.map((d) => (
            <SortableCard
              key={d.id}
              demanda={d}
              onEdit={() => onEdit(d)}
              onDelete={() => onDelete(d)}
              responsavelNome={colaboradoresMap.get(d.responsavel_id) || "—"}
            />
          ))}
        </SortableContext>
        {demandas.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Sem demandas</p>
        )}
      </div>
    </div>
  );
}

function SortableCard({
  demanda,
  onEdit,
  onDelete,
  responsavelNome,
}: {
  demanda: Demanda;
  onEdit: () => void;
  onDelete: () => void;
  responsavelNome: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: demanda.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const atrasada = demanda.status !== "feita" && demanda.data_entrega && demanda.data_entrega < todayIso();
  const prio = PRIORIDADE_MAP[demanda.prioridade] || PRIORIDADE_MAP.normal;

  return (
    <Card ref={setNodeRef} style={style} className="p-3 hover:shadow-md transition group">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-0.5 text-muted-foreground opacity-50 group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-tight">{demanda.titulo}</h4>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={onEdit} className="p-1 hover:bg-secondary rounded"><Pencil className="h-3 w-3" /></button>
              <button onClick={onDelete} className="p-1 hover:bg-destructive/20 text-destructive rounded"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
          {demanda.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{demanda.descricao}</p>
          )}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <Badge variant="outline" className={`text-[10px] py-0 ${prio.badge}`}>{prio.label}</Badge>
            <Badge variant="outline" className="text-[10px] py-0">{responsavelNome}</Badge>
            {demanda.data_entrega && (
              <span className={`text-[10px] flex items-center gap-1 ${atrasada ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {atrasada ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {formatDate(demanda.data_entrega)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Demandas() {
  const { setor } = useParams<{ setor: string }>();
  const { user, displayName, hasCargo } = useAuth();
  const setorValido = (["engenharia", "comercial", "financeiro"] as const).includes(setor as Setor);

  const canViewAll = hasCargo("admin") || (displayName || "").trim().toLowerCase() === "stanley";

  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResp, setFilterResp] = useState<string>(canViewAll ? "all" : (user?.id ?? "all"));
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Demanda | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const emptyForm = { titulo: "", descricao: "", responsavel_id: user?.id || "", data_entrega: "", prioridade: "normal" as Prioridade };
  const [form, setForm] = useState(emptyForm);

  const setorTyped = setor as Setor;

  // Fix filter on self when not allowed to view all
  useEffect(() => {
    if (!canViewAll && user?.id) setFilterResp(user.id);
  }, [canViewAll, user?.id]);

  const fetchData = useCallback(async () => {
    if (!setorValido) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("demandas")
      .select("*")
      .eq("setor", setorTyped)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar demandas");
    } else {
      setDemandas((data as Demanda[]) || []);
    }
    setLoading(false);
  }, [setorTyped, setorValido]);

  const fetchColaboradores = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name").eq("aprovado", true);
    if (data) setColaboradores(data as Colaborador[]);
  }, []);

  useEffect(() => { fetchData(); fetchColaboradores(); }, [fetchData, fetchColaboradores]);

  useEffect(() => {
    const channel = supabase
      .channel("demandas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "demandas" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const colaboradoresMap = useMemo(() => {
    const m = new Map<string, string>();
    colaboradores.forEach((c) => m.set(c.user_id, c.display_name || "—"));
    return m;
  }, [colaboradores]);

  const filtered = useMemo(() => {
    const base = !canViewAll
      ? demandas.filter((d) => d.responsavel_id === user?.id)
      : filterResp === "all"
      ? demandas
      : demandas.filter((d) => d.responsavel_id === filterResp);
    return [...base].sort(
      (a, b) => (PRIORIDADE_MAP[a.prioridade]?.order ?? 99) - (PRIORIDADE_MAP[b.prioridade]?.order ?? 99),
    );
  }, [demandas, filterResp, canViewAll, user?.id]);

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.error("Informe o título"); return; }
    if (!form.responsavel_id) { toast.error("Selecione o responsável"); return; }

    const payload = {
      setor: setorTyped,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      responsavel_id: form.responsavel_id,
      data_entrega: form.data_entrega || null,
      prioridade: form.prioridade,
    };

    if (editItem) {
      const { error } = await supabase.from("demandas").update(payload).eq("id", editItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Demanda atualizada");
      if (editItem.responsavel_id !== form.responsavel_id) {
        supabase.functions.invoke("send-demanda-email", {
          body: { responsavel_id: form.responsavel_id, titulo: payload.titulo, status: editItem.status, kind: "assigned" },
        }).catch(() => {});
        supabase.functions.invoke("send-onesignal-push", {
          body: { user_id: form.responsavel_id, title: "Nova demanda atribuída", message: payload.titulo, url: window.location.href },
        }).catch(() => {});
      }
    } else {
      const { error } = await supabase.from("demandas").insert({ ...payload, criado_por: user!.id, status: "pendente" });
      if (error) { toast.error("Erro ao criar demanda"); return; }
      toast.success("Demanda criada");
      supabase.functions.invoke("send-demanda-email", {
        body: { responsavel_id: form.responsavel_id, titulo: payload.titulo, status: "pendente", kind: "assigned" },
      }).catch(() => {});
      supabase.functions.invoke("send-onesignal-push", {
        body: { user_id: form.responsavel_id, title: "Nova demanda atribuída", message: payload.titulo, url: window.location.href },
      }).catch(() => {});
    }
    setShowModal(false); setEditItem(null); setForm({ ...emptyForm, responsavel_id: user?.id || "" });
  };

  const handleDelete = async (d: Demanda) => {
    if (!confirm("Excluir esta demanda?")) return;
    const { error } = await supabase.from("demandas").delete().eq("id", d.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Demanda excluída");
  };

  const openEdit = (d: Demanda) => {
    setEditItem(d);
    setForm({
      titulo: d.titulo,
      descricao: d.descricao || "",
      responsavel_id: d.responsavel_id,
      data_entrega: d.data_entrega || "",
      prioridade: d.prioridade || "normal",
    });
    setShowModal(true);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const id = active.id as string;
    const overId = over.id as string;
    const item = demandas.find((d) => d.id === id);
    if (!item) return;
    let target: Status | null = null;
    const m = STATUSES.find((s) => s.key === overId);
    if (m) target = m.key;
    else {
      const t = demandas.find((d) => d.id === overId);
      if (t) target = t.status;
    }
    if (target && item.status !== target) {
      setDemandas((prev) => prev.map((d) => (d.id === id ? { ...d, status: target! } : d)));
      const { error } = await supabase.from("demandas").update({ status: target }).eq("id", id);
      if (error) { toast.error("Erro ao mover"); fetchData(); }
      else if (item.responsavel_id) {
        supabase.functions.invoke("send-demanda-email", {
          body: { responsavel_id: item.responsavel_id, titulo: item.titulo, status: target, kind: "status_changed" },
        }).catch(() => {});
        supabase.functions.invoke("send-onesignal-push", {
          body: { user_id: item.responsavel_id, title: "Status alterado", message: `${item.titulo} → ${target}`, url: window.location.href },
        }).catch(() => {});
      }
    }
  };

  if (!setorValido) return <Navigate to="/" replace />;
  if (loading) return <div className="p-6 text-muted-foreground">Carregando demandas...</div>;

  const activeItem = activeId ? demandas.find((d) => d.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 py-2 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Demandas — {SETOR_LABEL[setorTyped]}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {canViewAll ? "Visualizando demandas de todos os colaboradores" : "Visualizando suas demandas"}
            </p>
          </div>
          <Button onClick={() => { setEditItem(null); setForm({ ...emptyForm, responsavel_id: user?.id || "" }); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Demanda
          </Button>
        </div>
        {canViewAll && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Colaborador</Label>
            <Select value={filterResp} onValueChange={setFilterResp}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>{c.display_name || c.user_id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterResp !== "all" && (
              <button onClick={() => setFilterResp("all")} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto p-2 mt-3">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-min">
            {STATUSES.map((s) => (
              <KanbanColumn
                key={s.key}
                status={s}
                demandas={filtered.filter((d) => d.status === s.key)}
                onEdit={openEdit}
                onDelete={handleDelete}
                colaboradoresMap={colaboradoresMap}
              />
            ))}
          </div>
          <DragOverlay>
            {activeItem && (
              <div className="w-[260px]">
                <SortableCard
                  demanda={activeItem}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  responsavelNome={colaboradoresMap.get(activeItem.responsavel_id) || "—"}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <Label>Responsável *</Label>
              <Select
                value={form.responsavel_id}
                onValueChange={(v) => setForm({ ...form, responsavel_id: v })}
                disabled={!canViewAll}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.display_name || c.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canViewAll && (
                <p className="text-[10px] text-muted-foreground mt-1">Você só pode criar demandas para si mesmo.</p>
              )}
            </div>
            <div>
              <Label>Data de entrega</Label>
              <DateInput value={form.data_entrega} onChange={(iso) => setForm({ ...form, data_entrega: iso })} />
            </div>
            <div>
              <Label>Prioridade *</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as Prioridade })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editItem ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}