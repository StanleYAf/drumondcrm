import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, ClipboardList, Wrench, FileText, Printer, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, CartesianGrid,
} from "recharts";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface Cliente { id: string; nome: string; ativo: boolean }
interface OS {
  id: string;
  estado: string | null;
  tipo_servico: string | null;
  localizacao: string | null;
  quadro_trabalho: string | null;
  tag: string | null;
  numero_serie: string | null;
}

const FECHADAS = new Set(["Fechada", "Serviço finalizado"]);
const CANCELADAS = new Set(["Cancelada"]);

function isPreventiva(tipo: string | null) {
  return !!tipo && tipo.toLowerCase().includes("prevent");
}
function isCorretiva(tipo: string | null) {
  return !!tipo && tipo.toLowerCase().includes("corret");
}

export default function ManutencaoBoletim() {
  const now = new Date();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [mes, setMes] = useState<string>(MESES[now.getMonth()]);
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [principais, setPrincipais] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nome, ativo").eq("ativo", true).order("nome");
      setClientes((data || []) as Cliente[]);
    })();
  }, []);

  async function carregarDados() {
    if (!clienteId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("id,estado,tipo_servico,localizacao,quadro_trabalho,tag,numero_serie")
      .eq("cliente_id", clienteId)
      .eq("mes", mes)
      .eq("ano", ano);
    if (!error) setOrdens((data || []) as OS[]);
    setLoading(false);
  }

  async function handlePreview() {
    await carregarDados();
    setShowPreview(true);
  }

  const clienteNome = clientes.find(c => c.id === clienteId)?.nome || "";

  const principaisList = useMemo(
    () => principais.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 5),
    [principais]
  );
  const observacoesList = useMemo(
    () => observacoes.split("\n").map(s => s.trim()).filter(Boolean),
    [observacoes]
  );

  const stats = useMemo(() => {
    const corretivas = ordens.filter(o => isCorretiva(o.tipo_servico));
    const preventivas = ordens.filter(o => isPreventiva(o.tipo_servico));
    const estadoEq = (o: OS, name: string) => (o.estado || "").trim().toLowerCase() === name.toLowerCase();
    const corrAbertas = corretivas.filter(o => !FECHADAS.has((o.estado || "").trim()) && !CANCELADAS.has((o.estado || "").trim())).length;
    const corrFechadas = corretivas.filter(o => FECHADAS.has((o.estado || "").trim())).length;
    const prevAbertas = preventivas.filter(o => !FECHADAS.has((o.estado || "").trim()) && !CANCELADAS.has((o.estado || "").trim())).length;
    const prevFechadas = preventivas.filter(o => FECHADAS.has((o.estado || "").trim())).length;

    // pendentes por estado (corretivas)
    const countByEstado = (name: string) => corretivas.filter(o => estadoEq(o, name)).length;
    const pendAberta = countByEstado("Aberta");
    const pendAguardPecas = countByEstado("Aguardando peças");
    const pendAguardOrc = countByEstado("Aguardando aprovação de orçamento");
    const pendExecucao = countByEstado("Em execução");
    const pendReparoExt = countByEstado("Reparo externo");

    // Reincidências eng clínica
    const clinicas = corretivas.filter(o => (o.quadro_trabalho || "").toLowerCase().includes("clínica") || (o.quadro_trabalho || "").toLowerCase().includes("clinica"));
    const groupKey = (o: OS) => o.tag || o.numero_serie || "";
    const counts: Record<string, number> = {};
    clinicas.forEach(o => {
      const k = groupKey(o);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    const reincidencias = Object.values(counts).filter(n => n >= 3).length;

    // Em manutenção: corretivas não fechadas e não canceladas
    const emManutencao = corretivas.filter(o => !FECHADAS.has((o.estado || "").trim()) && !CANCELADAS.has((o.estado || "").trim())).length;

    // gráficos por unidade
    const groupByLoc = (list: OS[]) => {
      const m: Record<string, number> = {};
      list.forEach(o => {
        const k = (o.localizacao || "Sem unidade").trim() || "Sem unidade";
        m[k] = (m[k] || 0) + 1;
      });
      return Object.entries(m).map(([unidade, qtd]) => ({ unidade, qtd })).sort((a,b) => b.qtd - a.qtd).slice(0, 8);
    };

    return {
      corrAbertas, corrFechadas, prevAbertas, prevFechadas,
      pendAberta, pendAguardPecas, pendAguardOrc, pendExecucao, pendReparoExt,
      reincidencias, emManutencao,
      corretivasPorUnidade: groupByLoc(corretivas),
      preventivasPorUnidade: groupByLoc(preventivas),
    };
  }, [ordens]);

  return (
    <div className="p-6 space-y-6">
      {/* Form (hidden on print) */}
      <div className="boletim-form">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Configuração do Boletim de Engenharia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y =>
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Principais Manutenções (até 5, uma por linha)</Label>
                <Textarea rows={5} value={principais} onChange={e => setPrincipais(e.target.value)} placeholder="Ex: Substituição de filtros HEPA do Bloco A" />
              </div>
              <div>
                <Label>Observações Importantes</Label>
                <Textarea rows={5} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: Aguardando aprovação de orçamento do compressor" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePreview} disabled={!clienteId || loading}>
                <Eye className="mr-2 h-4 w-4" />
                {loading ? "Carregando..." : "Visualizar Boletim"}
              </Button>
              <Button variant="outline" onClick={() => window.print()} disabled={!showPreview}>
                <Printer className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boletim Preview */}
      {showPreview && (
        <div className="boletim-print bg-white text-slate-900 mx-auto" style={{ maxWidth: "210mm" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6" style={{ backgroundColor: "#1e3a5f" }}>
            <div className="text-white">
              <h1 className="text-3xl font-bold tracking-wide">BOLETIM DE ENGENHARIA</h1>
              <p className="text-sm mt-1 opacity-90">
                {clienteNome ? `${clienteNome} — ` : ""}CLÍNICA / PREDIAL — {mes} {ano}
              </p>
            </div>
            <div className="text-white text-right">
              <div className="text-xl font-extrabold tracking-widest">DRUMOND</div>
              <div className="text-[10px] opacity-80">SOLUÇÕES HOSPITALARES</div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4 p-6" style={{ backgroundColor: "#ffffff" }}>
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Principais Indicadores */}
              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#1e3a5f" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">PRINCIPAIS INDICADORES</h2>
                <div className="grid grid-cols-2 gap-3">
                  <IndicadorItem icon={<AlertTriangle className="h-5 w-5" />} label="Chamados Abertos" value={stats.corrAbertas} />
                  <IndicadorItem icon={<CheckCircle2 className="h-5 w-5" />} label="Chamados Atendidos" value={stats.corrFechadas} />
                  <IndicadorItem icon={<ClipboardList className="h-5 w-5" />} label="Preventivas Abertas" value={stats.prevAbertas} />
                  <IndicadorItem icon={<Wrench className="h-5 w-5" />} label="Preventivas Fechadas" value={stats.prevFechadas} />
                </div>
              </div>

              {/* Principais Manutenções */}
              <div className="rounded-lg p-5 border" style={{ backgroundColor: "#f8fafc" }}>
                <h2 className="text-sm font-bold tracking-wider mb-3" style={{ color: "#1e3a5f" }}>PRINCIPAIS MANUTENÇÕES</h2>
                {principaisList.length === 0 ? (
                  <p className="text-slate-500">—</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {principaisList.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </div>

              {/* Observações */}
              <div className="rounded-lg p-5 border" style={{ backgroundColor: "#f8fafc" }}>
                <h2 className="text-sm font-bold tracking-wider mb-3" style={{ color: "#1e3a5f" }}>OBSERVAÇÕES IMPORTANTES</h2>
                {observacoesList.length === 0 ? (
                  <p className="text-slate-500">—</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {observacoesList.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </div>

              {/* OS por Unidade */}
              <div className="rounded-lg p-5" style={{ backgroundColor: "#f1f5f9" }}>
                <h2 className="text-sm font-bold tracking-wider mb-3" style={{ color: "#1e3a5f" }}>O.S. POR UNIDADE</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MiniChart title="Corretivas" data={stats.corretivasPorUnidade} color="#ef4444" />
                  <MiniChart title="Preventivas" data={stats.preventivasPorUnidade} color="#2563eb" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">GESTÃO DA MANUTENÇÃO</h2>
                <LinhaValor label="Reincidências na Eng. Clínica" value={stats.reincidencias} />
                <div className="mt-4 mb-2 text-xs font-semibold opacity-90">OSs de corretiva pendentes {ano}</div>
                <LinhaValor label="Aberta" value={stats.pendAberta} />
                <LinhaValor label="Aguardando peças" value={stats.pendAguardPecas} />
                <LinhaValor label="Aguardando aprovação de orçamento" value={stats.pendAguardOrc} />
                <LinhaValor label="Em execução" value={stats.pendExecucao} />
                <LinhaValor label="Reparo externo" value={stats.pendReparoExt} />
              </div>

              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">DISPONIBILIDADE DO PARQUE TECNOLÓGICO</h2>
                <LinhaValor label="Total de equipamentos" value="—" />
                <LinhaValor label="Ativos" value="—" />
                <LinhaValor label="Em manutenção" value={stats.emManutencao} />
              </div>

              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">PLANEJAMENTO PRÓXIMO MÊS</h2>
                <LinhaValor label="Preventivas de Eng. Clínica" value={0} />
                <LinhaValor label="Calibrações" value={0} />
                <LinhaValor label="Teste de Segurança Elétrica" value={0} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-3 text-white text-xs" style={{ backgroundColor: "#1e3a5f" }}>
            <span>www.drumondsolucaohospitalares.com</span>
            <span>@drumondsolucoes</span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .boletim-print, .boletim-print * { visibility: visible !important; }
          .boletim-print {
            position: absolute; left: 0; top: 0; width: 210mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .boletim-print .rounded-lg { break-inside: avoid; page-break-inside: avoid; }
          .boletim-form { display: none !important; }
          aside, header, nav, [data-sidebar] { display: none !important; }
        }
        .boletim-print, .boletim-print * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>
    </div>
  );
}

function IndicadorItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-md p-3">
      <div className="opacity-90">{icon}</div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider opacity-90">{label}</div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function LinhaValor({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/15 last:border-0 text-sm">
      <span className="opacity-95">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  );
}

function MiniChart({ title, data, color }: { title: string; data: { unidade: string; qtd: number }[]; color: string }) {
  return (
    <div className="bg-white rounded-md p-2 border">
      <div className="text-[11px] font-semibold mb-1 text-slate-700">{title}</div>
      <div style={{ width: "100%", height: 140 }}>
        {data.length === 0 ? (
          <div className="text-xs text-slate-400 text-center pt-12">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="unidade" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <ReTooltip />
              <Bar dataKey="qtd" fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}