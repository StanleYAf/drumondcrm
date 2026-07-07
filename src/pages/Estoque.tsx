import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import { formatCurrency, MESES } from "@/lib/types";
import { applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask } from "@/lib/currencyMask";
import { DateInput } from "@/components/DateInput";
import { FORMA_PAGAMENTO_LABELS, FORMAS_PARCELAVEIS, calcularParcelas, formatDateBR, type FormaPagamento } from "@/lib/pagamento";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Package, Search, Camera, Plus, Pencil, ArrowDownToLine, ArrowUpFromLine,
  X, AlertTriangle, Barcode, Download, RotateCcw, Archive, TrendingUp,
  Clock, Eye, Trash2, CalendarClock, Printer, ImagePlus, FileText, Sheet as SheetIcon,
} from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import ProductLabel, { type ProductLabelData } from "@/components/ProductLabel";
import { useLabelPrint } from "@/hooks/useLabelPrint";

interface Produto {
  id: string;
  nome: string;
  codigo_barras: string | null;
  categoria: string | null;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number | null;
  preco_venda: number | null;
  fornecedor_id: string | null;
  numero_serie: string | null;
  ativo: boolean;
  registro_anvisa: string | null;
  fabricante: string | null;
  validade: string | null;
  local_estoque: string | null;
  nome_comercial: string | null;
  lote: string | null;
  foto_url: string | null;
}

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  motivo: string | null;
  documento_ref: string | null;
  vendedor_id: string | null;
  cliente: string | null;
  observacao: string | null;
  created_at: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface QuickMoveState {
  produto: Produto;
  tipo: "entrada" | "saida" | null;
  quantidade: number;
  observacao: string;
  documento_ref: string;
  forma_pagamento: FormaPagamento | "";
  valor_mascara: string;
  num_parcelas: number;
  taxa_juros_mensal: number;
  primeira_parcela: string;
}

type TabKey = "produtos" | "movimentacoes" | "alertas" | "aguardando";
type EstoqueSource = "dsh" | "dmedical";

const ESTOQUE_TABLES: Record<EstoqueSource, { produtos: string; movimentacoes: string; pendentes: string }> = {
  dsh: { produtos: "produtos_estoque", movimentacoes: "movimentacoes_estoque", pendentes: "pendentes_estoque" },
  dmedical: { produtos: "produtos_estoque_2", movimentacoes: "movimentacoes_estoque_2", pendentes: "pendentes_estoque_2" },
};

const TIPO_COLORS: Record<string, string> = {
  entrada: "#30D158",
  saida: "#FF453A",
  ajuste: "#0A84FF",
  devolucao: "#FFD60A",
};
const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  devolucao: "Devolução",
};

export default function Estoque() {
  const { user, hasCargo } = useAuth();
  const canApprove = hasCargo("admin") || hasCargo("Controlador");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("produtos");
  const [estoqueSource, setEstoqueSource] = useState<EstoqueSource>("dsh");
  const tbl = ESTOQUE_TABLES[estoqueSource];
  const [searchQuery, setSearchQuery] = useState("");
  const [quickMove, setQuickMove] = useState<QuickMoveState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [scanForNewProduct, setScanForNewProduct] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoScanMode, setAutoScanMode] = useState(false);
  const [pendentes, setPendentes] = useState<{id: string; produto_id: string; quantidade: number; created_at: string; status: string}[]>([]);
  const [editProduct, setEditProduct] = useState<Produto | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const handleBarcodeScanRef = useRef<(code: string) => void>(() => {});

  // Movimentações filters
  const now = new Date();
  const [movFilterProduto, setMovFilterProduto] = useState("");
  const [movFilterTipo, setMovFilterTipo] = useState("");
  const [movFilterMes, setMovFilterMes] = useState(now.getMonth());
  const [movFilterAno, setMovFilterAno] = useState(now.getFullYear());
  const [movFilterVendedor, setMovFilterVendedor] = useState("");

  // Relatórios filters
  const todayISO = new Date().toISOString().slice(0, 10);
  const firstOfMonthISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const [relStart, setRelStart] = useState(firstOfMonthISO);
  const [relEnd, setRelEnd] = useState(todayISO);
  const [relCategoria, setRelCategoria] = useState("");
  const [relFornecedor, setRelFornecedor] = useState("");
  const [relAppliedStart, setRelAppliedStart] = useState(firstOfMonthISO);
  const [relAppliedEnd, setRelAppliedEnd] = useState(todayISO);
  const [relAppliedCategoria, setRelAppliedCategoria] = useState("");
  const [relAppliedFornecedor, setRelAppliedFornecedor] = useState("");

  // Product form
  const [formNome, setFormNome] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formSemCodigo, setFormSemCodigo] = useState(false);
  const [formCategoria, setFormCategoria] = useState("");
  const [formUnidade, setFormUnidade] = useState("un");
  const [formEstoqueMin, setFormEstoqueMin] = useState("1");
  const [formEstoqueAtual, setFormEstoqueAtual] = useState("0");
  const [formPrecoCusto, setFormPrecoCusto] = useState("");
  const [formPrecoVenda, setFormPrecoVenda] = useState("");
  const [formNumeroSerie, setFormNumeroSerie] = useState("");
  const [formFornecedor, setFormFornecedor] = useState("");
  const [formRegistroAnvisa, setFormRegistroAnvisa] = useState("");
  const [formFabricante, setFormFabricante] = useState("");
  const [formValidade, setFormValidade] = useState("");
  const [formValidadeIsento, setFormValidadeIsento] = useState(false);
  const [formLocalEstoque, setFormLocalEstoque] = useState("");
  const [formNomeComercial, setFormNomeComercial] = useState("");
  const [formLote, setFormLote] = useState("");
  const [formFotos, setFormFotos] = useState<File[]>([]);
  const [formFotoPreviews, setFormFotoPreviews] = useState<string[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  function parseFotoUrls(fotoUrl: string | null): string[] {
    if (!fotoUrl) return [];
    try { const arr = JSON.parse(fotoUrl); if (Array.isArray(arr)) return arr; } catch {}
    return [fotoUrl];
  }

  // Label printing
  const { labelRef, triggerPrint } = useLabelPrint();
  const [labelData, setLabelData] = useState<ProductLabelData | null>(null);
  const fetchAll = useCallback(async () => {
    if (!user) return;
    const tables = ESTOQUE_TABLES[estoqueSource];
    const [prodRes, movRes, fornRes, vendRes, pendRes] = await Promise.all([
      supabase.from(tables.produtos as any).select("*").order("nome"),
      supabase.from(tables.movimentacoes as any).select("*").order("created_at", { ascending: false }),
      supabase.from("fornecedores").select("id, nome").order("nome"),
      supabase.from("vendedores").select("id, nome").order("nome"),
      supabase.from(tables.pendentes as any).select("*").eq("status", "pendente").order("created_at", { ascending: false }),
    ]);
    if (prodRes.data) setProdutos((prodRes.data as any[]).map(d => ({
      ...d, estoque_atual: Number(d.estoque_atual), estoque_minimo: Number(d.estoque_minimo),
      preco_custo: d.preco_custo ? Number(d.preco_custo) : null, preco_venda: d.preco_venda ? Number(d.preco_venda) : null,
    })));
    if (movRes.data) setMovimentacoes((movRes.data as any[]).map(m => ({ ...m, quantidade: Number(m.quantidade) })));
    if (fornRes.data) setFornecedores(fornRes.data);
    if (vendRes.data) setVendedores(vendRes.data);
    if (pendRes.data) setPendentes((pendRes.data as any[]).map(p => ({ ...p, quantidade: Number(p.quantidade) })));
    setLoading(false);
  }, [user, estoqueSource]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Computed
  const produtoMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);
  const vendedorMap = useMemo(() => new Map(vendedores.map(v => [v.id, v.nome])), [vendedores]);
  const belowMin = useMemo(() => produtos.filter(p => p.ativo && p.estoque_atual < p.estoque_minimo).length, [produtos]);
  const outOfStock = useMemo(() => produtos.filter(p => p.ativo && p.estoque_atual === 0), [produtos]);

  // Expiry alerts
  const expiringProducts = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 86400000);
    return produtos.filter(p => {
      if (!p.ativo || !p.validade) return false;
      const [y, m, d] = p.validade.split("-").map(Number);
      const expDate = new Date(y, m - 1, d);
      return expDate <= thirtyDaysFromNow;
    }).map(p => {
      const [y, m, d] = p.validade!.split("-").map(Number);
      const expDate = new Date(y, m - 1, d);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
      return { ...p, diffDays };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [produtos]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return produtos.filter(p => p.ativo);
    return produtos.filter(p => p.ativo && (
      p.nome.toLowerCase().includes(q) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q))
    ));
  }, [produtos, searchQuery]);

  // Idle products (no movement in 60 days)
  const idleProducts = useMemo(() => {
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
    const lastMoveMap = new Map<string, Date>();
    movimentacoes.forEach(m => {
      const d = new Date(m.created_at);
      const cur = lastMoveMap.get(m.produto_id);
      if (!cur || d > cur) lastMoveMap.set(m.produto_id, d);
    });
    return produtos.filter(p => {
      if (!p.ativo) return false;
      const last = lastMoveMap.get(p.id);
      return !last || last < sixtyDaysAgo;
    });
  }, [produtos, movimentacoes, now]);

  // Filtered movimentações
  const filteredMov = useMemo(() => {
    return movimentacoes.filter(m => {
      const d = new Date(m.created_at);
      if (d.getMonth() !== movFilterMes || d.getFullYear() !== movFilterAno) return false;
      if (movFilterProduto && m.produto_id !== movFilterProduto) return false;
      if (movFilterTipo && m.tipo !== movFilterTipo) return false;
      if (movFilterVendedor && m.vendedor_id !== movFilterVendedor) return false;
      return true;
    });
  }, [movimentacoes, movFilterMes, movFilterAno, movFilterProduto, movFilterTipo, movFilterVendedor]);

  const movSummary = useMemo(() => {
    let entradas = 0, saidas = 0;
    filteredMov.forEach(m => {
      if (m.tipo === "entrada" || m.tipo === "devolucao") entradas += m.quantidade;
      else saidas += m.quantidade;
    });
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filteredMov]);

  // Stock health
  const totalSKUs = produtos.filter(p => p.ativo).length;
  const valorTotal = useMemo(() =>
    produtos.filter(p => p.ativo).reduce((s, p) => s + p.estoque_atual * (p.preco_venda || 0), 0), [produtos]);

  const top10 = useMemo(() => {
    const countMap = new Map<string, number>();
    movimentacoes.filter(m => {
      const d = new Date(m.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).forEach(m => {
      countMap.set(m.produto_id, (countMap.get(m.produto_id) || 0) + m.quantidade);
    });
    return Array.from(countMap.entries())
      .map(([id, qty]) => ({ nome: produtoMap.get(id)?.nome || "?", qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [movimentacoes, produtoMap, now]);

  // Barcode scanner
  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");
      if (isInput && active !== searchRef.current) return;
      if (e.key === "Enter" && barcodeBuffer.current.length >= 4) {
        e.preventDefault(); handleBarcodeScan(barcodeBuffer.current); barcodeBuffer.current = ""; return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [produtos]);

  async function handleBarcodeScan(code: string) {
    // scanForNewProduct has highest priority — user explicitly wants to register
    if (scanForNewProduct) {
      setScanForNewProduct(false);
      resetForm();
      setFormCodigo(code);
      setShowForm(true);
      toast.info(`Código ${code} capturado — preencha os dados do produto`);
      return;
    }

    // Auto-scan mode: add to pending queue for later approval
    if (autoScanMode && user) {
      const trimmed = code.trim();
      const found = produtos.find(p => p.codigo_barras?.trim() === trimmed);
      if (found) {
        const { error } = await supabase.from(tbl.pendentes as any).insert({
          user_id: user.id, produto_id: found.id, quantidade: 1,
        });
        if (!error) {
          toast.success(`${found.nome} → fila de aprovação`);
          fetchAll();
        } else {
          toast.error("Erro ao adicionar à fila");
        }
      } else {
        toast.error(`Código ${trimmed} não encontrado no estoque`);
      }
      return;
    }



    const trimmed = code.trim();
    const found = produtos.find(p => p.codigo_barras?.trim() === trimmed);
    if (found) { setQuickMove({ produto: found, tipo: null, quantidade: 1, observacao: "", documento_ref: "", forma_pagamento: "", valor_mascara: numberToCurrencyMask(Number(found.preco_venda) || 0), num_parcelas: 1, taxa_juros_mensal: 0, primeira_parcela: new Date().toISOString().slice(0,10) }); setSearchQuery(""); }
    else {
      resetForm();
      setFormCodigo(trimmed);
      setShowForm(true);
      toast.info(`Produto não encontrado — cadastre com o código ${trimmed}`);
    }
  }

  // Keep ref always up-to-date so the scanner callback never uses stale state
  useEffect(() => { handleBarcodeScanRef.current = handleBarcodeScan; });

  async function startCamera() {
    setShowCamera(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("barcode-scanner-div");
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              const code = decodedText.trim();
              // Stop scanner first, then process
              stopCamera().then(() => {
                handleBarcodeScanRef.current(code);
              });
            },
            () => {}
          );
        } catch (err) { console.error("[Scanner] start error:", err); toast.error("Erro ao acessar câmera"); setShowCamera(false); }
      }, 400);
    } catch (err) { console.error("[Scanner] import error:", err); toast.error("Erro ao carregar leitor"); setShowCamera(false); }
  }

  async function stopCamera() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        const state = scanner.getState();
        if (state === 2) { // SCANNING
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) { console.error("[Scanner] stop error:", err); }
    }
    setShowCamera(false);
  }

  async function confirmQuickMove() {
    if (!quickMove || !quickMove.tipo || !user) return;
    setSaving(true);
    const { produto, tipo, quantidade, observacao, documento_ref } = quickMove;
    const novoEstoque = tipo === "entrada" ? produto.estoque_atual + quantidade : Math.max(0, produto.estoque_atual - quantidade);

    // Monta payload de pagamento apenas para saídas
    let pagamentoPayload: Record<string, unknown> = {};
    if (tipo === "saida" && quickMove.forma_pagamento) {
      const valor = parseCurrencyMask(quickMove.valor_mascara);
      const isParcelavel = FORMAS_PARCELAVEIS.includes(quickMove.forma_pagamento);
      const nParc = isParcelavel ? Math.max(1, quickMove.num_parcelas) : 1;
      const taxa = isParcelavel ? quickMove.taxa_juros_mensal : 0;
      const { parcelas, valorTotal } = calcularParcelas(valor, nParc, taxa, quickMove.primeira_parcela);
      pagamentoPayload = {
        forma_pagamento: quickMove.forma_pagamento,
        valor_total: valorTotal,
        num_parcelas: nParc,
        taxa_juros_mensal: taxa,
        primeira_parcela: quickMove.primeira_parcela,
        parcelas,
      };
    }

    const { error: moveErr } = await supabase.from(tbl.movimentacoes as any).insert({
      user_id: user.id, produto_id: produto.id, tipo, quantidade,
      observacao: observacao || null, documento_ref: documento_ref || null,
      ...pagamentoPayload,
    });
    if (moveErr) { toast.error("Erro ao registrar movimentação"); setSaving(false); return; }
    const { error: updErr } = await supabase.from(tbl.produtos as any).update({ estoque_atual: novoEstoque }).eq("id", produto.id);
    if (updErr) { toast.error("Erro ao atualizar estoque"); setSaving(false); return; }
    toast.success(`${tipo === "entrada" ? "Entrada" : "Saída"} registrada — Novo saldo: ${novoEstoque} ${produto.unidade}`);
    setQuickMove(null); setSaving(false); fetchAll();
  }

  async function approvePendente(pend: {id: string; produto_id: string; quantidade: number}) {
    if (!user) return;
    const prod = produtoMap.get(pend.produto_id);
    if (!prod) return;
    setSaving(true);
    const novoEstoque = Math.max(0, prod.estoque_atual - pend.quantidade);
    await Promise.all([
      supabase.from(tbl.movimentacoes as any).insert({
        user_id: user.id, produto_id: pend.produto_id, tipo: "saida",
        quantidade: pend.quantidade, observacao: "Baixa por bipagem",
      }),
      supabase.from(tbl.produtos as any).update({ estoque_atual: novoEstoque }).eq("id", pend.produto_id),
      supabase.from(tbl.pendentes as any).delete().eq("id", pend.id),
    ]);
    toast.success(`Baixa: ${prod.nome} → ${novoEstoque} ${prod.unidade}`);
    setSaving(false);
    fetchAll();
  }

  async function rejectPendente(id: string) {
    await supabase.from(tbl.pendentes as any).delete().eq("id", id);
    toast.success("Removido da fila");
    fetchAll();
  }

  async function approveAll() {
    if (!user || pendentes.length === 0) return;
    setSaving(true);
    for (const pend of pendentes) {
      const prod = produtoMap.get(pend.produto_id);
      if (!prod) continue;
      const novoEstoque = Math.max(0, prod.estoque_atual - pend.quantidade);
      await Promise.all([
        supabase.from(tbl.movimentacoes as any).insert({
          user_id: user.id, produto_id: pend.produto_id, tipo: "saida",
          quantidade: pend.quantidade, observacao: "Baixa por bipagem",
        }),
        supabase.from(tbl.produtos as any).update({ estoque_atual: novoEstoque }).eq("id", pend.produto_id),
        supabase.from(tbl.pendentes as any).delete().eq("id", pend.id),
      ]);
    }
    toast.success(`${pendentes.length} baixa(s) confirmada(s)`);
    setSaving(false);
    fetchAll();
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formNome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (saving) return; // Prevent double submit
    setSaving(true);

    // Upload new photos and merge with existing previews (URLs)
    const existingUrls = formFotoPreviews.filter(p => p.startsWith("http"));
    const newFiles = formFotos;
    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-photos").upload(filePath, file);
      if (uploadErr) { toast.error("Erro ao enviar foto"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("product-photos").getPublicUrl(filePath);
      uploadedUrls.push(urlData.publicUrl);
    }
    const allUrls = [...existingUrls, ...uploadedUrls];
    const fotoUrl = allUrls.length > 0 ? JSON.stringify(allUrls) : null;

    const payload: any = {
      nome: formNome.trim(),
      codigo_barras: formSemCodigo
        ? (editProduct?.codigo_barras?.startsWith("INT") ? editProduct.codigo_barras : `INT${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`)
        : (formCodigo.trim() || null),
      categoria: formCategoria.trim() || null, unidade: formUnidade || "un",
      estoque_minimo: parseFloat(formEstoqueMin) || 1, estoque_atual: parseFloat(formEstoqueAtual) || 0,
      preco_custo: formPrecoCusto ? parseCurrencyMask(formPrecoCusto) : null,
      preco_venda: formPrecoVenda ? parseCurrencyMask(formPrecoVenda) : null,
      numero_serie: formNumeroSerie.trim() || null,
      fornecedor_id: formFornecedor || null,
      registro_anvisa: formRegistroAnvisa.trim() || null,
      fabricante: formFabricante.trim() || null,
      validade: formValidadeIsento ? null : (formValidade || null),
      local_estoque: formLocalEstoque.trim() || null,
      nome_comercial: formNomeComercial.trim() || null,
      lote: formLote.trim() || null,
      foto_url: fotoUrl,
    };

    let error;
    if (editProduct) {
      // Don't overwrite user_id on edit — preserve original owner
      ({ error } = await supabase.from(tbl.produtos as any).update(payload).eq("id", editProduct.id));
    } else {
      // Only set user_id on new products
      payload.user_id = user.id;
      ({ error } = await supabase.from(tbl.produtos as any).insert(payload));
    }
    if (error) { toast.error(error.message.includes("unique") ? "Código de barras já cadastrado" : "Erro ao salvar produto"); setSaving(false); return; }
    toast.success(editProduct ? "Produto atualizado" : "Produto cadastrado");
    if (!editProduct) {
      const savedCodigo = (payload as any).codigo_barras;
      setLabelData({
        produto: formNome.trim(),
        nome_comercial: formNomeComercial.trim() || null,
        fabricante: formFabricante.trim() || null,
        lote: formLote.trim() || null,
        registro_anvisa: formRegistroAnvisa.trim() || null,
        validade: formValidade || null,
        codigo_barras: savedCodigo,
        estoque: estoqueSource,
      });
      setTimeout(() => triggerPrint(), 300);
    }
    resetForm(); setSaving(false); fetchAll();
  }

  function resetForm() {
    setShowForm(false); setEditProduct(null);
    setFormNome(""); setFormCodigo(""); setFormSemCodigo(false); setFormCategoria(""); setFormUnidade("un");
    setFormEstoqueMin("1"); setFormEstoqueAtual("0"); setFormPrecoCusto(""); setFormPrecoVenda("");
    setFormNumeroSerie(""); setFormFornecedor("");
    setFormRegistroAnvisa(""); setFormFabricante(""); setFormValidade(""); setFormValidadeIsento(false); setFormLocalEstoque("");
    setFormNomeComercial(""); setFormLote("");
    setFormFotos([]); setFormFotoPreviews([]);
  }

  function openEdit(p: Produto) {
    setEditProduct(p); setFormNome(p.nome); setFormCodigo(p.codigo_barras || ""); setFormSemCodigo(p.codigo_barras?.startsWith("INT") || false);
    setFormCategoria(p.categoria || ""); setFormUnidade(p.unidade);
    setFormEstoqueMin(String(p.estoque_minimo)); setFormEstoqueAtual(String(p.estoque_atual));
    setFormPrecoCusto(p.preco_custo != null ? numberToCurrencyMask(p.preco_custo) : "");
    setFormPrecoVenda(p.preco_venda != null ? numberToCurrencyMask(p.preco_venda) : "");
    setFormNumeroSerie(p.numero_serie || ""); setFormFornecedor(p.fornecedor_id || "");
    setFormRegistroAnvisa(p.registro_anvisa || ""); setFormFabricante(p.fabricante || "");
    setFormValidade(p.validade || ""); setFormValidadeIsento(!p.validade && p.id ? true : false);
    setFormLocalEstoque(p.local_estoque || "");
    setFormNomeComercial(p.nome_comercial || ""); setFormLote(p.lote || "");
    setFormFotos([]); setFormFotoPreviews(parseFotoUrls(p.foto_url));
    setShowForm(true);
  }

  async function handleDeleteProduct(p: Produto) {
    if (!confirm(`Tem certeza que deseja excluir "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from(tbl.produtos as any).delete().eq("id", p.id);
    if (error) { toast.error("Erro ao excluir produto"); return; }
    setProdutos(prev => prev.filter(x => x.id !== p.id));
    toast.success("Produto excluído");
  }

  function exportMovCSV() {
    const rows = filteredMov.map(m => {
      const p = produtoMap.get(m.produto_id);
      const d = new Date(m.created_at);
      return [
        `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        p?.nome || "", p?.codigo_barras || "", TIPO_LABELS[m.tipo] || m.tipo,
        m.quantidade, m.cliente || "", m.vendedor_id ? vendedorMap.get(m.vendedor_id) || "" : "",
        m.documento_ref || "", m.observacao || "",
      ].map(v => `"${v}"`).join(",");
    });
    const csv = ["Data,Produto,Código de Barras,Tipo,Quantidade,Cliente,Vendedor,Documento,Observação", ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `movimentacoes_${movFilterAno}-${String(movFilterMes + 1).padStart(2, "0")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  function getInventarioData() {
    const ativos = produtos.filter(p => p.ativo);
    const header = ["Nome", "Nome Comercial", "Código Barras", "Categoria", "Fabricante", "Lote", "Registro ANVISA", "Validade", "Local", "Estoque Atual", "Estoque Mín.", "Unidade", "Preço Custo", "Preço Venda", "Valor Total Venda", "Fornecedor", "Nº Série"];
    const rows = ativos.map(p => {
      const forn = fornecedores.find(f => f.id === p.fornecedor_id);
      return [
        p.nome, p.nome_comercial || "", p.codigo_barras || "", p.categoria || "",
        p.fabricante || "", p.lote || "", p.registro_anvisa || "",
        p.validade ? p.validade.split("-").reverse().join("/") : "Isento",
        p.local_estoque || "", p.estoque_atual, p.estoque_minimo, p.unidade,
        p.preco_custo ?? "", p.preco_venda ?? "",
        p.preco_venda != null ? p.estoque_atual * p.preco_venda : "",
        forn?.nome || "", p.numero_serie || "",
      ];
    });
    return { header, rows };
  }

  function exportInventarioCSV() {
    const { header, rows } = getInventarioData();
    const csvRows = rows.map(r => r.map(v => `"${typeof v === "number" ? String(v).replace(".", ",") : v}"`).join(","));
    const csv = [header.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    const srcLabel = estoqueSource === "dsh" ? "DSH" : "DMedical";
    a.download = `inventario_${srcLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Relatório CSV exportado");
  }

  function exportInventarioXLSX() {
    import("xlsx").then(XLSX => {
      const { header, rows } = getInventarioData();
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      // Auto-size columns
      ws["!cols"] = header.map((h, i) => {
        const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? "").length));
        return { wch: Math.min(maxLen + 2, 40) };
      });
      // Format currency columns (12=Custo, 13=Venda, 14=Total)
      rows.forEach((_, ri) => {
        [12, 13, 14].forEach(ci => {
          const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
          if (cell && typeof cell.v === "number") cell.z = '#,##0.00';
        });
      });
      const wb = XLSX.utils.book_new();
      const srcLabel = estoqueSource === "dsh" ? "DSH" : "DMedical";
      XLSX.utils.book_append_sheet(wb, ws, "Inventário");
      XLSX.writeFile(wb, `inventario_${srcLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Relatório XLSX exportado");
    });
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (loading) return <ListSkeleton />;

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "produtos", label: "Produtos", badge: totalSKUs },
    { key: "movimentacoes", label: "Movimentações" },
    { key: "alertas", label: "Saúde", badge: (belowMin + outOfStock.length + expiringProducts.length) > 0 ? belowMin + outOfStock.length + expiringProducts.length : undefined },
    { key: "aguardando", label: "Aguardando", badge: pendentes.length > 0 ? pendentes.length : undefined },
  ];

  return (
    <div className="space-y-5 pb-24">
      {/* Estoque Source Segmented Control */}
      <div className="segmented-control">
        <button onClick={() => { setEstoqueSource("dsh"); setLoading(true); }}
          className={`segmented-btn ${estoqueSource === "dsh" ? "active" : ""}`}>
          Estoque DSH
        </button>
        <button onClick={() => { setEstoqueSource("dmedical"); setLoading(true); }}
          className={`segmented-btn ${estoqueSource === "dmedical" ? "active" : ""}`}>
          Estoque DMedical
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
          {belowMin > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(255,69,58,0.15)', color: '#FF453A' }}>
              <AlertTriangle className="h-3 w-3" />{belowMin}
            </span>
          )}
          {autoScanMode && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(10,132,255,0.15)', color: '#0A84FF' }}>
              <Barcode className="h-3 w-3 animate-pulse" />Bipando
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented-control">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`segmented-btn ${activeTab === t.key ? "active" : ""}`}>
            {t.label}
            {t.badge != null && <span className="ml-1 text-[10px] opacity-60">({t.badge})</span>}
          </button>
        ))}
      </div>

      {/* ===== TAB: PRODUTOS ===== */}
      {activeTab === "produtos" && (
        <>
          {/* Search + Camera */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && searchQuery.trim().length >= 4) handleBarcodeScan(searchQuery.trim()); }}
                className="ios-input w-full pl-10" placeholder="Buscar por nome ou código de barras..." />
            </div>
            <button onClick={startCamera} className="p-3 rounded-xl bg-secondary hover:bg-muted transition" title="Scanner câmera">
              <Camera className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Inventory Export + Product List */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="ios-section-title mb-0">PRODUTOS ({filtered.length})</p>
              {filtered.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={exportInventarioCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted transition">
                    <Download className="h-3.5 w-3.5" />CSV
                  </button>
                  <button onClick={exportInventarioXLSX} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted transition">
                    <Download className="h-3.5 w-3.5" />XLSX
                  </button>
                </div>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="ios-list-group">
                {filtered.map(p => {
                  const isBelowMin = p.estoque_atual < p.estoque_minimo;
                  return (
                    <div key={p.id} className="ios-list-item gap-3">
                      {(() => {
                        const fotos = parseFotoUrls(p.foto_url);
                        return fotos.length > 0 ? (
                          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setFotoModalUrl(fotos[0])}>
                            <img src={fotos[0]} alt={p.nome} className="w-10 h-10 rounded-lg object-cover" />
                            {fotos.length > 1 && (
                              <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">+{fotos.length - 1}</span>
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{p.nome}</span>
                          {p.preco_venda != null && <span className="text-xs font-semibold text-primary">{formatCurrency(p.preco_venda)}</span>}
                          {p.categoria && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{p.categoria}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {p.codigo_barras && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Barcode className="h-3 w-3" />{p.codigo_barras}</span>}
                          <span className="text-[11px] text-muted-foreground">Mín: {p.estoque_minimo}</span>
                          {p.fabricante && <span className="text-[11px] text-muted-foreground">• {p.fabricante}</span>}
                          {p.local_estoque && <span className="text-[11px] text-muted-foreground">📍 {p.local_estoque}</span>}
                          {p.validade ? (() => {
                            const [y, m, d] = p.validade.split("-").map(Number);
                            const expDate = new Date(y, m - 1, d);
                            const diff = Math.ceil((expDate.getTime() - new Date().getTime()) / 86400000);
                            if (diff <= 30) {
                              const color = diff <= 0 ? '#FF453A' : diff <= 7 ? '#FF9500' : '#FFD60A';
                              return <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ color, background: `${color}15` }}>{diff <= 0 ? 'Vencido' : `Val: ${diff}d`}</span>;
                            }
                            return null;
                          })() : <span className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">Isento</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right mr-1">
                          <span className={`text-lg font-bold ${isBelowMin ? '' : 'text-foreground'}`}
                            style={isBelowMin ? { color: '#FF453A' } : {}}>{p.estoque_atual}</span>
                          <span className="text-[10px] text-muted-foreground ml-0.5">{p.unidade}</span>
                          {isBelowMin && (
                            <div className="flex items-center justify-end gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" style={{ color: '#FF453A' }} />
                              <span className="text-[9px] font-medium" style={{ color: '#FF453A' }}>Baixo</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setQuickMove({ produto: p, tipo: null, quantidade: 1, observacao: "", documento_ref: "", forma_pagamento: "", valor_mascara: numberToCurrencyMask(Number(p.preco_venda) || 0), num_parcelas: 1, taxa_juros_mensal: 0, primeira_parcela: new Date().toISOString().slice(0,10) })}
                          className="p-1.5 rounded-lg hover:bg-muted" title="Movimentar">
                          <ArrowDownToLine className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => {
                          setLabelData({
                            produto: p.nome,
                            nome_comercial: p.nome_comercial,
                            fabricante: p.fabricante,
                            lote: p.lote,
                            registro_anvisa: p.registro_anvisa,
                            validade: p.validade,
                            codigo_barras: p.codigo_barras,
                            estoque: estoqueSource,
                          });
                          setTimeout(() => triggerPrint(), 300);
                        }} className="p-1.5 rounded-lg hover:bg-muted" title="Reimprimir Etiqueta">
                          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDeleteProduct(p)} className="p-1.5 rounded-lg hover:bg-destructive/10" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== TAB: MOVIMENTAÇÕES ===== */}
      {activeTab === "movimentacoes" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Entradas</p>
              <p className="text-xl font-bold" style={{ color: '#30D158' }}>{movSummary.entradas}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Saídas</p>
              <p className="text-xl font-bold" style={{ color: '#FF453A' }}>{movSummary.saidas}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Saldo</p>
              <p className={`text-xl font-bold ${movSummary.saldo >= 0 ? '' : ''}`}
                style={{ color: movSummary.saldo >= 0 ? '#30D158' : '#FF453A' }}>
                {movSummary.saldo >= 0 ? '+' : ''}{movSummary.saldo}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={movFilterProduto} onChange={e => setMovFilterProduto(e.target.value)}
              className="ios-input text-xs flex-1 min-w-[120px]">
              <option value="">Todos produtos</option>
              {produtos.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select value={movFilterTipo} onChange={e => setMovFilterTipo(e.target.value)}
              className="ios-input text-xs">
              <option value="">Todos tipos</option>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={movFilterVendedor} onChange={e => setMovFilterVendedor(e.target.value)}
              className="ios-input text-xs">
              <option value="">Todos vendedores</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
            <select value={`${movFilterMes}-${movFilterAno}`} onChange={e => {
              const [m, y] = e.target.value.split("-"); setMovFilterMes(Number(m)); setMovFilterAno(Number(y));
            }} className="ios-input text-xs">
              {MESES.map((m, i) => <option key={i} value={`${i}-${now.getFullYear()}`}>{m.substring(0, 3)} {now.getFullYear()}</option>)}
            </select>
          </div>

          {/* Export */}
          {filteredMov.length > 0 && (
            <div className="flex justify-end">
              <button onClick={exportMovCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-muted transition">
                <Download className="h-3.5 w-3.5" />Exportar CSV
              </button>
            </div>
          )}

          {/* Table */}
          <div>
            <p className="ios-section-title">MOVIMENTAÇÕES ({filteredMov.length})</p>
            {filteredMov.length === 0 ? (
              <div className="text-center py-12">
                <RotateCcw className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma movimentação no período</p>
              </div>
            ) : (
              <div className="ios-list-group">
                {filteredMov.map(m => {
                  const p = produtoMap.get(m.produto_id);
                  return (
                    <div key={m.id} className="ios-list-item">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: (TIPO_COLORS[m.tipo] || '#8E8E93') + '20', color: TIPO_COLORS[m.tipo] || '#8E8E93' }}>
                            {TIPO_LABELS[m.tipo] || m.tipo}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">{p?.nome || "?"}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{formatDateTime(m.created_at)}</span>
                          {m.cliente && <span className="text-[11px] text-muted-foreground">• {m.cliente}</span>}
                          {m.vendedor_id && <span className="text-[11px] text-muted-foreground">• {vendedorMap.get(m.vendedor_id)}</span>}
                          {m.documento_ref && <span className="text-[11px] text-muted-foreground">• NF: {m.documento_ref}</span>}
                          {m.observacao && <span className="text-[11px] text-muted-foreground italic">• {m.observacao}</span>}
                        </div>
                      </div>
                      <span className="text-lg font-bold flex-shrink-0" style={{ color: TIPO_COLORS[m.tipo] || '#8E8E93' }}>
                        {m.tipo === "entrada" || m.tipo === "devolucao" ? "+" : "-"}{m.quantidade}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== TAB: ALERTAS / SAÚDE ===== */}
      {activeTab === "alertas" && (
        <>
          {/* Health Dashboard */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <Package className="h-4 w-4 mb-1 text-primary" />
              <p className="text-2xl font-bold text-foreground">{totalSKUs}</p>
              <p className="text-[11px] text-muted-foreground">SKUs cadastrados</p>
            </div>
            <div className="glass-card p-4">
              <TrendingUp className="h-4 w-4 mb-1" style={{ color: '#30D158' }} />
              <p className="text-2xl font-bold text-foreground">{formatCurrency(valorTotal)}</p>
              <p className="text-[11px] text-muted-foreground">Valor em estoque (venda)</p>
            </div>
          </div>

          {/* Out of stock */}
          {outOfStock.length > 0 && (
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: '#FF453A' }} />
                <h3 className="text-sm font-semibold text-foreground">Em falta ({outOfStock.length})</h3>
              </div>
              {outOfStock.map(p => (
                <button key={p.id} onClick={() => { setActiveTab("produtos"); setSearchQuery(p.nome); }}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition flex items-center justify-between"
                  style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)' }}>
                  <span className="text-xs text-foreground">{p.nome}</span>
                  <span className="text-[10px] font-bold" style={{ color: '#FF453A' }}>Zerado</span>
                </button>
              ))}
            </div>
          )}

          {/* Below minimum */}
          {belowMin > 0 && (
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: '#FFD60A' }} />
                <h3 className="text-sm font-semibold text-foreground">Abaixo do mínimo ({belowMin})</h3>
              </div>
              {produtos.filter(p => p.ativo && p.estoque_atual < p.estoque_minimo && p.estoque_atual > 0).map(p => (
                <button key={p.id} onClick={() => { setActiveTab("produtos"); setSearchQuery(p.nome); }}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition flex items-center justify-between"
                  style={{ background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.15)' }}>
                  <span className="text-xs text-foreground">{p.nome}</span>
                  <span className="text-[10px] text-muted-foreground">{p.estoque_atual}/{p.estoque_minimo}</span>
                </button>
              ))}
            </div>
          )}

          {/* Idle products */}
          {idleProducts.length > 0 && (
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Sem movimento há 60+ dias ({idleProducts.length})</h3>
              </div>
              {idleProducts.slice(0, 10).map(p => (
                <button key={p.id} onClick={() => { setActiveTab("produtos"); setSearchQuery(p.nome); }}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition flex items-center justify-between bg-muted/50 border border-border">
                  <span className="text-xs text-foreground">{p.nome}</span>
                  <span className="text-[10px] text-muted-foreground">Estoque: {p.estoque_atual}</span>
                </button>
              ))}
              {idleProducts.length > 10 && <p className="text-[10px] text-center text-muted-foreground">+{idleProducts.length - 10} itens</p>}
            </div>
          )}

          {/* Expiring products */}
          {expiringProducts.length > 0 && (
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" style={{ color: '#FF9500' }} />
                <h3 className="text-sm font-semibold text-foreground">Validade próxima ou vencido ({expiringProducts.length})</h3>
              </div>
              {expiringProducts.map(p => {
                const isExpired = p.diffDays <= 0;
                const color = isExpired ? '#FF453A' : p.diffDays <= 7 ? '#FF9500' : '#FFD60A';
                const label = isExpired ? 'Vencido' : `${p.diffDays} dia${p.diffDays !== 1 ? 's' : ''}`;
                return (
                  <button key={p.id} onClick={() => { setActiveTab("produtos"); setSearchQuery(p.nome); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition flex items-center justify-between"
                    style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
                    <div>
                      <span className="text-xs text-foreground">{p.nome}</span>
                      {p.validade && <span className="text-[10px] text-muted-foreground ml-2">Val: {p.validade.split("-").reverse().join("/")}</span>}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Top 10 chart */}
          {top10.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 mais movimentados — {MESES[now.getMonth()]}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={top10} layout="vertical" barCategoryGap="20%">
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={100} axisLine={false} tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 12 }} />
                  <Bar dataKey="qty" fill="#0A84FF" radius={[0, 6, 6, 0]} name="Qtd" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {belowMin === 0 && outOfStock.length === 0 && idleProducts.length === 0 && expiringProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Estoque saudável!</p>
              <p className="text-xs text-muted-foreground">Nenhum alerta no momento</p>
            </div>
          )}
        </>
      )}

      {/* ===== TAB: AGUARDANDO ===== */}
      {activeTab === "aguardando" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Itens aguardando confirmação de baixa</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-muted-foreground">Bipagem</span>
                <button onClick={() => setAutoScanMode(!autoScanMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${autoScanMode ? 'bg-primary' : 'bg-secondary'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoScanMode ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </label>
              {autoScanMode && (
                <button onClick={startCamera} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground">
                  <Camera className="h-3.5 w-3.5" />Câmera
                </button>
              )}
            </div>
          </div>

          {autoScanMode && (
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)' }}>
              <Barcode className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-xs text-foreground">Modo bipagem ativo — escaneie ou bipe os produtos para adicionar à fila</p>
            </div>
          )}

          {pendentes.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum item na fila</p>
              <p className="text-xs text-muted-foreground mt-1">Ative o modo bipagem e escaneie os produtos</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="ios-list-group">
                {pendentes.map(pend => {
                  const prod = produtoMap.get(pend.produto_id);
                  return (
                    <div key={pend.id} className="ios-list-item">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{prod?.nome || "?"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(pend.created_at).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {prod?.codigo_barras && ` · ${prod.codigo_barras}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold" style={{ color: '#FF453A' }}>-{pend.quantidade}</span>
                        {canApprove && (
                          <button onClick={() => approvePendente(pend)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#30D158' }}>
                            OK
                          </button>
                        )}
                        {canApprove && (
                          <button onClick={() => rejectPendente(pend.id)}
                            className="p-1.5 rounded-lg hover:bg-muted">
                            <X className="h-3.5 w-3.5" style={{ color: '#FF453A' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {canApprove && (
                <button onClick={approveAll} disabled={saving}
                  className="w-full h-12 rounded-xl text-base font-semibold text-white disabled:opacity-50"
                  style={{ background: '#30D158' }}>
                  {saving ? "Processando..." : `Confirmar todas as baixas (${pendentes.length})`}
                </button>
              )}
              {!canApprove && (
                <p className="text-center text-sm text-muted-foreground py-3">
                  Aguardando aprovação de um Controlador ou Admin
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== MODALS ===== */}

      {/* Camera */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="relative w-full max-w-md mx-4">
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Scanner</h3></div>
                <button onClick={stopCamera}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div id="barcode-scanner-div" className="w-full rounded-xl overflow-hidden" />
              <p className="text-xs text-center text-muted-foreground">Aponte a câmera para o código de barras</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Move */}
      {quickMove && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md mx-4 mb-4 md:mb-0">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Barcode className="h-4 w-4 text-primary" /><h3 className="text-base font-semibold text-foreground">Movimentação Rápida</h3></div>
                <button onClick={() => setQuickMove(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="p-3 rounded-xl bg-secondary">
                <p className="text-lg font-bold text-foreground">{quickMove.produto.nome}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground">Estoque: <span className="font-semibold text-foreground">{quickMove.produto.estoque_atual} {quickMove.produto.unidade}</span></span>
                  {quickMove.produto.codigo_barras && <span className="text-xs text-muted-foreground">Cód: {quickMove.produto.codigo_barras}</span>}
                </div>
              </div>
              {!quickMove.tipo ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setQuickMove({ ...quickMove, tipo: "entrada" })}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl" style={{ background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)' }}>
                    <ArrowDownToLine className="h-8 w-8" style={{ color: '#30D158' }} />
                    <span className="text-base font-semibold" style={{ color: '#30D158' }}>Entrada</span>
                  </button>
                  <button onClick={() => setQuickMove({ ...quickMove, tipo: "saida" })}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl" style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)' }}>
                    <ArrowUpFromLine className="h-8 w-8" style={{ color: '#FF453A' }} />
                    <span className="text-base font-semibold" style={{ color: '#FF453A' }}>Saída</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {quickMove.tipo === "entrada" ? <ArrowDownToLine className="h-4 w-4" style={{ color: '#30D158' }} /> : <ArrowUpFromLine className="h-4 w-4" style={{ color: '#FF453A' }} />}
                    <span className="text-sm font-semibold" style={{ color: quickMove.tipo === "entrada" ? '#30D158' : '#FF453A' }}>{quickMove.tipo === "entrada" ? "Entrada" : "Saída"}</span>
                    <button onClick={() => setQuickMove({ ...quickMove, tipo: null })} className="ml-auto text-xs text-primary">Alterar</button>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Quantidade</label>
                    <input type="number" min="1" value={quickMove.quantidade}
                      onChange={e => setQuickMove({ ...quickMove, quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="ios-input w-full text-center text-xl font-bold" />
                  </div>
                  {quickMove.tipo === "entrada" && (
                    <div>
                      <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Documento / NF</label>
                      <input value={quickMove.documento_ref}
                        onChange={e => setQuickMove({ ...quickMove, documento_ref: e.target.value })}
                        className="ios-input w-full" placeholder="Nº da nota fiscal" />
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Observação (opcional)</label>
                    <input value={quickMove.observacao}
                      onChange={e => setQuickMove({ ...quickMove, observacao: e.target.value })}
                      className="ios-input w-full" placeholder="Ex: Reposição" />
                  </div>
                  {quickMove.tipo === "saida" && (
                    <div className="space-y-3 p-3 rounded-xl border border-border/60 bg-secondary/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Pagamento</span>
                        <span className="text-[10px] text-muted-foreground">opcional</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Forma de pagamento</label>
                        <select
                          value={quickMove.forma_pagamento}
                          onChange={e => setQuickMove({ ...quickMove, forma_pagamento: e.target.value as any, num_parcelas: 1 })}
                          className="ios-input w-full"
                        >
                          <option value="">— Não registrar —</option>
                          {(Object.keys(FORMA_PAGAMENTO_LABELS) as (keyof typeof FORMA_PAGAMENTO_LABELS)[]).map(k => (
                            <option key={k} value={k}>{FORMA_PAGAMENTO_LABELS[k]}</option>
                          ))}
                        </select>
                      </div>
                      {quickMove.forma_pagamento && (
                        <>
                          <div>
                            <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Valor total</label>
                            <input
                              value={quickMove.valor_mascara}
                              onChange={e => setQuickMove({ ...quickMove, valor_mascara: applyCurrencyMask(e.target.value) })}
                              className="ios-input w-full" placeholder="R$ 0,00" inputMode="numeric"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Data da 1ª parcela</label>
                            <DateInput
                              value={quickMove.primeira_parcela}
                              onChange={v => setQuickMove({ ...quickMove, primeira_parcela: v })}
                            />
                          </div>
                          {FORMAS_PARCELAVEIS.includes(quickMove.forma_pagamento) && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Nº parcelas</label>
                                <input
                                  type="number" min={1} max={36}
                                  value={quickMove.num_parcelas}
                                  onChange={e => setQuickMove({ ...quickMove, num_parcelas: Math.max(1, Math.min(36, parseInt(e.target.value) || 1)) })}
                                  className="ios-input w-full text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Juros % a.m.</label>
                                <input
                                  type="number" min={0} step="0.01"
                                  value={quickMove.taxa_juros_mensal}
                                  onChange={e => setQuickMove({ ...quickMove, taxa_juros_mensal: Math.max(0, parseFloat(e.target.value) || 0) })}
                                  className="ios-input w-full text-center"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                          )}
                          {(() => {
                            const valor = parseCurrencyMask(quickMove.valor_mascara);
                            if (!valor) return null;
                            const isParc = FORMAS_PARCELAVEIS.includes(quickMove.forma_pagamento);
                            const n = isParc ? Math.max(1, quickMove.num_parcelas) : 1;
                            const taxa = isParc ? quickMove.taxa_juros_mensal : 0;
                            const { parcelas, valorParcela, valorTotal } = calcularParcelas(valor, n, taxa, quickMove.primeira_parcela);
                            return (
                              <div className="rounded-lg bg-background/60 border border-border/50 p-2 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">
                                    {n}× de <span className="text-foreground font-semibold">{formatCurrency(valorParcela)}</span>
                                  </span>
                                  <span className="text-muted-foreground">Total: <span className="text-foreground font-semibold">{formatCurrency(valorTotal)}</span></span>
                                </div>
                                {n > 1 && (
                                  <div className="max-h-32 overflow-y-auto mt-1 space-y-0.5">
                                    {parcelas.map(p => (
                                      <div key={p.numero} className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>#{p.numero} · {formatDateBR(p.vencimento)}</span>
                                        <span className="text-foreground">{formatCurrency(p.valor)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                  <div className="p-2 rounded-lg bg-muted text-center">
                    <span className="text-xs text-muted-foreground">Novo saldo: </span>
                    <span className="text-sm font-bold text-foreground">
                      {quickMove.tipo === "entrada" ? quickMove.produto.estoque_atual + quickMove.quantidade : Math.max(0, quickMove.produto.estoque_atual - quickMove.quantidade)} {quickMove.produto.unidade}
                    </span>
                  </div>
                  <button onClick={confirmQuickMove} disabled={saving}
                    className="w-full h-12 rounded-xl text-base font-semibold text-foreground disabled:opacity-50"
                    style={{ background: quickMove.tipo === "entrada" ? '#30D158' : '#FF453A' }}>
                    {saving ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg mx-4 mb-4 md:mb-0 max-h-[85vh] overflow-y-auto">
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">{editProduct ? "Editar Produto" : "Novo Produto"}</h3>
                <button onClick={resetForm}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                {/* Photo upload - multiple */}
                <div>
                  <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Fotos do Produto</label>
                  <div className="flex flex-wrap gap-2">
                    {formFotoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img src={preview} alt={`Foto ${idx + 1}`} className="w-16 h-16 rounded-xl object-cover border border-border cursor-pointer"
                          onClick={() => setFotoModalUrl(preview)} />
                        <button type="button" onClick={() => {
                          const newPreviews = [...formFotoPreviews]; newPreviews.splice(idx, 1);
                          setFormFotoPreviews(newPreviews);
                          // If it was a new file (blob:), also remove from formFotos
                          if (preview.startsWith("blob:")) {
                            const blobIdx = formFotoPreviews.slice(0, idx).filter(p => p.startsWith("blob:")).length;
                            const newFiles = [...formFotos]; newFiles.splice(blobIdx, 1); setFormFotos(newFiles);
                          }
                        }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => fotoInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">Foto</span>
                    </button>
                  </div>
                  <input ref={fotoInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setFormFotos(prev => [...prev, ...files]);
                        setFormFotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                      }
                      e.target.value = "";
                    }} />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Nome *</label>
                  <input value={formNome} onChange={e => setFormNome(e.target.value)} className="ios-input w-full" placeholder="Nome do produto" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Código de Barras</label>
                    <input value={formCodigo} onChange={e => setFormCodigo(e.target.value)} className="ios-input w-full" placeholder="EAN" disabled={formSemCodigo} />
                    <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                      <input type="checkbox" checked={formSemCodigo} onChange={e => { setFormSemCodigo(e.target.checked); if (e.target.checked) setFormCodigo(""); }}
                        className="rounded border-border" />
                      <span className="text-[10px] text-muted-foreground">Produto sem código de barras</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Categoria</label>
                    <input value={formCategoria} onChange={e => setFormCategoria(e.target.value)} className="ios-input w-full" placeholder="Ex: Peças" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Unidade</label>
                    <input value={formUnidade} onChange={e => setFormUnidade(e.target.value)} className="ios-input w-full" placeholder="un" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Estoque Atual</label>
                    <input type="number" value={formEstoqueAtual} onChange={e => setFormEstoqueAtual(e.target.value)} className="ios-input w-full" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Estoque Mín.</label>
                    <input type="number" value={formEstoqueMin} onChange={e => setFormEstoqueMin(e.target.value)} className="ios-input w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Preço Custo</label>
                    <input value={formPrecoCusto} onChange={e => setFormPrecoCusto(applyCurrencyMask(e.target.value))} className="ios-input w-full" placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Preço Venda</label>
                    <input value={formPrecoVenda} onChange={e => setFormPrecoVenda(applyCurrencyMask(e.target.value))} className="ios-input w-full" placeholder="R$ 0,00" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Nº Série</label>
                  <input value={formNumeroSerie} onChange={e => setFormNumeroSerie(e.target.value)} className="ios-input w-full" placeholder="Opcional" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Registro Anvisa</label>
                    <input value={formRegistroAnvisa} onChange={e => setFormRegistroAnvisa(e.target.value)} className="ios-input w-full" placeholder="Nº registro" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Fabricante</label>
                    <input value={formFabricante} onChange={e => setFormFabricante(e.target.value)} className="ios-input w-full" placeholder="Nome do fabricante" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Nome Comercial</label>
                    <input value={formNomeComercial} onChange={e => setFormNomeComercial(e.target.value)} className="ios-input w-full" placeholder="Nome comercial" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Lote</label>
                    <input value={formLote} onChange={e => setFormLote(e.target.value)} className="ios-input w-full" placeholder="Nº do lote" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Validade</label>
                    <DateInput value={formValidade || ""} onChange={setFormValidade} className="ios-input w-full" disabled={formValidadeIsento} />
                    <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                      <input type="checkbox" checked={formValidadeIsento} onChange={e => { setFormValidadeIsento(e.target.checked); if (e.target.checked) setFormValidade(""); }}
                        className="rounded border-border" />
                      <span className="text-[10px] text-muted-foreground">Isento de validade</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Local de Estoque</label>
                    <input value={formLocalEstoque} onChange={e => setFormLocalEstoque(e.target.value)} className="ios-input w-full" placeholder="Ex: Prateleira A" />
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary disabled:opacity-50">
                  {saving ? "Salvando..." : editProduct ? "Salvar Alterações" : "Cadastrar Produto"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {activeTab === "produtos" && (
        <>
          {/* FAB Menu backdrop */}
          {showFabMenu && (
            <div className="fixed inset-0 z-30" onClick={() => setShowFabMenu(false)} />
          )}

          {/* FAB Options */}
          {showFabMenu && (
            <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3 items-end animate-in fade-in slide-in-from-bottom-4 duration-200">
              <button onClick={() => {
                setShowFabMenu(false);
                setScanForNewProduct(true);
                startCamera();
              }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg bg-card border border-border">
                <Camera className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Escanear com câmera</span>
              </button>
              <button onClick={() => {
                setShowFabMenu(false);
                setScanForNewProduct(true);
                searchRef.current?.focus();
                toast.info("Use o leitor de código de barras USB/Bluetooth");
              }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg bg-card border border-border">
                <Barcode className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Leitor USB / Bluetooth</span>
              </button>
              <button onClick={() => {
                setShowFabMenu(false);
                resetForm();
                setShowForm(true);
              }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg bg-card border border-border">
                <Pencil className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Cadastro manual</span>
              </button>
            </div>
          )}

          {/* FAB Button */}
          <button onClick={() => setShowFabMenu(!showFabMenu)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 bg-primary text-primary-foreground transition-transform"
            style={{ boxShadow: '0 4px 20px rgba(10,132,255,0.4)', transform: showFabMenu ? 'rotate(45deg)' : 'none' }}>
            <Plus className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Hidden label for printing */}
      {labelData && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ProductLabel ref={labelRef} data={labelData} />
        </div>
      )}

      {/* Photo modal */}
      {fotoModalUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setFotoModalUrl(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={fotoModalUrl} alt="Foto do produto" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
            <button onClick={() => setFotoModalUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-lg">
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
