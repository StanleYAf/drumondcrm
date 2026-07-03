import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList, Wrench, FileText, Printer, Eye, ShieldCheck, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

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

  const [sections, setSections] = useState({
    indicadores: true,
    observacoes: true,
    planejamento: true,
    gestao: true,
    disponibilidade: true,
    osUnidade: true,
  });

  const [engTotalEdit, setEngTotalEdit] = useState<string>("");
  const [engAtivosEdit, setEngAtivosEdit] = useState<string>("");
  const [predTotalEdit, setPredTotalEdit] = useState<string>("");
  const [predAtivosEdit, setPredAtivosEdit] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nome, ativo, logo_url").eq("ativo", true).order("nome");
      setClientes((data || []) as Cliente[]);
    })();
  }, []);

  async function carregarDados() {
    if (!clienteId) return null;
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
    const os = !error ? (osData || []) as OS[] : [];
    if (!error) setOrdens(os);
    const ind = (indData as IndicadorRow) || null;
    setIndicador(ind);
    setLoading(false);
    return { os, ind };
  }

  async function handlePreview() {
    const result = await carregarDados();
    if (result) {
      // pre-fill parque inputs with saved value or auto-calculated fallback
      const corretivas = result.os.filter(o => isCorretiva(o.tipo_servico));
      const abertaSetor = (f: (o: OS) => boolean) =>
        corretivas.filter(f).filter(estaAberta).length;
      const parqueFallback = (f: (o: OS) => boolean, abertas: number) => {
        const setorOs = result.os.filter(f);
        const tags = new Set<string>();
        setorOs.forEach(o => { const k = o.tag || o.numero_serie || ""; if (k) tags.add(k); });
        return { total: tags.size, ativos: Math.max(0, tags.size - abertas) };
      };
      const eA = abertaSetor(isClinica);
      const pA = abertaSetor(isPredial);
      const eF = parqueFallback(isClinica, eA);
      const pF = parqueFallback(isPredial, pA);
      setEngTotalEdit(String(result.ind?.eng_total_equipamentos ?? eF.total));
      setEngAtivosEdit(String(result.ind?.eng_equipamentos_ativos ?? eF.ativos));
      setPredTotalEdit(String(result.ind?.pred_total_equipamentos ?? pF.total));
      setPredAtivosEdit(String(result.ind?.pred_equipamentos_ativos ?? pF.ativos));
    }
    setShowPreview(true);
  }

  async function persistirParque() {
    if (!clienteId) return;
    const payload = {
      cliente_id: clienteId,
      mes,
      ano,
      eng_total_equipamentos: engTotalEdit === "" ? null : Number(engTotalEdit),
      eng_equipamentos_ativos: engAtivosEdit === "" ? null : Number(engAtivosEdit),
      pred_total_equipamentos: predTotalEdit === "" ? null : Number(predTotalEdit),
      pred_equipamentos_ativos: predAtivosEdit === "" ? null : Number(predAtivosEdit),
    };
    const { error } = await supabase
      .from("indicadores_manutencao")
      .upsert(payload, { onConflict: "cliente_id,mes,ano" });
    if (error) {
      toast.error("Erro ao salvar parque tecnológico: " + error.message);
    } else {
      setIndicador({
        eng_total_equipamentos: payload.eng_total_equipamentos,
        eng_equipamentos_ativos: payload.eng_equipamentos_ativos,
        pred_total_equipamentos: payload.pred_total_equipamentos,
        pred_equipamentos_ativos: payload.pred_equipamentos_ativos,
      });
      toast.success("Parque tecnológico salvo");
    }
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

    // OS por unidade (localização)
    const groupByLoc = (list: OS[]) => {
      const m: Record<string, number> = {};
      list.forEach(o => {
        const k = (o.localizacao || "Sem unidade").trim() || "Sem unidade";
        m[k] = (m[k] || 0) + 1;
      });
      return Object.entries(m).map(([unidade, qtd]) => ({ unidade, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 8);
    };

    return {
      eng, pred,
      pendentesPorEstado,
      reincidencias,
      engParque,
      predParque,
      corretivasPorUnidade: groupByLoc(corretivas),
      preventivasPorUnidade: groupByLoc(preventivas),
    };
  }, [ordens]);

  const engTotal = engTotalEdit !== "" ? Number(engTotalEdit) : (indicador?.eng_total_equipamentos ?? stats.engParque.totalCalc);
  const engAtivos = engAtivosEdit !== "" ? Number(engAtivosEdit) : (indicador?.eng_equipamentos_ativos ?? stats.engParque.ativosCalc);
  const predTotal = predTotalEdit !== "" ? Number(predTotalEdit) : (indicador?.pred_total_equipamentos ?? stats.predParque.totalCalc);
  const predAtivos = predAtivosEdit !== "" ? Number(predAtivosEdit) : (indicador?.pred_equipamentos_ativos ?? stats.predParque.ativosCalc);

  const toggleSection = (k: keyof typeof sections) =>
    setSections(s => ({ ...s, [k]: !s[k] }));

  const SECTION_OPTS: { key: keyof typeof sections; label: string }[] = [
    { key: "indicadores", label: "Principais Indicadores" },
    { key: "observacoes", label: "Observações Importantes" },
    { key: "planejamento", label: "Planejamento Próximo Mês" },
    { key: "gestao", label: "Gestão de Serviço" },
    { key: "disponibilidade", label: "Disponibilidade do Parque Tecnológico" },
    { key: "osUnidade", label: "O.S. por Unidade (gráficos)" },
  ];

  // Left/right column contents (only rendered sections occupy space)
  const leftBlocks: React.ReactNode[] = [];
  const rightBlocks: React.ReactNode[] = [];
  if (showPreview) {
    if (sections.indicadores) {
      leftBlocks.push(
        <div key="ind" className="rounded-lg p-5 text-white" style={{ backgroundColor: "#1e3a5f" }}>
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
      );
    }
    if (principaisList.length > 0) {
      leftBlocks.push(
        <div key="pm" className="rounded-lg p-5 border" style={{ backgroundColor: "#f8fafc" }}>
          <h2 className="text-sm font-bold tracking-wider mb-3" style={{ color: "#1e3a5f" }}>PRINCIPAIS MANUTENÇÕES</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {principaisList.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      );
    }
    if (sections.observacoes) {
      leftBlocks.push(
        <div key="obs" className="rounded-lg p-5 border" style={{ backgroundColor: "#f8fafc" }}>
          <h2 className="text-sm font-bold tracking-wider mb-3" style={{ color: "#1e3a5f" }}>OBSERVAÇÕES IMPORTANTES</h2>
          {observacoesList.length === 0 ? (
            <p className="text-slate-500">—</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {observacoesList.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </div>
      );
    }
    if (sections.planejamento) {
      rightBlocks.push(
        <div key="plan" className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
          <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">PLANEJAMENTO PRÓXIMO MÊS</h2>
          <LinhaValor label="Preventivas de Eng. Clínica" value={0} />
          <LinhaValor label="Calibrações" value={0} />
          <LinhaValor label="Teste de Segurança Elétrica" value={0} />
        </div>
      );
    }
    if (sections.gestao) {
      rightBlocks.push(
        <div key="gs" className="rounded-lg p-5 text-white" style={{ backgroundColor: "#2563eb" }}>
          <h2 className="text-sm font-bold tracking-wider mb-4 border-b border-white/30 pb-2">GESTÃO DE SERVIÇO</h2>
          <LinhaValor label="Reincidências na Eng. Clínica" value={stats.reincidencias} />
          <div className="mt-4 mb-2 text-xs font-semibold opacity-90">OSs de corretiva pendentes {ano}</div>
          {stats.pendentesPorEstado.map(p => (
            <LinhaValor key={p.estado} label={p.estado} value={p.qtd} />
          ))}
        </div>
      );
    }
  }

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

            <div className="border rounded-lg p-4">
              <Label className="text-sm font-semibold">Parque Tecnológico</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Pré-preenchido com o valor calculado automaticamente. Edite para sobrescrever e salvar.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Eng. Clínica — Total</Label>
                  <Input type="number" min={0} value={engTotalEdit} onChange={e => setEngTotalEdit(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Eng. Clínica — Ativos</Label>
                  <Input type="number" min={0} value={engAtivosEdit} onChange={e => setEngAtivosEdit(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Eng. Predial — Total</Label>
                  <Input type="number" min={0} value={predTotalEdit} onChange={e => setPredTotalEdit(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Eng. Predial — Ativos</Label>
                  <Input type="number" min={0} value={predAtivosEdit} onChange={e => setPredAtivosEdit(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={persistirParque} disabled={!clienteId}>
                  Salvar parque tecnológico
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <Label className="text-sm font-semibold">Seções do boletim</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {SECTION_OPTS.map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={sections[opt.key]}
                      onCheckedChange={() => toggleSection(opt.key)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
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
          {(leftBlocks.length > 0 || rightBlocks.length > 0) && (
            <div className="grid grid-cols-2 gap-4 p-6" style={{ backgroundColor: "#ffffff" }}>
              <div className="space-y-4">{leftBlocks}</div>
              <div className="space-y-4">{rightBlocks}</div>
            </div>
          )}

          {sections.disponibilidade && (
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
          )}

          {sections.osUnidade && (
            <div className="px-6 pb-6">
              <div className="rounded-lg p-5" style={{ backgroundColor: "#f1f5f9" }}>
                <h2 className="text-sm font-bold tracking-wider mb-3" style={{ color: "#1e3a5f" }}>O.S. POR UNIDADE</h2>
                <div className="grid grid-cols-2 gap-3">
                  <UnidadeRanking title="Corretivas" data={stats.corretivasPorUnidade} color="#ef4444" />
                  <UnidadeRanking title="Preventivas" data={stats.preventivasPorUnidade} color="#2563eb" />
                </div>
              </div>
            </div>
          )}

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

function UnidadeRanking({ title, data, color }: { title: string; data: { unidade: string; qtd: number }[]; color: string }) {
  const cleanLabel = (s: string) => {
    const t = (s || "").trim();
    if (!t || /^sem unidade$/i.test(t)) return "Não informado";
    return t.replace(/^DSH\s*-\s*/i, "").replace(/^SEMPER\s*-\s*/i, "");
  };
  const rows = data.slice(0, 6).map(d => ({ ...d, label: cleanLabel(d.unidade) }));
  const total = data.reduce((a, b) => a + b.qtd, 0);
  const max = Math.max(1, ...rows.map(r => r.qtd));
  return (
    <div className="bg-white rounded-md p-3 border border-slate-200">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">{title}</div>
        <div className="text-[10px] text-slate-500">Total <span className="font-bold text-slate-800">{total}</span></div>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-slate-400 text-center py-6">Sem dados</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const pct = (r.qtd / max) * 100;
            return (
              <li key={r.label} className="text-[11px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="truncate text-slate-700 pr-2" title={r.label}>{r.label}</span>
                  <span className="font-bold tabular-nums" style={{ color }}>{r.qtd}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}