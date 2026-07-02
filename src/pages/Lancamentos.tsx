import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "@/lib/dataContext";
import { CATEGORIA_LABELS, CATEGORIA_ARRAY, CATEGORIA_FIELD, MESES, formatCurrency, formatDate, lancamentoSchema, getMetasForMonth, calcularComissao, type Categoria, type Lancamento, type LancamentoItem } from "@/lib/types";
import { applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask } from "@/lib/currencyMask";
import { Trash2, ChevronDown, Search, ChevronUp, Pencil, X, ChevronLeft, ChevronRight, FileX, Download, Plus, Paperclip, FileText, CheckCircle2, XCircle } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { AnexosLancamento } from "@/components/AnexosLancamento";

const CAT_COLORS: Record<Categoria, string> = {
  produto: "#0A84FF", servico: "#30D158", contrato: "#FFD60A", acessorio: "#BF5AF2",
};
const DMEDICAL_COLOR = "#FF9F0A";
type TabKey = Categoria | "dmedical";
const TAB_LABEL: Record<TabKey, string> = {
  produto: "Produtos", servico: "Serviços", contrato: "Contratos", acessorio: "Acessórios", dmedical: "Dmedical",
};
const tabColor = (t: TabKey) => t === "dmedical" ? DMEDICAL_COLOR : CAT_COLORS[t as Categoria];
const arrKeyFor = (t: TabKey): keyof import("@/lib/types").AppData["lancamentos"] =>
  t === "dmedical" ? "dmedical" : CATEGORIA_ARRAY[t as Categoria];
const fieldKeyFor = (t: TabKey): string => t === "dmedical" ? "item" : CATEGORIA_FIELD[t as Categoria];
function comissaoFor(t: TabKey, valor: number, custos: number) {
  if (t === "dmedical") return Math.max(0, valor - (custos || 0)) * 0.2;
  return calcularComissao(t as Categoria, valor, custos);
}

const ITEMS_PER_PAGE = 10;
type SortKey = "data" | "cliente" | "valor" | "descricao";

function getDescricao(e: Lancamento) {
  return e.produto || e.servico || e.item || "";
}

const emptyItem = (): Omit<LancamentoItem, "lancamento_id"> => ({
  id: crypto.randomUUID(),
  identificacao: "",
  marca: "",
  modelo: "",
  observacao: "",
});

const supportsItens = (cat: TabKey | "todos") => cat === "produto" || cat === "acessorio" || cat === "dmedical";

export default function Lancamentos() {
  const { data, setData, loading, error, undoDelete } = useAppData();
  const { user, canAccess, hasCargo } = useAuth();
  const canManagePayment = hasCargo("admin") || canAccess("com_lancamentos");
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();

  const catParam = searchParams.get("categoria");
  const mesParam = parseInt(searchParams.get("mes") || "") - 1;
  const anoParam = parseInt(searchParams.get("ano") || "");

  const filterMonth = isNaN(mesParam) || mesParam < 0 || mesParam > 11 ? now.getMonth() : mesParam;
  const filterYear = isNaN(anoParam) ? now.getFullYear() : anoParam;
  const categoria: TabKey | "todos" = catParam && ["produto", "servico", "contrato", "acessorio", "dmedical"].includes(catParam) ? catParam as TabKey : "todos";

  function setFilterMonth(m: number) {
    setSearchParams(prev => { prev.set("mes", String(m + 1)); return prev; }, { replace: true });
  }
  function setFilterYear(y: number) {
    setSearchParams(prev => { prev.set("ano", String(y)); return prev; }, { replace: true });
  }
  function setCategoria(c: TabKey | "todos") {
    setSearchParams(prev => {
      if (c === "todos") prev.delete("categoria");
      else prev.set("categoria", c);
      return prev;
    }, { replace: true });
  }

  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("");
  const [valor, setValor] = useState("");
  const [custos, setCustos] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [dataLanc, setDataLanc] = useState(now.toISOString().slice(0, 10));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formItens, setFormItens] = useState<Omit<LancamentoItem, "lancamento_id">[]>([emptyItem()]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editItem, setEditItem] = useState<(Lancamento & { cat: TabKey }) | null>(null);
  const [editCliente, setEditCliente] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editCustos, setEditCustos] = useState("");
  const [editData, setEditData] = useState("");
  const [editVendedor, setEditVendedor] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editItens, setEditItens] = useState<LancamentoItem[]>([]);
  const [editItensLoading, setEditItensLoading] = useState(false);

  const formCat: TabKey = categoria === "todos" ? "produto" : categoria;
  const fieldLabel = formCat === "dmedical" ? "Item" : formCat === "acessorio" ? "Acessório" : formCat === "produto" ? "Produto" : "Serviço";
  const tipoLabel = formCat === "dmedical" ? "Tipo (Dmedical)" : formCat === "acessorio" ? "Tipo de Acessório" : formCat === "produto" ? "Tipo de Produto" : formCat === "contrato" ? "Tipo de Contrato" : "Tipo de Serviço";

  function validateForm(c: string, d: string, v: string, dt: string) {
    const result = lancamentoSchema.safeParse({ cliente: c, descricao: d, valor: parseFloat(v) || 0, data: dt });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      return errs;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(cliente, descricao, String(parseCurrencyMask(valor)), dataLanc);
    if (errs) { setFormErrors(errs); toast.error("Corrija os campos inválidos"); return; }
    setFormErrors({});
    const newId = crypto.randomUUID();
    const newItem: Lancamento = {
      id: newId, cliente: cliente.trim(), valor: parseCurrencyMask(valor), data: dataLanc,
      custos: parseCurrencyMask(custos),
      [fieldKeyFor(formCat)]: descricao.trim(),
      tipo: tipo.trim() || undefined,
      vendedor: vendedor || undefined,
    };
    const arrKey = arrKeyFor(formCat);
    setData((prev) => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [arrKey]: [...prev.lancamentos[arrKey], newItem] },
    }));

    // Save itens for produto/acessorio
    if (supportsItens(formCat) && user) {
      const validItens = formItens.filter(it => it.identificacao || it.marca || it.modelo || it.observacao);
      if (validItens.length > 0) {
        await supabase.from("lancamento_itens").insert(
          validItens.map(it => ({
            id: it.id,
            lancamento_id: newId,
            user_id: user.id,
            identificacao: it.identificacao || null,
            marca: it.marca || null,
            modelo: it.modelo || null,
            observacao: it.observacao || null,
          }))
        );
      }
    }

    // Upload staged attachments
    if (stagedFiles.length > 0 && user) {
      for (const file of stagedFiles) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${newId}/${crypto.randomUUID()}-${safe}`;
        const up = await supabase.storage.from("lancamento-anexos").upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (!up.error) {
          await supabase.from("lancamento_anexos").insert({
            lancamento_id: newId,
            user_id: user.id,
            nome: file.name,
            path,
            tipo: file.type || null,
            tamanho: file.size,
          });
        }
      }
    }

    setCliente(""); setDescricao(""); setTipo(""); setValor(""); setCustos(""); setVendedor(""); setFormItens([emptyItem()]); setStagedFiles([]); setShowForm(false);
    toast.success("Lançamento adicionado com sucesso");
  }

  async function openEdit(entry: Lancamento & { cat: TabKey }) {
    setEditItem(entry);
    setEditCliente(entry.cliente);
    setEditDescricao(getDescricao(entry));
    setEditTipo(entry.tipo || "");
    setEditValor(numberToCurrencyMask(entry.valor));
    setEditCustos(numberToCurrencyMask(entry.custos ?? 0));
    setEditData(entry.data);
    setEditVendedor(entry.vendedor || "");
    setEditErrors({});
    setEditItens([]);

    if (supportsItens(entry.cat)) {
      setEditItensLoading(true);
      const { data: itensData } = await supabase
        .from("lancamento_itens")
        .select("*")
        .eq("lancamento_id", entry.id);
      setEditItens((itensData ?? []).map((it: any) => ({
        id: it.id,
        lancamento_id: it.lancamento_id,
        identificacao: it.identificacao ?? "",
        marca: it.marca ?? "",
        modelo: it.modelo ?? "",
        observacao: it.observacao ?? "",
      })));
      setEditItensLoading(false);
    }
  }

  async function handleEditSave() {
    if (!editItem || !user) return;
    const errs = validateForm(editCliente, editDescricao, String(parseCurrencyMask(editValor)), editData);
    if (errs) { setEditErrors(errs); toast.error("Corrija os campos inválidos"); return; }
    setEditErrors({});
    const arrKey = arrKeyFor(editItem.cat);
    const fieldKey = fieldKeyFor(editItem.cat);
    setData((prev) => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [arrKey]: prev.lancamentos[arrKey].map(l =>
          l.id === editItem.id ? { ...l, cliente: editCliente.trim(), valor: parseCurrencyMask(editValor), custos: parseCurrencyMask(editCustos), data: editData, [fieldKey]: editDescricao.trim(), tipo: editTipo.trim() || undefined, vendedor: editVendedor || undefined } : l
        ),
      },
    }));

    // Sync itens for produto/acessorio
    if (supportsItens(editItem.cat)) {
      // Delete all existing, then re-insert
      await supabase.from("lancamento_itens").delete().eq("lancamento_id", editItem.id);
      const validItens = editItens.filter(it => it.identificacao || it.marca || it.modelo || it.observacao);
      if (validItens.length > 0) {
        await supabase.from("lancamento_itens").insert(
          validItens.map(it => ({
            lancamento_id: editItem.id,
            user_id: user.id,
            identificacao: it.identificacao || null,
            marca: it.marca || null,
            modelo: it.modelo || null,
            observacao: it.observacao || null,
          }))
        );
      }
    }

    setEditItem(null);
    toast.success("Lançamento atualizado");
  }

  function handleDelete(cat: TabKey, id: string) {
    const arrKey = arrKeyFor(cat);
    const deletedItem = data.lancamentos[arrKey].find(l => l.id === id);
    if (!deletedItem) return;

    setData((prev) => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [arrKey]: prev.lancamentos[arrKey].filter((l) => l.id !== id) },
    }));

    undoDelete(id, "Lançamento excluído.", (prev) => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [arrKey]: [...prev.lancamentos[arrKey], deletedItem] },
    }));
  }

  async function togglePaid(entry: Lancamento & { cat: TabKey }) {
    if (!user) return;
    const arrKey = arrKeyFor(entry.cat);
    const nextPaid = !entry.paid;
    const patch = nextPaid
      ? { paid: true, paid_at: new Date().toISOString(), paid_by: user.id }
      : { paid: false, paid_at: null as string | null, paid_by: null as string | null };

    // Optimistic update
    setData((prev) => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [arrKey]: prev.lancamentos[arrKey].map((l) => (l.id === entry.id ? { ...l, ...patch } : l)),
      },
    }));

    const { error: dbError } = await supabase.from("lancamentos").update(patch).eq("id", entry.id);
    if (dbError) {
      // Revert
      setData((prev) => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [arrKey]: prev.lancamentos[arrKey].map((l) => (l.id === entry.id ? entry : l)),
        },
      }));
      toast.error("Não foi possível atualizar o pagamento.");
      return;
    }
    toast.success(nextPaid ? "Comissão marcada como paga." : "Pagamento cancelado.");
  }

  const allEntries = useMemo(() => {
    const entries: (Lancamento & { cat: TabKey })[] = [];
    const catsToShow: TabKey[] = categoria === "todos" ? ["produto", "servico", "contrato", "acessorio"] : [categoria];
    catsToShow.forEach((cat) => {
      data.lancamentos[arrKeyFor(cat)]
        .filter((l) => { const [y, m] = l.data.split("-").map(Number); return (m - 1) === filterMonth && y === filterYear; })
        .forEach((l) => entries.push({ ...l, cat }));
    });
    const q = searchQuery.toLowerCase().trim();
    const searched = q
      ? entries.filter(e => e.cliente.toLowerCase().includes(q) || getDescricao(e).toLowerCase().includes(q))
      : entries;
    searched.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "data") cmp = a.data.localeCompare(b.data);
      else if (sortKey === "cliente") cmp = a.cliente.localeCompare(b.cliente);
      else if (sortKey === "valor") cmp = a.valor - b.valor;
      else cmp = getDescricao(a).localeCompare(getDescricao(b));
      return sortAsc ? cmp : -cmp;
    });
    return searched;
  }, [data, filterMonth, filterYear, categoria, searchQuery, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(allEntries.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedEntries = allEntries.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const totalMes = allEntries.reduce((s, e) => s + e.valor, 0);
  const totalComissao = allEntries.reduce((s, e) => s + comissaoFor(e.cat, e.valor, e.custos ?? 0), 0);
  const { metas: currentMetas } = getMetasForMonth(data.historico_metas, filterMonth, filterYear, data.metas, data.meta_semanal);
  const metaCategoria = categoria === "todos"
    ? Object.values(currentMetas).reduce((a, b) => a + b, 0)
    : categoria === "dmedical" ? 0 : currentMetas[categoria as Categoria];
  const totalCategoria = totalMes;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  }

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  const editFieldLabel = editItem ? (editItem.cat === "acessorio" ? "Acessório" : editItem.cat === "produto" ? "Produto" : "Serviço") : "";
  const editTipoLabel = editItem ? (editItem.cat === "acessorio" ? "Tipo de Acessório" : editItem.cat === "produto" ? "Tipo de Produto" : editItem.cat === "contrato" ? "Tipo de Contrato" : "Tipo de Serviço") : "";

  function ErrorMsg({ msg }: { msg?: string }) {
    if (!msg) return null;
    return <p className="text-[11px] mt-1 font-medium" style={{ color: '#FF453A' }}>{msg}</p>;
  }

  // Item list helpers
  function updateFormItem(index: number, field: string, value: string) {
    setFormItens(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }
  function removeFormItem(index: number) {
    setFormItens(prev => prev.filter((_, i) => i !== index));
  }
  function addFormItem() {
    setFormItens(prev => [...prev, emptyItem()]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const maxBytes = 10 * 1024 * 1024;
    const valid = Array.from(files).filter(f => {
      if (f.size > maxBytes) {
        toast.error(`${f.name}: máximo 10MB`);
        return false;
      }
      return true;
    });
    setStagedFiles(prev => [...prev, ...valid]);
    e.target.value = "";
  }

  function removeStagedFile(index: number) {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  }

  function updateEditItemField(index: number, field: string, value: string) {
    setEditItens(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }
  function removeEditItem(index: number) {
    setEditItens(prev => prev.filter((_, i) => i !== index));
  }
  function addEditItem() {
    setEditItens(prev => [...prev, { id: crypto.randomUUID(), lancamento_id: editItem?.id || "", identificacao: "", marca: "", modelo: "", observacao: "" }]);
  }

  function ItemFields({ items, onUpdate, onRemove, onAdd }: {
    items: { id: string; identificacao?: string; marca?: string; modelo?: string; observacao?: string }[];
    onUpdate: (i: number, field: string, value: string) => void;
    onRemove: (i: number) => void;
    onAdd: () => void;
  }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">Itens do Lançamento</label>
          <button type="button" onClick={onAdd} className="flex items-center gap-1 text-xs font-medium text-primary">
            <Plus className="h-3.5 w-3.5" /> Adicionar Item
          </button>
        </div>
        {items.map((it, i) => (
          <div key={it.id} className="p-3 rounded-xl border border-border space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Item {i + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => onRemove(i)} className="p-1 rounded hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF453A' }} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Identificação</label>
                <input value={it.identificacao || ""} onChange={e => onUpdate(i, "identificacao", e.target.value)} className="ios-input w-full text-xs" placeholder="Nº série / ID" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Marca</label>
                <input value={it.marca || ""} onChange={e => onUpdate(i, "marca", e.target.value)} className="ios-input w-full text-xs" placeholder="Marca" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Modelo</label>
                <input value={it.modelo || ""} onChange={e => onUpdate(i, "modelo", e.target.value)} className="ios-input w-full text-xs" placeholder="Modelo" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Observação</label>
                <input value={it.observacao || ""} onChange={e => onUpdate(i, "observacao", e.target.value)} className="ios-input w-full text-xs" placeholder="Observação" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  function exportCSV() {
    const rows = allEntries.map(e => ({
      Data: formatDate(e.data),
      Cliente: e.cliente,
      Descrição: getDescricao(e),
      Categoria: CATEGORIA_LABELS[e.cat],
      Valor: e.valor.toFixed(2),
    }));
    const header = "Data,Cliente,Descrição,Categoria,Valor";
    const csvContent = [header, ...rows.map(r =>
      [r.Data, `"${r.Cliente}"`, `"${r.Descrição}"`, r.Categoria, r.Valor].join(",")
    )].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const mesStr = String(filterMonth + 1).padStart(2, "0");
    a.href = url;
    a.download = `lancamentos_${filterYear}-${mesStr}_${categoria}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso");
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Lançamentos</h1>
        <div className="relative">
          <button onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground bg-secondary">
            {MESES[filterMonth].substring(0, 3)} {filterYear}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-2 z-50 p-3 rounded-2xl w-64 bg-popover border border-border backdrop-blur-xl">
              <div className="flex gap-2 mb-3">
                {[2025, 2026, 2027].map(y => (
                  <button key={y} onClick={() => setFilterYear(y)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${y === filterYear ? 'bg-primary text-foreground' : 'text-muted-foreground'}`}>{y}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MESES.map((m, i) => (
                  <button key={i} onClick={() => { setFilterMonth(i); setShowPicker(false); setPage(0); }}
                    className={`py-2 rounded-lg text-xs font-medium ${i === filterMonth ? 'bg-primary text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{m.substring(0, 3)}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <button onClick={() => setCategoria("todos")}
          className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
          style={{
            background: categoria === "todos" ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted))',
            color: categoria === "todos" ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            border: `1px solid ${categoria === "todos" ? 'hsl(var(--primary) / 0.4)' : 'transparent'}`,
          }}>
          Todos
        </button>
        {(["produto", "servico", "contrato", "acessorio"] as Categoria[]).map(cat => (
          <button key={cat} onClick={() => setCategoria(cat)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: categoria === cat ? CAT_COLORS[cat] + '20' : 'rgba(255,255,255,0.05)',
              color: categoria === cat ? CAT_COLORS[cat] : '#8E8E93',
              border: `1px solid ${categoria === cat ? CAT_COLORS[cat] + '40' : 'transparent'}`,
            }}>
            {CATEGORIA_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="glass-card p-4 grid grid-cols-4 gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total mês</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalMes)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{categoria === "todos" ? "Total" : CATEGORIA_LABELS[categoria as Categoria]}</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalCategoria)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Falta</p>
          <p className="text-lg font-bold" style={{ color: '#FF453A' }}>{formatCurrency(Math.max(0, metaCategoria - totalCategoria))}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Comissão</p>
          <p className="text-lg font-bold" style={{ color: '#0A84FF' }}>{formatCurrency(totalComissao)}</p>
        </div>
      </div>

      {/* New Entry Button / Form */}
      {!showForm ? (
        <button onClick={() => { setShowForm(true); setFormErrors({}); setFormItens([emptyItem()]); }}
          className="w-full py-3 rounded-2xl text-base font-semibold text-foreground bg-primary">
          + Novo Lançamento
        </button>
      ) : (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Novo Lançamento</h3>
            <button onClick={() => setShowForm(false)} className="text-sm text-primary">Cancelar</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Cliente</label>
              <input value={cliente} onChange={e => setCliente(e.target.value)} className="ios-input w-full" placeholder="Nome do cliente" />
              <ErrorMsg msg={formErrors.cliente} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">{fieldLabel}</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} className="ios-input w-full" placeholder={fieldLabel} />
              <ErrorMsg msg={formErrors.descricao} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">{tipoLabel}</label>
              <input value={tipo} onChange={e => setTipo(e.target.value)} className="ios-input w-full" placeholder={tipoLabel} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Vendedor</label>
              <select value={vendedor} onChange={e => setVendedor(e.target.value)} className="ios-input w-full">
                <option value="">Selecione</option>
                {data.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Valor (R$)</label>
                <input inputMode="numeric" value={valor} onChange={e => setValor(applyCurrencyMask(e.target.value))} className="ios-input w-full" placeholder="R$ 0,00" />
                <ErrorMsg msg={formErrors.valor} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Custos (R$)</label>
                <input inputMode="numeric" value={custos} onChange={e => setCustos(applyCurrencyMask(e.target.value))} className="ios-input w-full" placeholder="R$ 0,00" disabled={formCat === "servico"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Data</label>
                <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={formErrors.data} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Comissão prevista</label>
                <div className="ios-input w-full flex items-center" style={{ color: '#0A84FF', fontWeight: 600 }}>
                  {formatCurrency(comissaoFor(formCat, parseCurrencyMask(valor), parseCurrencyMask(custos)))}
                </div>
              </div>
            </div>

            {supportsItens(formCat) && (
              <ItemFields
                items={formItens}
                onUpdate={updateFormItem}
                onRemove={removeFormItem}
                onAdd={addFormItem}
              />
            )}

            {/* Staged attachments (creation) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">Anexos (PDF ou imagens)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Adicionar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              {stagedFiles.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-2 border border-dashed border-border rounded-lg">
                  Nenhum anexo selecionado. Máx. 10MB por arquivo.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stagedFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button type="button" onClick={() => removeStagedFile(i)} className="p-1 rounded hover:bg-muted">
                        <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF453A' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary">
              Lançar
            </button>
          </form>
        </div>
      )}

      {/* Search + Sort Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            className="ios-input w-full pl-10" placeholder="Buscar cliente ou produto..." />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { key: "data" as SortKey, label: "Data" },
            { key: "cliente" as SortKey, label: "Cliente" },
            { key: "valor" as SortKey, label: "Valor" },
            { key: "descricao" as SortKey, label: "Descrição" },
          ]).map(s => (
            <button key={s.key} onClick={() => toggleSort(s.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                background: sortKey === s.key ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: sortKey === s.key ? '#0A84FF' : '#8E8E93',
              }}>
              {s.label}<SortIcon field={s.key} />
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="ios-section-title">LANÇAMENTOS — {MESES[filterMonth].toUpperCase()} ({allEntries.length})</p>
          {allEntries.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted transition">
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          )}
        </div>
        {allEntries.length === 0 ? (
          <EmptyState icon={FileX} title="Nenhum lançamento" description="Adicione um lançamento para este mês." />
        ) : (
          <div className="ios-list-group">
            {paginatedEntries.map((e) => (
              <div key={e.id} className="ios-list-item">
                <button className="flex-1 min-w-0 text-left" onClick={() => openEdit(e)}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tabColor(e.cat) }} />
                    <span className="text-sm font-medium text-foreground truncate">{e.cliente}</span>
                  </div>
                  <p className="text-xs mt-0.5 ml-3.5 truncate text-muted-foreground">
                    {getDescricao(e)}{e.tipo ? ` · ${e.tipo}` : ''}{e.vendedor ? ` · ${e.vendedor}` : ''} · {formatDate(e.data)}
                  </p>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold" style={{ color: '#30D158' }}>{formatCurrency(e.valor)}</span>
                    <span className="text-[10px] font-medium" style={{ color: '#0A84FF' }}>
                      Com.: {formatCurrency(comissaoFor(e.cat, e.valor, e.custos ?? 0))}
                    </span>
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); if (canManagePayment) togglePaid(e); }}
                      disabled={!canManagePayment}
                      title={
                        e.paid
                          ? `Pago${e.paid_at ? " em " + new Date(e.paid_at).toLocaleString("pt-BR") : ""}`
                          : "Comissão pendente"
                      }
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border transition-transform ${
                        e.paid
                          ? "bg-[#DCFCE7] text-[#166534] border-transparent"
                          : "bg-[#FEE2E2] text-[#B91C1C] border-transparent"
                      } ${canManagePayment ? "hover:scale-[1.05] cursor-pointer" : "cursor-default opacity-90"}`}
                    >
                      {e.paid ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                      {e.paid ? "Pago" : "Pendente"}
                    </button>
                  </div>
                  <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </button>
                  <button onClick={() => handleDelete(e.cat, e.id)} className="p-1.5 rounded-lg hover:bg-muted">
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

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 space-y-4 bg-popover border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Editar Lançamento</h3>
              <button onClick={() => setEditItem(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="px-1.5 py-1 rounded-full text-[10px] font-medium inline-block"
              style={{ background: CAT_COLORS[editItem.cat] + '20', color: CAT_COLORS[editItem.cat] }}>
              {CATEGORIA_LABELS[editItem.cat]}
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Cliente</label>
              <input value={editCliente} onChange={e => setEditCliente(e.target.value)} className="ios-input w-full" />
              <ErrorMsg msg={editErrors.cliente} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">{editFieldLabel}</label>
              <input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className="ios-input w-full" />
              <ErrorMsg msg={editErrors.descricao} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">{editTipoLabel}</label>
              <input value={editTipo} onChange={e => setEditTipo(e.target.value)} className="ios-input w-full" placeholder={editTipoLabel} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Vendedor</label>
              <select value={editVendedor} onChange={e => setEditVendedor(e.target.value)} className="ios-input w-full">
                <option value="">Selecione</option>
                {data.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Valor (R$)</label>
                <input inputMode="numeric" value={editValor} onChange={e => setEditValor(applyCurrencyMask(e.target.value))} className="ios-input w-full" placeholder="R$ 0,00" />
                <ErrorMsg msg={editErrors.valor} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Custos (R$)</label>
                <input inputMode="numeric" value={editCustos} onChange={e => setEditCustos(applyCurrencyMask(e.target.value))} className="ios-input w-full" placeholder="R$ 0,00" disabled={editItem.cat === "servico"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Data</label>
                <input type="date" value={editData} onChange={e => setEditData(e.target.value)} className="ios-input w-full" />
                <ErrorMsg msg={editErrors.data} />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Comissão prevista</label>
                <div className="ios-input w-full flex items-center" style={{ color: '#0A84FF', fontWeight: 600 }}>
                  {formatCurrency(comissaoFor(editItem.cat, parseCurrencyMask(editValor), parseCurrencyMask(editCustos)))}
                </div>
              </div>
            </div>

            {supportsItens(editItem.cat) && (
              editItensLoading ? (
                <p className="text-xs text-muted-foreground text-center py-2">Carregando itens...</p>
              ) : (
                <ItemFields
                  items={editItens}
                  onUpdate={updateEditItemField}
                  onRemove={removeEditItem}
                  onAdd={addEditItem}
                />
              )
            )}

            <AnexosLancamento lancamentoId={editItem.id} />

            <button onClick={handleEditSave} className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary">
              Salvar Alterações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}