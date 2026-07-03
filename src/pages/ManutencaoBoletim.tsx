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
  ClipboardList, Wrench, FileText, Printer, Eye, ShieldCheck, ClipboardCheck,
} from "lucide-react";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface Cliente { id: string; nome: string; ativo: boolean; logo_url: string | null }
interface OS {
  id: string;
  estado: string | null;
  tipo_servico: string | null;
  localizacao: string | null;
  quadro_trabalho: string | null;
  tag: string | null;
  numero_serie: string | null;
}

interface IndicadorRow {
  eng_total_equipamentos: number | null;
  eng_equipamentos_ativos: number | null;
  pred_total_equipamentos: number | null;
  pred_equipamentos_ativos: number | null;
}

const FECHADAS = new Set(["Fechada", "Serviço finalizado"]);
const CANCELADAS = new Set(["Cancelada"]);
const PENDENTES_ESTADOS = [
  "Aberta",
  "Aguardando peças",
  "Agendada",
  "Aguardando aprovação de orçamento",
  "Em espera",
  "Em execução",
  "Reparo externo",
];

function isPreventiva(tipo: string | null) {
  return !!tipo && tipo.toLowerCase().includes("prevent");
}
function isCorretiva(tipo: string | null) {
  return !!tipo && tipo.toLowerCase().includes("corret");
}
function isClinica(o: OS) {
  const q = (o.quadro_trabalho || "").toLowerCase();
  return q.includes("clínica") || q.includes("clinica");
}
function isPredial(o: OS) {
  const q = (o.quadro_trabalho || "").toLowerCase();
  return q.includes("predial");
}
function estaAberta(o: OS) {
  const e = (o.estado || "").trim();
  return !FECHADAS.has(e) && !CANCELADAS.has(e);
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
  const [indicador, setIndicador] = useState<IndicadorRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nome, ativo, logo_url").eq("ativo", true).order("nome");
      setClientes((data || []) as Cliente[]);
    })();
  }, []);

  async function carregarDados() {
    if (!clienteId) return;
    setLoading(true);
    const [{ data: osData, error }, { data: indData }] = await Promise.all([
      supabase
      .from("ordens_servico")
      .select("id,estado,tipo_servico,localizacao,quadro_trabalho,tag,numero_serie")
      .eq("cliente_id", clienteId)
      .eq("mes", mes)
      .eq("ano", ano),
      supabase
      .from("indicadores_manutencao")
      .select("eng_total_equipamentos,eng_equipamentos_ativos,pred_total_equipamentos,pred_equipamentos_ativos")
      .eq("cliente_id", clienteId)
      .eq("mes", mes)
      .eq("ano", ano)
      .maybeSingle(),
    ]);
    if (!error) setOrdens((osData || []) as OS[]);
    setIndicador((indData as IndicadorRow) || null);
    setLoading(false);
  }

  async function handlePreview() {
    await carregarDados();
    setShowPreview(true);
  }

  const clienteSel = clientes.find(c => c.id === clienteId);
  const clienteNome = clienteSel?.nome || "";
  const clienteLogo = clienteSel?.logo_url || null;

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

    const setorStats = (filtroSetor: (o: OS) => boolean) => {
      const corr = corretivas.filter(filtroSetor);
      const prev = preventivas.filter(filtroSetor);
      return {
        corretivasAbertas: corr.filter(estaAberta).length,
        corretivasFechadas: corr.filter(o => FECHADAS.has((o.estado || "").trim())).length,
        preventivasAbertas: prev.filter(estaAberta).length,
        preventivasFechadas: prev.filter(o => FECHADAS.has((o.estado || "").trim())).length,
      };
    };
    const eng = setorStats(isClinica);
    const pred = setorStats(isPredial);

    // pendentes por estado (corretivas gerais)
    const pendentesPorEstado = PENDENTES_ESTADOS.map(name => ({
      estado: name,
      qtd: corretivas.filter(o => (o.estado || "").trim().toLowerCase() === name.toLowerCase()).length,
    }));

    // Reincidências eng clínica (>= 3 corretivas no mesmo equipamento)
    const clinicas = corretivas.filter(isClinica);
    const groupKey = (o: OS) => o.tag || o.numero_serie || "";
    const counts: Record<string, number> = {};
    clinicas.forEach(o => {
      const k = groupKey(o);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    const reincidencias = Object.values(counts).filter(n => n >= 3).length;

    // Parque tecnológico: fallback por TAG/nº série únicos, com corretivas abertas descontando ativos
    const parqueSetor = (filtroSetor: (o: OS) => boolean, corrAbertasSetor: number) => {
      const setorOs = ordens.filter(filtroSetor);
      const tagsUnicas = new Set<string>();
      setorOs.forEach(o => {
        const k = o.tag || o.numero_serie || "";
        if (k) tagsUnicas.add(k);
      });
      const totalCalc = tagsUnicas.size;
      const ativosCalc = Math.max(0, totalCalc - corrAbertasSetor);
      return { totalCalc, ativosCalc };
    };
    const engParque = parqueSetor(isClinica, eng.corretivasAbertas);
    const predParque = parqueSetor(isPredial, pred.corretivasAbertas);

    return {
      eng, pred,
      pendentesPorEstado,
      reincidencias,
      engParque,
      predParque,
    };
  }, [ordens]);

  const engTotal = indicador?.eng_total_equipamentos ?? stats.engParque.totalCalc;
  const engAtivos = indicador?.eng_equipamentos_ativos ?? stats.engParque.ativosCalc;
  const predTotal = indicador?.pred_total_equipamentos ?? stats.predParque.totalCalc;
  const predAtivos = indicador?.pred_equipamentos_ativos ?? stats.predParque.ativosCalc;

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
            <div className="flex items-center gap-4">
              <div className="text-white text-right">
                <div className="text-xl font-extrabold tracking-widest">DRUMOND</div>
                <div className="text-[10px] opacity-80">SOLUÇÕES HOSPITALARES</div>
              </div>
              {clienteLogo && (
                <img
                  src={clienteLogo}
                  alt={clienteNome}
                  className="h-14 w-14 rounded-md bg-white object-contain p-1"
                />
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4 p-6" style={{ backgroundColor: "#ffffff" }}>
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Principais Indicadores */}
              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#1e3a5f" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">PRINCIPAIS INDICADORES</h2>
                <div className="text-[11px] font-semibold opacity-80 mb-2">ENG. CLÍNICA</div>
                <div className="grid grid-cols-2 gap-3">
                  <IndicadorItem icon={<Wrench className="h-5 w-5" />} label="Chamados Abertos" value={stats.eng.corretivasAbertas} />
                  <IndicadorItem icon={<ClipboardCheck className="h-5 w-5" />} label="Chamados Atendidos" value={stats.eng.corretivasFechadas} />
                  <IndicadorItem icon={<ShieldCheck className="h-5 w-5" />} label="Preventivas Abertas" value={stats.eng.preventivasAbertas} />
                  <IndicadorItem icon={<ClipboardList className="h-5 w-5" />} label="Preventivas Fechadas" value={stats.eng.preventivasFechadas} />
                </div>
                <div className="text-[11px] font-semibold opacity-80 mt-4 mb-2">ENG. PREDIAL</div>
                <div className="grid grid-cols-2 gap-3">
                  <IndicadorItem icon={<Wrench className="h-5 w-5" />} label="Chamados Abertos" value={stats.pred.corretivasAbertas} />
                  <IndicadorItem icon={<ClipboardCheck className="h-5 w-5" />} label="Chamados Atendidos" value={stats.pred.corretivasFechadas} />
                  <IndicadorItem icon={<ShieldCheck className="h-5 w-5" />} label="Preventivas Abertas" value={stats.pred.preventivasAbertas} />
                  <IndicadorItem icon={<ClipboardList className="h-5 w-5" />} label="Preventivas Fechadas" value={stats.pred.preventivasFechadas} />
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
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">PLANEJAMENTO PRÓXIMO MÊS</h2>
                <LinhaValor label="Preventivas de Eng. Clínica" value={0} />
                <LinhaValor label="Calibrações" value={0} />
                <LinhaValor label="Teste de Segurança Elétrica" value={0} />
              </div>

              <div className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
                <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">GESTÃO DE SERVIÇO</h2>
                <LinhaValor label="Reincidências na Eng. Clínica" value={stats.reincidencias} />
                <div className="mt-4 mb-2 text-xs font-semibold opacity-90">OSs de corretiva pendentes {ano}</div>
                {stats.pendentesPorEstado.map(p => (
                  <LinhaValor key={p.estado} label={p.estado} value={p.qtd} />
                ))}
              </div>
            </div>
          </div>

          {/* Disponibilidade do Parque Tecnológico (full width) */}
          <div className="px-6 pb-6">
            <div className="rounded-lg p-5 border" style={{ backgroundColor: "#f1f5f9" }}>
              <h2 className="text-sm font-bold tracking-wider mb-4 text-center" style={{ color: "#1e3a5f" }}>
                DISPONIBILIDADE DO PARQUE TECNOLÓGICO
              </h2>
              <div className="grid grid-cols-2 divide-x divide-slate-300">
                <div className="px-4">
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 text-center" style={{ color: "#1e3a5f" }}>
                    Total de equipamentos — Eng. Clínica
                  </div>
                  <ParqueLinha label="Total" value={engTotal} />
                  <ParqueLinha label="Ativos" value={engAtivos} />
                  <ParqueLinha label="Em manutenção" value={stats.eng.corretivasAbertas} />
                </div>
                <div className="px-4">
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 text-center" style={{ color: "#1e3a5f" }}>
                    Total de equipamentos — Eng. Predial
                  </div>
                  <ParqueLinha label="Total" value={predTotal} />
                  <ParqueLinha label="Ativos" value={predAtivos} />
                  <ParqueLinha label="Em manutenção" value={stats.pred.corretivasAbertas} />
                </div>
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

function ParqueLinha({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className="font-bold text-lg" style={{ color: "#1e3a5f" }}>{value}</span>
    </div>
  );
}