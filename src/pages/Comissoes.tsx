import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { useAppData } from "@/lib/dataContext";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIA_ARRAY, CATEGORIA_LABELS, MESES,
  calcularComissao, formatCurrency, formatDate,
  type Categoria, type Lancamento,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

type StatusFiltro = "todas" | "pagas" | "pendentes";
type Row = Lancamento & { cat: Categoria; comissao: number };

function getDescricao(l: Lancamento) {
  return l.produto || l.servico || l.item || "";
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function Comissoes() {
  const { data, setData, loading, error } = useAppData();
  const { user, canAccess, hasCargo, displayName } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();

  const canManage = hasCargo("admin") || canAccess("com_lancamentos");

  // Filters synced with URL
  const mesParam = parseInt(searchParams.get("mes") || "") - 1;
  const anoParam = parseInt(searchParams.get("ano") || "");
  const catParam = searchParams.get("categoria") as Categoria | "todos" | null;
  const vendParam = searchParams.get("vendedor") || "todos";
  const statusParam = (searchParams.get("status") as StatusFiltro | null) || "todas";

  const filterMonth = isNaN(mesParam) || mesParam < 0 || mesParam > 11 ? now.getMonth() : mesParam;
  const filterYear = isNaN(anoParam) ? now.getFullYear() : anoParam;
  const categoria: Categoria | "todos" =
    catParam && ["produto", "servico", "contrato", "acessorio"].includes(catParam) ? (catParam as Categoria) : "todos";
  const vendedorFiltro = vendParam;
  const statusFiltro: StatusFiltro = statusParam;

  const setParam = (key: string, value: string | null) =>
    setSearchParams(prev => {
      if (value == null || value === "") prev.delete(key);
      else prev.set(key, value);
      return prev;
    }, { replace: true });

  const [searchQuery, setSearchQuery] = useState("");

  // Resolve paid_by → display name via profiles (fetched once)
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
      if (cancelled || !profiles) return;
      const map: Record<string, string> = {};
      for (const p of profiles) map[p.user_id] = p.display_name || "";
      setProfileNames(map);
    })();
    return () => { cancelled = true; };
  }, []);

  const rows: Row[] = useMemo(() => {
    const all: Row[] = [];
    const cats: Categoria[] = categoria === "todos"
      ? ["produto", "servico", "contrato", "acessorio"]
      : [categoria];
    cats.forEach(cat => {
      data.lancamentos[CATEGORIA_ARRAY[cat]].forEach(l => {
        const [y, m] = l.data.split("-").map(Number);
        if ((m - 1) !== filterMonth || y !== filterYear) return;
        if (vendedorFiltro !== "todos" && (l.vendedor || "") !== vendedorFiltro) return;
        const isPago = Boolean(l.paid);
        if (statusFiltro === "pagas" && !isPago) return;
        if (statusFiltro === "pendentes" && isPago) return;
        const q = searchQuery.trim().toLowerCase();
        if (q && !l.cliente.toLowerCase().includes(q) && !getDescricao(l).toLowerCase().includes(q)) return;
        all.push({ ...l, cat, comissao: calcularComissao(cat, l.valor, l.custos ?? 0) });
      });
    });
    all.sort((a, b) => b.data.localeCompare(a.data));
    return all;
  }, [data, categoria, filterMonth, filterYear, vendedorFiltro, statusFiltro, searchQuery]);

  const totals = useMemo(() => {
    let total = 0, pago = 0, pendente = 0;
    rows.forEach(r => {
      total += r.comissao;
      if (r.paid) pago += r.comissao;
      else pendente += r.comissao;
    });
    return { total, pago, pendente };
  }, [rows]);

  const anos = useMemo(() => {
    const set = new Set<number>([filterYear, now.getFullYear()]);
    Object.values(data.lancamentos).flat().forEach(l => {
      const y = parseInt(l.data.split("-")[0]);
      if (!isNaN(y)) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [data, filterYear]);

  // Toggle modal
  const [target, setTarget] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirmToggle() {
    if (!target || !user) return;
    setSaving(true);
    const nextPaid = !target.paid;
    const nowIso = new Date().toISOString();
    const patch = nextPaid
      ? { paid: true, paid_at: nowIso, paid_by: user.id }
      : { paid: false, paid_at: null as string | null, paid_by: null as string | null };

    const { error: dbError } = await supabase
      .from("lancamentos")
      .update(patch)
      .eq("id", target.id);

    if (dbError) {
      setSaving(false);
      toast.error("Não foi possível atualizar o pagamento.");
      return;
    }

    // Update local state so UI is instant (no reload)
    const arrKey = CATEGORIA_ARRAY[target.cat];
    setData(prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [arrKey]: prev.lancamentos[arrKey].map(l =>
          l.id === target.id ? { ...l, ...patch } : l,
        ),
      },
    }));

    // Cache own display name locally for immediate tooltip
    if (nextPaid && displayName) {
      setProfileNames(prev => ({ ...prev, [user.id]: displayName }));
    }

    setSaving(false);
    setTarget(null);
    toast.success(nextPaid ? "Comissão marcada como paga." : "Pagamento cancelado.");
  }

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Comissões</h1>
        <p className="text-sm text-[#64748B]">Controle de pagamento das comissões por lançamento.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Valor Total das Comissões" value={totals.total} color="#0A84FF" />
        <KpiCard label="Valor Total Pago" value={totals.pago} color="#16A34A" />
        <KpiCard label="Valor Total Pendente" value={totals.pendente} color="#DC2626" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Buscar por cliente ou descrição"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <FilterSelect value={String(filterMonth)} onChange={(v) => setParam("mes", String(parseInt(v) + 1))}
            options={MESES.map((m, i) => ({ value: String(i), label: m }))} />
          <FilterSelect value={String(filterYear)} onChange={(v) => setParam("ano", v)}
            options={anos.map(y => ({ value: String(y), label: String(y) }))} />
          <FilterSelect value={categoria} onChange={(v) => setParam("categoria", v === "todos" ? null : v)}
            options={[
              { value: "todos", label: "Todas categorias" },
              ...(Object.keys(CATEGORIA_LABELS) as Categoria[]).map(c => ({ value: c, label: CATEGORIA_LABELS[c] })),
            ]} />
          <FilterSelect value={vendedorFiltro} onChange={(v) => setParam("vendedor", v === "todos" ? null : v)}
            options={[
              { value: "todos", label: "Todos vendedores" },
              ...data.vendedores.map(v => ({ value: v, label: v })),
            ]} />
          <div className="md:col-span-6">
            <div className="inline-flex rounded-[10px] bg-[#F1F5F9] p-1">
              {(["todas", "pagas", "pendentes"] as StatusFiltro[]).map(s => (
                <button
                  key={s}
                  onClick={() => setParam("status", s === "todas" ? null : s)}
                  className={`px-4 py-1.5 text-[12px] font-semibold rounded-[8px] capitalize transition-colors ${
                    statusFiltro === s ? "bg-white text-[#25598C] shadow-sm" : "text-[#64748B] hover:text-[#25598C]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8">
              <EmptyState title="Nenhuma comissão encontrada" description="Ajuste os filtros para visualizar comissões." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-[#94A3B8] border-b border-[#E2E8F0]">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold">Vendedor</th>
                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                    <th className="px-4 py-3 font-semibold text-right">Comissão</th>
                    <th className="px-4 py-3 font-semibold text-center">Status do Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const pagoInfo = formatDateTime(r.paid_at);
                    const paidByName = r.paid_by ? (profileNames[r.paid_by] || "Usuário") : "";
                    const tooltipText = r.paid
                      ? `Pago em ${pagoInfo.date} às ${pagoInfo.time}\npor ${paidByName || "—"}`
                      : "Comissão ainda não foi paga.";
                    return (
                      <tr key={r.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3 text-[#0F172A]">{formatDate(r.data)}</td>
                        <td className="px-4 py-3 text-[#0F172A] font-medium">{r.cliente}</td>
                        <td className="px-4 py-3"><Badge variant="secondary">{CATEGORIA_LABELS[r.cat]}</Badge></td>
                        <td className="px-4 py-3 text-[#475569]">{getDescricao(r) || "—"}</td>
                        <td className="px-4 py-3 text-[#475569]">{r.vendedor || "—"}</td>
                        <td className="px-4 py-3 text-right text-[#0F172A]">{formatCurrency(r.valor)}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#0A84FF" }}>
                          {formatCurrency(r.comissao)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => canManage && setTarget(r)}
                                disabled={!canManage}
                                className={`inline-flex items-center gap-1 rounded-[13px] px-2.5 py-1 text-[11px] font-semibold border transition-transform ${
                                  r.paid
                                    ? "bg-[#DCFCE7] text-[#166534] border-transparent"
                                    : "bg-[#FEE2E2] text-[#B91C1C] border-transparent"
                                } ${canManage ? "hover:scale-[1.03] cursor-pointer" : "cursor-default opacity-90"}`}
                              >
                                {r.paid ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {r.paid ? "Pago" : "Pendente"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="whitespace-pre-line text-[12px]">
                              {tooltipText}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm modal */}
      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.paid ? "Cancelar pagamento" : "Confirmar pagamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.paid
                ? "Deseja marcar esta comissão como pendente novamente?"
                : "Deseja marcar esta comissão como paga?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmToggle(); }} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</p>
        <p className="text-2xl font-bold mt-1" style={{ color }}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}