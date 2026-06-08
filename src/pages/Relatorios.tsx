import { useState, useMemo, useEffect } from "react";
import { useAppData } from "@/lib/dataContext";
import { MESES, CATEGORIA_LABELS, CATEGORIA_ARRAY, formatCurrency, formatDate, type Categoria, type Lancamento } from "@/lib/types";
import { FileSpreadsheet, FileText, Download, ChevronDown, Filter, Table2, BarChart3, PhoneCall, Users } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

type ReportType = "lancamentos" | "indicadores" | "pos_venda" | "leads";

const REPORT_OPTIONS: { key: ReportType; label: string; icon: React.ElementType }[] = [
  { key: "lancamentos", label: "Lançamentos", icon: Table2 },
  { key: "indicadores", label: "Indicadores Semanais", icon: BarChart3 },
  { key: "pos_venda", label: "Pós-venda", icon: PhoneCall },
  { key: "leads", label: "Leads", icon: Users },
];

function getDescricao(e: Lancamento) {
  return e.produto || e.servico || e.item || "";
}

interface LeadRow {
  id: string;
  nome_cliente: string;
  empresa: string | null;
  telefone: string;
  email: string | null;
  origem: string;
  etapa: string;
  responsavel: string | null;
  valor_estimado: number | null;
  created_at: string;
}

const ETAPA_LABELS: Record<string, string> = {
  novo_lead: "Novo Lead",
  primeiro_contato: "Primeiro Contato",
  em_qualificacao: "Em Qualificação",
  convertido: "Convertido",
  perdido: "Perdido",
};

export default function Relatorios() {
  const { data, loading, error } = useAppData();
  const now = new Date();

  const [reportType, setReportType] = useState<ReportType>("lancamentos");
  const [catFilter, setCatFilter] = useState<"todos" | Categoria>("todos");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [showPicker, setShowPicker] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,nome_cliente,empresa,telefone,email,origem,etapa,responsavel,valor_estimado,created_at")
        .order("created_at", { ascending: false });
      if (!cancelled && !error && data) setLeads(data as LeadRow[]);
    })();
    const channel = supabase
      .channel("relatorios-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, async () => {
        const { data } = await supabase
          .from("leads")
          .select("id,nome_cliente,empresa,telefone,email,origem,etapa,responsavel,valor_estimado,created_at")
          .order("created_at", { ascending: false });
        if (!cancelled && data) setLeads(data as LeadRow[]);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  // Build report data
  const reportData = useMemo(() => {
    if (reportType === "lancamentos") {
      const cats: Categoria[] = catFilter === "todos"
        ? ["produto", "servico", "contrato", "acessorio"]
        : [catFilter];

      const rows: { categoria: string; cliente: string; descricao: string; valor: number; data: string; vendedor: string }[] = [];
      cats.forEach(cat => {
        data.lancamentos[CATEGORIA_ARRAY[cat]]
          .filter(l => { const d = new Date(l.data); return d.getMonth() === month && d.getFullYear() === year; })
          .forEach(l => rows.push({
            categoria: CATEGORIA_LABELS[cat],
            cliente: l.cliente,
            descricao: getDescricao(l),
            valor: l.valor,
            data: l.data,
            vendedor: l.vendedor || "",
          }));
      });
      rows.sort((a, b) => a.data.localeCompare(b.data));
      return rows;
    }

    if (reportType === "indicadores") {
      const mesNome = MESES[month];
      return data.indicadores_semanais
        .filter(i => i.mes === mesNome && i.ano === year)
        .map(i => ({
          semana: i.semana,
          vendedor: i.vendedor,
          captacoes: i.captacoes,
          orcamentos: i.orcamentos,
          visitas: i.visitas,
          data: i.data,
        }));
    }

    if (reportType === "pos_venda") {
      return data.pos_venda
      .filter(p => { const d = new Date(p.data); return d.getMonth() === month && d.getFullYear() === year; })
      .map(p => ({
        cliente: p.cliente,
        vendedor: p.vendedor,
        status: p.status,
        data: p.data,
        notas: (p.notas || []).length,
      }));
    }

    // leads
    return leads
      .filter(l => {
        const d = new Date(l.created_at);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .map(l => ({
        cliente: l.nome_cliente,
        empresa: l.empresa || "",
        telefone: l.telefone,
        origem: l.origem,
        etapa: ETAPA_LABELS[l.etapa] || l.etapa,
        responsavel: l.responsavel || "",
        valor: l.valor_estimado || 0,
        data: l.created_at.slice(0, 10),
      }));
  }, [data, reportType, catFilter, month, year, leads]);

  const headers = useMemo(() => {
    if (reportType === "lancamentos") return ["Categoria", "Cliente", "Descrição", "Valor", "Data", "Vendedor"];
    if (reportType === "indicadores") return ["Semana", "Vendedor", "Captações", "Orçamentos", "Visitas", "Data"];
    if (reportType === "pos_venda") return ["Cliente", "Vendedor", "Status", "Data", "Notas"];
    return ["Cliente", "Empresa", "Telefone", "Origem", "Etapa", "Responsável", "Valor", "Data"];
  }, [reportType]);

  const tableRows = useMemo(() => {
    return (reportData as Record<string, unknown>[]).map(row => {
      const keys = Object.keys(row);
      return keys.map(k => {
        const v = row[k];
        if (k === "valor" && typeof v === "number") return formatCurrency(v);
        if (k === "data" && typeof v === "string" && v.includes("-")) return formatDate(v);
        return String(v ?? "");
      });
    });
  }, [reportData]);

  // Totals for lancamentos / leads
  const valorColIndex = useMemo(() => headers.findIndex(h => h === "Valor"), [headers]);
  const totalValor = (reportType === "lancamentos" || reportType === "leads")
    ? (reportData as { valor: number }[]).reduce((s, r) => s + (r.valor || 0), 0)
    : null;

  function exportCSV() {
    if (tableRows.length === 0) { toast.error("Sem dados para exportar"); return; }
    const csv = [headers.join(","), ...tableRows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `relatorio_${reportType}_${MESES[month]}_${year}.csv`);
    toast.success("CSV exportado");
  }

  function exportXLSX() {
    if (tableRows.length === 0) { toast.error("Sem dados para exportar"); return; }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...tableRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");

    // Auto column widths
    ws["!cols"] = headers.map((_, i) => ({
      wch: Math.max(headers[i].length, ...tableRows.map(r => (r[i] || "").length)) + 2,
    }));

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlob(blob, `relatorio_${reportType}_${MESES[month]}_${year}.xlsx`);
    toast.success("Excel exportado");
  }

  function exportPDF() {
    if (tableRows.length === 0) { toast.error("Sem dados para exportar"); return; }
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(`Relatório: ${REPORT_OPTIONS.find(r => r.key === reportType)?.label}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${MESES[month]} ${year}`, 14, 28);
    if (reportType === "lancamentos" && catFilter !== "todos") {
      doc.text(`Categoria: ${CATEGORIA_LABELS[catFilter]}`, 14, 34);
    }

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: reportType === "lancamentos" && catFilter !== "todos" ? 40 : 34,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [10, 132, 255], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    if (totalValor !== null) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${formatCurrency(totalValor)}`, 14, finalY + 10);
    }

    doc.save(`relatorio_${reportType}_${MESES[month]}_${year}.pdf`);
    toast.success("PDF exportado");
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Gere e exporte relatórios</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground bg-secondary">
            {MESES[month].substring(0, 3)} {year}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-2 z-50 p-3 rounded-2xl w-64 bg-popover border border-border backdrop-blur-xl">
              <div className="flex gap-2 mb-3">
                {[2025, 2026, 2027].map(y => (
                  <button key={y} onClick={() => setYear(y)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${y === year ? 'bg-primary text-foreground' : 'text-muted-foreground'}`}>{y}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MESES.map((m, i) => (
                  <button key={i} onClick={() => { setMonth(i); setShowPicker(false); }}
                    className={`py-2 rounded-lg text-xs font-medium transition ${i === month ? 'bg-primary text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="segmented-control w-full">
        {REPORT_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setReportType(opt.key)}
            className={`segmented-btn flex-1 ${reportType === opt.key ? 'active' : ''}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category Filter (lancamentos only) */}
      {reportType === "lancamentos" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="segmented-control">
            <button onClick={() => setCatFilter("todos")}
              className={`segmented-btn ${catFilter === "todos" ? "active" : ""}`}>Todos</button>
            {(["produto", "servico", "contrato", "acessorio"] as Categoria[]).map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`segmented-btn ${catFilter === c ? "active" : ""}`}>
                {CATEGORIA_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {tableRows.length} registro{tableRows.length !== 1 ? 's' : ''}
            </span>
          </div>
          {totalValor !== null && (
            <span className="text-sm font-bold text-foreground">{formatCurrency(totalValor)}</span>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-foreground transition hover:bg-white/[0.08] bg-muted border border-border">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={exportXLSX}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-foreground transition hover:bg-white/[0.08]"
            style={{ background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.2)' }}>
            <FileSpreadsheet className="h-3.5 w-3.5" style={{ color: '#30D158' }} /> Excel
          </button>
          <button onClick={exportPDF}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-foreground transition hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)' }}>
            <FileText className="h-3.5 w-3.5" style={{ color: '#FF453A' }} /> PDF
          </button>
        </div>
      </div>

      {/* Data Table */}
      {tableRows.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum dado para o período selecionado</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {headers.map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: '#8E8E93', fontSize: '10px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="transition hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-foreground whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {totalValor !== null && valorColIndex >= 0 && (
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <td colSpan={valorColIndex} className="px-4 py-3 text-sm font-semibold text-foreground">Total</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: '#30D158' }}>{formatCurrency(totalValor)}</td>
                    {headers.length - valorColIndex - 1 > 0 && (
                      <td colSpan={headers.length - valorColIndex - 1}></td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
