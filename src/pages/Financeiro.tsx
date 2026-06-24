import { useEffect, useMemo, useState } from "react";
import { Upload, PlusCircle, DollarSign, TrendingUp, FileSpreadsheet, X, Building2, Pencil, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, LineChart, Line, Area, ComposedChart,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask } from "@/lib/currencyMask";
import { useAuth } from "@/lib/authContext";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const META_DEFAULTS = {
  meta_servicos: 32000,
  meta_vendas: 25000,
  meta_contratos: 150000,
  meta_geral: 157000,
};

interface FinanceiroRow {
  id?: string;
  mes: string;
  ano: number;
  empresa: "dsh" | "dmedical";
  servicos_avulsos: number;
  vendas: number;
  contratos: number;
  geral: number;
  custo_produtos: number;
  custos_gerais: number;
  meta_servicos: number;
  meta_vendas: number;
  meta_contratos: number;
  meta_geral: number;
}

type Empresa = "dsh" | "dmedical";
const EMPRESAS: { key: Empresa; label: string }[] = [
  { key: "dsh", label: "DSH" },
  { key: "dmedical", label: "DMedical" },
];

const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const corPct = (pct: number) => {
  if (pct >= 100) return "text-emerald-500";
  if (pct >= 70) return "text-amber-500";
  return "text-red-500";
};
const bgPct = (pct: number) => {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
};
const statusBadge = (pct: number) => {
  if (pct >= 100) return <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-0">Acima da meta</Badge>;
  if (pct >= 70) return <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-0">Próximo</Badge>;
  return <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/20 border-0">Abaixo</Badge>;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function matchMes(label: string): string | null {
  const n = normalize(label);
  return MESES.find((m) => normalize(m) === n) ?? null;
}

export default function Financeiro() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FinanceiroRow[]>([]);
  const [ano, setAno] = useState<number>(2026);
  const [empresa, setEmpresa] = useState<Empresa>("dsh");
  const [openLanc, setOpenLanc] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editMes, setEditMes] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<FinanceiroRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { hasCargo } = useAuth();
  const isAdmin = hasCargo("admin");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("financeiro").select("*").order("ano");
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data || []) as FinanceiroRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const anosDisponiveis = useMemo(() => {
    const s = new Set<number>(rows.map((r) => r.ano));
    s.add(2026);
    return Array.from(s).sort((a, b) => b - a);
  }, [rows]);

  const rowsAno = useMemo(
    () => rows.filter((r) => r.ano === ano && r.empresa === empresa).sort((a, b) => MESES.indexOf(a.mes) - MESES.indexOf(b.mes)),
    [rows, ano, empresa],
  );

  // KPI: mês mais recente disponível no ano
  const ultimo = useMemo(() => {
    if (rowsAno.length === 0) return null;
    return rowsAno[rowsAno.length - 1];
  }, [rowsAno]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const kpis = ultimo
    ? [
        { label: "Serviços Avulsos", valor: ultimo.servicos_avulsos, meta: ultimo.meta_servicos || META_DEFAULTS.meta_servicos },
        { label: "Vendas", valor: ultimo.vendas, meta: ultimo.meta_vendas || META_DEFAULTS.meta_vendas },
        { label: "Contratos", valor: ultimo.contratos, meta: ultimo.meta_contratos || META_DEFAULTS.meta_contratos },
        { label: "Faturamento Geral", valor: ultimo.geral || (ultimo.servicos_avulsos + ultimo.vendas + ultimo.contratos), meta: ultimo.meta_geral || META_DEFAULTS.meta_geral },
      ]
    : [];

  const chartData = MESES.map((m) => {
    const r = rowsAno.find((x) => x.mes === m);
    const geral = r?.geral || ((r?.servicos_avulsos || 0) + (r?.vendas || 0) + (r?.contratos || 0));
    const custos = (r?.custo_produtos || 0) + (r?.custos_gerais || 0);
    return {
      mes: m.slice(0, 3),
      Serviços: r?.servicos_avulsos || 0,
      Vendas: r?.vendas || 0,
      Contratos: r?.contratos || 0,
      Geral: geral,
      Custos: custos,
      Lucro: geral - custos,
      MetaGeral: r?.meta_geral || META_DEFAULTS.meta_geral,
    };
  });

  const totalAno = rowsAno.reduce(
    (acc, r) => ({
      s: acc.s + (r.servicos_avulsos || 0),
      v: acc.v + (r.vendas || 0),
      c: acc.c + (r.contratos || 0),
      g: acc.g + (r.geral || r.servicos_avulsos + r.vendas + r.contratos),
      m: acc.m + (r.meta_geral || META_DEFAULTS.meta_geral),
      cp: acc.cp + (r.custo_produtos || 0),
      cg: acc.cg + (r.custos_gerais || 0),
    }),
    { s: 0, v: 0, c: 0, g: 0, m: 0, cp: 0, cg: 0 },
  );
  const nMeses = rowsAno.length || 1;
  const totalCustosAno = totalAno.cp + totalAno.cg;
  const lucroAno = totalAno.g - totalCustosAno;
  const margemAno = totalAno.g > 0 ? (lucroAno / totalAno.g) * 100 : 0;

  // KPIs de custo do último mês
  const ultimoCustoProd = ultimo?.custo_produtos || 0;
  const ultimoCustoGer = ultimo?.custos_gerais || 0;
  const ultimoCustoTotal = ultimoCustoProd + ultimoCustoGer;
  const ultimoGeral = ultimo ? (ultimo.geral || ultimo.servicos_avulsos + ultimo.vendas + ultimo.contratos) : 0;
  const ultimoLucro = ultimoGeral - ultimoCustoTotal;
  const ultimoMargem = ultimoGeral > 0 ? (ultimoLucro / ultimoGeral) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Faturamento, custos e metas — {EMPRESAS.find(e => e.key === empresa)?.label}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {EMPRESAS.map((e) => (
              <button
                key={e.key}
                onClick={() => setEmpresa(e.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  empresa === e.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" /> {e.label}
              </button>
            ))}
          </div>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setOpenImport(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar XLSX
          </Button>
          <Button onClick={() => setOpenLanc(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Lançar valores
          </Button>
        </div>
      </div>

      {rowsAno.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado financeiro lançado para {EMPRESAS.find(e => e.key === empresa)?.label} em {ano}. Clique em "Lançar valores" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((k) => {
              const pct = k.meta > 0 ? (k.valor / k.meta) * 100 : 0;
              return (
                <Card key={k.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xl font-semibold">{brl(k.valor)}</div>
                    <div className="text-[11px] text-muted-foreground">Meta {brl(k.meta)}</div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${bgPct(pct)} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className={`text-xs font-medium ${corPct(pct)}`}>{pct.toFixed(1)}% da meta</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* KPIs de Custos & Lucro */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custo Produtos (CMV)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold text-amber-500">{brl(ultimoCustoProd)}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Último mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custos Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold text-amber-500">{brl(ultimoCustoGer)}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Último mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Custos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold text-red-500">{brl(ultimoCustoTotal)}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{ultimoGeral > 0 ? ((ultimoCustoTotal / ultimoGeral) * 100).toFixed(1) : "0"}% do faturamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lucro Bruto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-semibold ${ultimoLucro >= 0 ? "text-emerald-500" : "text-red-500"}`}>{brl(ultimoLucro)}</div>
                <p className={`text-[11px] mt-1 ${ultimoMargem >= 20 ? "text-emerald-500" : ultimoMargem >= 0 ? "text-amber-500" : "text-red-500"}`}>
                  Margem {ultimoMargem.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bar chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento por categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={META_DEFAULTS.meta_geral} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Meta Geral", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Bar dataKey="Serviços" fill="hsl(var(--chart-1, 200 80% 55%))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vendas" fill="hsl(var(--chart-2, 160 70% 45%))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Contratos" fill="hsl(var(--chart-3, 280 65% 60%))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Geral" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Faturamento vs Custos vs Lucro */}
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento, Custos e Lucro</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Geral" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Custos" fill="hsl(0 70% 55%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro" fill="hsl(150 65% 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Line chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Evolução Faturamento Geral vs Meta</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="gGeral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Geral" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gGeral)" />
                    <Line type="monotone" dataKey="MetaGeral" stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela anual */}
          <Card>
            <CardHeader><CardTitle className="text-base">Detalhamento anual</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Serviços Avulsos</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Geral</TableHead>
                    <TableHead className="text-right">CMV</TableHead>
                    <TableHead className="text-right">Custos Gerais</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Meta Geral</TableHead>
                    <TableHead className="text-right">% Atingido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MESES.map((m) => {
                    const r = rowsAno.find((x) => x.mes === m);
                    if (!r) {
                      return (
                        <TableRow key={m}>
                          <TableCell>{m}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                        </TableRow>
                      );
                    }
                    const geral = r.geral || r.servicos_avulsos + r.vendas + r.contratos;
                    const meta = r.meta_geral || META_DEFAULTS.meta_geral;
                    const pct = meta > 0 ? (geral / meta) * 100 : 0;
                    const custosMes = (r.custo_produtos || 0) + (r.custos_gerais || 0);
                    const lucroMes = geral - custosMes;
                    return (
                      <TableRow key={m}>
                        <TableCell className="font-medium">{m}</TableCell>
                        <TableCell className="text-right">{brl(r.servicos_avulsos)}</TableCell>
                        <TableCell className="text-right">{brl(r.vendas)}</TableCell>
                        <TableCell className="text-right">{brl(r.contratos)}</TableCell>
                        <TableCell className="text-right font-medium">{brl(geral)}</TableCell>
                        <TableCell className="text-right text-amber-500">{brl(r.custo_produtos || 0)}</TableCell>
                        <TableCell className="text-right text-amber-500">{brl(r.custos_gerais || 0)}</TableCell>
                        <TableCell className={`text-right font-medium ${lucroMes >= 0 ? "text-emerald-500" : "text-red-500"}`}>{brl(lucroMes)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{brl(meta)}</TableCell>
                        <TableCell className={`text-right font-medium ${corPct(pct)}`}>{pct.toFixed(1)}%</TableCell>
                        <TableCell>{statusBadge(pct)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot className="border-t">
                  <TableRow className="font-medium bg-muted/30">
                    <TableCell>Total ano</TableCell>
                    <TableCell className="text-right">{brl(totalAno.s)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.v)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.c)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.g)}</TableCell>
                    <TableCell className="text-right text-amber-500">{brl(totalAno.cp)}</TableCell>
                    <TableCell className="text-right text-amber-500">{brl(totalAno.cg)}</TableCell>
                    <TableCell className={`text-right ${lucroAno >= 0 ? "text-emerald-500" : "text-red-500"}`}>{brl(lucroAno)} ({margemAno.toFixed(1)}%)</TableCell>
                    <TableCell className="text-right">{brl(totalAno.m)}</TableCell>
                    <TableCell className={`text-right ${corPct(totalAno.m ? (totalAno.g / totalAno.m) * 100 : 0)}`}>
                      {totalAno.m ? ((totalAno.g / totalAno.m) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow className="text-muted-foreground">
                    <TableCell>Média mensal</TableCell>
                    <TableCell className="text-right">{brl(totalAno.s / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.v / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.c / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.g / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.cp / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.cg / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(lucroAno / nMeses)}</TableCell>
                    <TableCell className="text-right">{brl(totalAno.m / nMeses)}</TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </tfoot>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <LancarDialog open={openLanc} onClose={() => setOpenLanc(false)} onSaved={fetchData} anoPadrao={ano} empresaPadrao={empresa} />
      <ImportarDialog open={openImport} onClose={() => setOpenImport(false)} onSaved={fetchData} empresaPadrao={empresa} />
    </div>
  );
}

/* ---------- Dialog: Lançar valores ---------- */
function LancarDialog({
  open, onClose, onSaved, anoPadrao, empresaPadrao,
}: { open: boolean; onClose: () => void; onSaved: () => void; anoPadrao: number; empresaPadrao: Empresa }) {
  const [mes, setMes] = useState(MESES[0]);
  const [ano, setAno] = useState(anoPadrao);
  const [empresa, setEmpresa] = useState<Empresa>(empresaPadrao);
  const [serv, setServ] = useState("");
  const [vendas, setVendas] = useState("");
  const [contratos, setContratos] = useState("");
  const [custoProd, setCustoProd] = useState("");
  const [custosGer, setCustosGer] = useState("");
  const [mServ, setMServ] = useState(numberToCurrencyMask(META_DEFAULTS.meta_servicos));
  const [mVendas, setMVendas] = useState(numberToCurrencyMask(META_DEFAULTS.meta_vendas));
  const [mContratos, setMContratos] = useState(numberToCurrencyMask(META_DEFAULTS.meta_contratos));
  const [mGeral, setMGeral] = useState(numberToCurrencyMask(META_DEFAULTS.meta_geral));
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existing, setExisting] = useState(false);

  useEffect(() => { setAno(anoPadrao); setEmpresa(empresaPadrao); }, [anoPadrao, empresaPadrao, open]);

  // Pré-carrega valores existentes para nunca sobrescrever com zeros
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      const { data } = await supabase
        .from("financeiro")
        .select("*")
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("empresa", empresa)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setExisting(true);
        setServ(numberToCurrencyMask(Number(data.servicos_avulsos) || 0));
        setVendas(numberToCurrencyMask(Number(data.vendas) || 0));
        setContratos(numberToCurrencyMask(Number(data.contratos) || 0));
        setCustoProd(numberToCurrencyMask(Number(data.custo_produtos) || 0));
        setCustosGer(numberToCurrencyMask(Number(data.custos_gerais) || 0));
        setMServ(numberToCurrencyMask(Number(data.meta_servicos) || META_DEFAULTS.meta_servicos));
        setMVendas(numberToCurrencyMask(Number(data.meta_vendas) || META_DEFAULTS.meta_vendas));
        setMContratos(numberToCurrencyMask(Number(data.meta_contratos) || META_DEFAULTS.meta_contratos));
        setMGeral(numberToCurrencyMask(Number(data.meta_geral) || META_DEFAULTS.meta_geral));
      } else {
        setExisting(false);
        setServ(""); setVendas(""); setContratos(""); setCustoProd(""); setCustosGer("");
        setMServ(numberToCurrencyMask(META_DEFAULTS.meta_servicos));
        setMVendas(numberToCurrencyMask(META_DEFAULTS.meta_vendas));
        setMContratos(numberToCurrencyMask(META_DEFAULTS.meta_contratos));
        setMGeral(numberToCurrencyMask(META_DEFAULTS.meta_geral));
      }
      setLoadingExisting(false);
    })();
    return () => { cancelled = true; };
  }, [open, mes, ano, empresa]);

  const handleSave = async () => {
    setSaving(true);
    const s = parseCurrencyMask(serv);
    const v = parseCurrencyMask(vendas);
    const c = parseCurrencyMask(contratos);
    const payload = {
      mes, ano, empresa,
      servicos_avulsos: s,
      vendas: v,
      contratos: c,
      geral: s + v + c,
      custo_produtos: parseCurrencyMask(custoProd),
      custos_gerais: parseCurrencyMask(custosGer),
      meta_servicos: parseCurrencyMask(mServ),
      meta_vendas: parseCurrencyMask(mVendas),
      meta_contratos: parseCurrencyMask(mContratos),
      meta_geral: parseCurrencyMask(mGeral),
    };
    const { error } = await supabase.from("financeiro").upsert(payload, { onConflict: "mes,ano,empresa" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(existing ? "Valores atualizados com sucesso!" : "Valores lançados com sucesso!");
    onSaved();
    onClose();
    setServ(""); setVendas(""); setContratos(""); setCustoProd(""); setCustosGer("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar valores" : "Lançar valores"}</DialogTitle>
          {existing && (
            <p className="text-xs text-amber-500 mt-1">
              Já existem dados para {mes}/{ano} — os campos abaixo foram preenchidos com os valores atuais. Edite apenas o necessário; salvar sem alterar os outros campos preservará os valores existentes.
            </p>
          )}
          {loadingExisting && (
            <p className="text-xs text-muted-foreground mt-1">Carregando dados existentes…</p>
          )}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label>Empresa</Label>
            <Select value={empresa} onValueChange={(v) => setEmpresa(v as Empresa)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPRESAS.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Serviços Avulsos</Label>
            <Input value={serv} onChange={(e) => setServ(applyCurrencyMask(e.target.value))} placeholder="R$ 0,00" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Vendas</Label>
            <Input value={vendas} onChange={(e) => setVendas(applyCurrencyMask(e.target.value))} placeholder="R$ 0,00" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Contratos</Label>
            <Input value={contratos} onChange={(e) => setContratos(applyCurrencyMask(e.target.value))} placeholder="R$ 0,00" />
          </div>
          <div className="col-span-2 pt-2 border-t mt-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Custos</p>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Custo de Produtos (CMV)</Label>
            <Input value={custoProd} onChange={(e) => setCustoProd(applyCurrencyMask(e.target.value))} placeholder="R$ 0,00" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Custos Gerais</Label>
            <Input value={custosGer} onChange={(e) => setCustosGer(applyCurrencyMask(e.target.value))} placeholder="R$ 0,00" />
          </div>
          <div className="col-span-2 pt-2 border-t mt-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Metas</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meta Serviços</Label>
            <Input value={mServ} onChange={(e) => setMServ(applyCurrencyMask(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meta Vendas</Label>
            <Input value={mVendas} onChange={(e) => setMVendas(applyCurrencyMask(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meta Contratos</Label>
            <Input value={mContratos} onChange={(e) => setMContratos(applyCurrencyMask(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meta Geral</Label>
            <Input value={mGeral} onChange={(e) => setMGeral(applyCurrencyMask(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Dialog: Importar XLSX ---------- */
interface ParsedRow {
  mes: string;
  servicos_avulsos: number;
  vendas: number;
  contratos: number;
  geral: number;
  meta_servicos: number;
  meta_vendas: number;
  meta_contratos: number;
  meta_geral: number;
}

function ImportarDialog({
  open, onClose, onSaved, empresaPadrao,
}: { open: boolean; onClose: () => void; onSaved: () => void; empresaPadrao: Empresa }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [ano, setAno] = useState<number>(2026);
  const [empresa, setEmpresa] = useState<Empresa>(empresaPadrao);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setEmpresa(empresaPadrao); }, [empresaPadrao, open]);

  const reset = () => { setFileName(null); setPreview([]); };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Detectar header: linha que contém Serviços/Vendas/Contratos/Geral
    let headerIdx = -1;
    let header: string[] = [];
    for (let i = 0; i < json.length; i++) {
      const row = (json[i] || []).map((c) => (c == null ? "" : String(c)));
      const norm = row.map(normalize).join("|");
      if (norm.includes("servicos") && norm.includes("vendas") && norm.includes("contratos")) {
        headerIdx = i; header = row; break;
      }
    }
    if (headerIdx === -1) {
      toast.error("Cabeçalho não encontrado na planilha.");
      return;
    }
    const colIdx = (...keys: string[]) => header.findIndex((h) => {
      const n = normalize(h || "");
      return keys.every((k) => n.includes(normalize(k)));
    });
    const iServ = colIdx("servicos");
    const iVend = colIdx("vendas");
    const iCont = colIdx("contratos");
    const iGer = header.findIndex((h) => normalize(h || "") === "geral" || normalize(h || "").startsWith("geral"));
    const iMServ = colIdx("meta", "servicos");
    const iMVend = colIdx("meta", "vendas");
    const iMCont = colIdx("meta", "contrato");
    const iMGer = colIdx("meta", "geral");

    const num = (v: any) => {
      if (v == null || v === "") return 0;
      if (typeof v === "number") return v;
      const s = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const out: ParsedRow[] = [];
    for (let i = headerIdx + 1; i < json.length; i++) {
      const row = json[i] || [];
      const label = String(row[0] ?? "").trim();
      if (!label) continue;
      const ln = normalize(label);
      if (ln.includes("metas") || ln.includes("total") || ln.includes("media") || ln.includes("média")) continue;
      const mes = matchMes(label);
      if (!mes) continue;
      out.push({
        mes,
        servicos_avulsos: num(row[iServ]),
        vendas: num(row[iVend]),
        contratos: num(row[iCont]),
        geral: iGer >= 0 ? num(row[iGer]) : num(row[iServ]) + num(row[iVend]) + num(row[iCont]),
        meta_servicos: iMServ >= 0 ? num(row[iMServ]) : META_DEFAULTS.meta_servicos,
        meta_vendas: iMVend >= 0 ? num(row[iMVend]) : META_DEFAULTS.meta_vendas,
        meta_contratos: iMCont >= 0 ? num(row[iMCont]) : META_DEFAULTS.meta_contratos,
        meta_geral: iMGer >= 0 ? num(row[iMGer]) : META_DEFAULTS.meta_geral,
      });
    }
    setPreview(out);
    if (out.length === 0) toast.error("Nenhum mês reconhecido na planilha.");
  };

  const handleConfirm = async () => {
    if (preview.length === 0) return;
    setSaving(true);
    const payload = preview.map((p) => ({ ...p, ano, empresa }));
    const { error } = await supabase.from("financeiro").upsert(payload, { onConflict: "mes,ano,empresa" });
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`${preview.length} meses importados com sucesso!`);
    onSaved();
    onClose();
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar XLSX</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm">Empresa:</Label>
            <Select value={empresa} onValueChange={(v) => setEmpresa(v as Empresa)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPRESAS.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Label className="text-sm">Ano de destino:</Label>
            <Input type="number" className="w-28" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </div>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
            }`}
          >
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{fileName || "Arraste o arquivo .xlsx ou clique para selecionar"}</p>
            <p className="text-xs text-muted-foreground mt-1">Planilha com colunas: Serviços Avulsos, Vendas, Contratos, Geral e Metas</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <p className="text-xs font-medium">Preview ({preview.length} meses)</p>
                <button onClick={reset} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Serviços</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Contratos</TableHead>
                      <TableHead className="text-right">Geral</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((p) => (
                      <TableRow key={p.mes}>
                        <TableCell className="font-medium">{p.mes}</TableCell>
                        <TableCell className="text-right">{brl(p.servicos_avulsos)}</TableCell>
                        <TableCell className="text-right">{brl(p.vendas)}</TableCell>
                        <TableCell className="text-right">{brl(p.contratos)}</TableCell>
                        <TableCell className="text-right font-medium">{brl(p.geral)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={preview.length === 0 || saving}>
            {saving ? "Importando..." : "Confirmar importação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}