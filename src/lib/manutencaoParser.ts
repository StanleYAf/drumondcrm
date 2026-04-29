import * as XLSX from "xlsx";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export interface IndicadorRow {
  mes: string;
  ano: number;
  total_corretivas_abertas: number;
  total_corretivas_fechadas: number;
  total_preventivas_abertas: number;
  total_preventivas_fechadas: number;

  eng_corretivas_abertas: number;
  eng_corretivas_fechadas: number;
  eng_corretivas_atendidas_prazo: number;
  eng_pct_corretivas_atendidas_prazo: number;
  eng_pct_corretivas_fechadas: number;
  eng_preventivas_abertas: number;
  eng_preventivas_fechadas: number;
  eng_pct_preventivas_fechadas: number;
  eng_os_emergentes: number;
  eng_pct_sla_triagem_emergente: number;
  eng_pct_sla_fechamento_emergente: number;
  eng_os_urgentes: number;
  eng_pct_sla_triagem_urgente: number;
  eng_pct_sla_fechamento_urgente: number;
  eng_os_pouco_urgentes: number;
  eng_pct_sla_triagem_poucourgente: number;
  eng_pct_sla_fechamento_poucourgente: number;
  eng_pct_emergentes: number;
  eng_pct_urgentes: number;
  eng_pct_poucourgentes: number;

  pred_corretivas_abertas: number;
  pred_corretivas_fechadas: number;
  pred_pct_corretivas_fechadas: number;
  pred_preventivas_abertas: number;
  pred_preventivas_fechadas: number;
  pred_pct_preventivas_fechadas: number;
  pred_ar_sc_gd_abertas: number;
  pred_ar_sc_gd_fechadas: number;
  pred_ar_cg_gz_abertas: number;
  pred_ar_cg_gz_fechadas: number;
  pred_demais_abertas: number;
  pred_demais_fechadas: number;
  pred_os_emergentes: number;
  pred_pct_sla_triagem_emergente: number;
  pred_pct_sla_fechamento_emergente: number;
  pred_os_urgentes: number;
  pred_pct_sla_triagem_urgente: number;
  pred_pct_sla_fechamento_urgente: number;
  pred_os_pouco_urgentes: number;
  pred_pct_sla_triagem_poucourgente: number;
  pred_pct_sla_fechamento_poucourgente: number;
}

export interface TecnicoRow {
  mes: string;
  ano: number;
  nome: string;
  setor: string;
  corretivas: number;
  preventivas: number;
  total_os: number;
  atendidas_no_prazo: number;
  fechadas_no_prazo: number;
  percentual_atendimento: number;
  percentual_fechamento: number;
}

export interface ParseResult {
  indicadores: IndicadorRow[];
  tecnicos: TecnicoRow[];
  totalLinhas: number;
}

function parseDataBR(s: any): { mes: string; ano: number } | null {
  if (!s) return null;
  const str = String(s).trim();
  // formato esperado: dd/mm/yyyy hh:mm:ss
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const mesIdx = parseInt(m[2], 10) - 1;
  const ano = parseInt(m[3], 10);
  if (mesIdx < 0 || mesIdx > 11) return null;
  return { mes: MESES[mesIdx], ano };
}

const FECHADAS_STATES = new Set(["Fechada", "Serviço finalizado"]);
const ABERTAS_STATES = new Set([
  "Aguardando peças",
  "Aberta",
  "Aguardando aprovação do orçamento",
  "em manutenção",
  "Aguardando Análise Crítica",
  "Em Espera",
  "Aguardando anexo de Certificados",
  "Em execução",
  "Aguardando programação",
  "Aguardando analise",
  "Aguardando Orçamento",
]);

function isFechada(estado: any): boolean {
  if (!estado) return false;
  return FECHADAS_STATES.has(String(estado).trim());
}
function isAberta(estado: any): boolean {
  if (!estado) return false;
  const e = String(estado).trim();
  if (e === "Cancelada") return false;
  if (FECHADAS_STATES.has(e)) return false;
  return true;
}

function pct(num: number, den: number): number {
  if (!den) return 0;
  return Math.round((num / den) * 10000) / 100;
}

function emptyIndicador(mes: string, ano: number): IndicadorRow {
  return {
    mes, ano,
    total_corretivas_abertas: 0, total_corretivas_fechadas: 0,
    total_preventivas_abertas: 0, total_preventivas_fechadas: 0,
    eng_corretivas_abertas: 0, eng_corretivas_fechadas: 0,
    eng_corretivas_atendidas_prazo: 0, eng_pct_corretivas_atendidas_prazo: 0,
    eng_pct_corretivas_fechadas: 0,
    eng_preventivas_abertas: 0, eng_preventivas_fechadas: 0, eng_pct_preventivas_fechadas: 0,
    eng_os_emergentes: 0, eng_pct_sla_triagem_emergente: 0, eng_pct_sla_fechamento_emergente: 0,
    eng_os_urgentes: 0, eng_pct_sla_triagem_urgente: 0, eng_pct_sla_fechamento_urgente: 0,
    eng_os_pouco_urgentes: 0, eng_pct_sla_triagem_poucourgente: 0, eng_pct_sla_fechamento_poucourgente: 0,
    eng_pct_emergentes: 0, eng_pct_urgentes: 0, eng_pct_poucourgentes: 0,
    pred_corretivas_abertas: 0, pred_corretivas_fechadas: 0, pred_pct_corretivas_fechadas: 0,
    pred_preventivas_abertas: 0, pred_preventivas_fechadas: 0, pred_pct_preventivas_fechadas: 0,
    pred_ar_sc_gd_abertas: 0, pred_ar_sc_gd_fechadas: 0,
    pred_ar_cg_gz_abertas: 0, pred_ar_cg_gz_fechadas: 0,
    pred_demais_abertas: 0, pred_demais_fechadas: 0,
    pred_os_emergentes: 0, pred_pct_sla_triagem_emergente: 0, pred_pct_sla_fechamento_emergente: 0,
    pred_os_urgentes: 0, pred_pct_sla_triagem_urgente: 0, pred_pct_sla_fechamento_urgente: 0,
    pred_os_pouco_urgentes: 0, pred_pct_sla_triagem_poucourgente: 0, pred_pct_sla_fechamento_poucourgente: 0,
  };
}

export async function parseManutencaoXlsx(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("ordens")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("Aba 'OrdensServico' não encontrada");
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const headers = (rows[0] || []) as string[];
  const data = rows.slice(1).filter((r) => Array.isArray(r) && r.length);

  // mapear índices por header (tolerante)
  const idxOf = (label: string) => headers.findIndex((h) => h && String(h).trim().toLowerCase() === label.toLowerCase());
  const I = {
    tipo: idxOf("TIPO SERVIÇO"),
    estado: idxOf("ESTADO"),
    responsavel: idxOf("RESPONSAVEL"),
    dataCriacao: idxOf("DATA DE CRIAÇÃO"),
    prioridade: idxOf("PRIORIDADE"),
    plano: idxOf("PLANO"),
    quadro: idxOf("QUADRO DE TRABALHO"),
    estTriagem: idxOf("Estado tempo atendimento"),
    estFech: idxOf("Estado tempo fechamento"),
  };

  // bucket por mes/ano
  const bucket = new Map<string, IndicadorRow>();
  // contagem por prioridade pra calcular pct sla por bucket
  type SlaCounter = { total: number; triagemPrazo: number; fechPrazo: number };
  const slaBucket = new Map<string, { eng: Record<string, SlaCounter>; pred: Record<string, SlaCounter> }>();
  const totalEngPrioridade = new Map<string, { e: number; u: number; p: number; total: number }>();

  // bucket de técnicos por mes/ano
  const tecBucket = new Map<string, TecnicoRow>();

  const ensure = (mes: string, ano: number) => {
    const k = `${ano}-${mes}`;
    if (!bucket.has(k)) bucket.set(k, emptyIndicador(mes, ano));
    if (!slaBucket.has(k)) slaBucket.set(k, {
      eng: { Emergente: { total: 0, triagemPrazo: 0, fechPrazo: 0 }, Urgente: { total: 0, triagemPrazo: 0, fechPrazo: 0 }, "Pouco urgente": { total: 0, triagemPrazo: 0, fechPrazo: 0 } },
      pred: { Emergente: { total: 0, triagemPrazo: 0, fechPrazo: 0 }, Urgente: { total: 0, triagemPrazo: 0, fechPrazo: 0 }, "Pouco urgente": { total: 0, triagemPrazo: 0, fechPrazo: 0 } },
    });
    if (!totalEngPrioridade.has(k)) totalEngPrioridade.set(k, { e: 0, u: 0, p: 0, total: 0 });
    return bucket.get(k)!;
  };

  for (const r of data) {
    const tipo = String(r[I.tipo] || "").trim();
    const estado = r[I.estado];
    const responsavel = String(r[I.responsavel] || "").trim();
    const dataCri = parseDataBR(r[I.dataCriacao]);
    const prioridade = String(r[I.prioridade] || "").trim();
    const plano = String(r[I.plano] || "").trim();
    const quadro = String(r[I.quadro] || "").trim();
    const estTriagem = String(r[I.estTriagem] || "").trim();
    const estFech = String(r[I.estFech] || "").trim();

    if (!dataCri) continue;
    const ind = ensure(dataCri.mes, dataCri.ano);
    const k = `${dataCri.ano}-${dataCri.mes}`;

    const fechada = isFechada(estado);
    const aberta = isAberta(estado);
    const isCorretiva = tipo === "Manutenção Corretiva";
    const isPreventiva = tipo === "Manutenção Preventiva";
    const isEng = quadro === "Engenharia Clínica";
    const isPred = quadro === "Predial";

    if (isCorretiva) {
      if (fechada) ind.total_corretivas_fechadas++;
      if (aberta) ind.total_corretivas_abertas++;
      if (isEng) {
        if (fechada) ind.eng_corretivas_fechadas++;
        if (aberta) ind.eng_corretivas_abertas++;
        if (fechada && estFech === "No prazo") ind.eng_corretivas_atendidas_prazo++;
      }
      if (isPred) {
        if (fechada) ind.pred_corretivas_fechadas++;
        if (aberta) ind.pred_corretivas_abertas++;
      }
    }
    if (isPreventiva) {
      if (fechada) ind.total_preventivas_fechadas++;
      if (aberta) ind.total_preventivas_abertas++;
      if (isEng) {
        if (fechada) ind.eng_preventivas_fechadas++;
        if (aberta) ind.eng_preventivas_abertas++;
      }
      if (isPred) {
        if (fechada) ind.pred_preventivas_fechadas++;
        if (aberta) ind.pred_preventivas_abertas++;
        // segmentar AR por plano
        const planoLow = plano.toLowerCase();
        if (planoLow.includes("refrigera") && (planoLow.includes("sc") || planoLow.includes("gd"))) {
          if (fechada) ind.pred_ar_sc_gd_fechadas++;
          if (aberta) ind.pred_ar_sc_gd_abertas++;
        } else if (planoLow.includes("refrigera") && (planoLow.includes("cg") || planoLow.includes("gz"))) {
          if (fechada) ind.pred_ar_cg_gz_fechadas++;
          if (aberta) ind.pred_ar_cg_gz_abertas++;
        } else {
          if (fechada) ind.pred_demais_fechadas++;
          if (aberta) ind.pred_demais_abertas++;
        }
      }
    }

    // SLA por prioridade (apenas corretivas)
    if (isCorretiva && (isEng || isPred)) {
      const slaB = slaBucket.get(k)!;
      const target = isEng ? slaB.eng : slaB.pred;
      const c = target[prioridade];
      if (c) {
        c.total++;
        if (estTriagem === "No prazo") c.triagemPrazo++;
        if (fechada && estFech === "No prazo") c.fechPrazo++;
      }
      if (isEng) {
        const t = totalEngPrioridade.get(k)!;
        t.total++;
        if (prioridade === "Emergente") t.e++;
        else if (prioridade === "Urgente") t.u++;
        else if (prioridade === "Pouco urgente") t.p++;
      }
    }

    // técnicos
    if (responsavel && (isEng || isPred) && (isCorretiva || isPreventiva)) {
      const tk = `${dataCri.ano}-${dataCri.mes}-${responsavel}-${quadro}`;
      let t = tecBucket.get(tk);
      if (!t) {
        t = {
          mes: dataCri.mes, ano: dataCri.ano, nome: responsavel, setor: quadro,
          corretivas: 0, preventivas: 0, total_os: 0,
          atendidas_no_prazo: 0, fechadas_no_prazo: 0,
          percentual_atendimento: 0, percentual_fechamento: 0,
        };
        tecBucket.set(tk, t);
      }
      if (isCorretiva) t.corretivas++;
      if (isPreventiva) t.preventivas++;
      t.total_os++;
      if (estTriagem === "No prazo") t.atendidas_no_prazo++;
      if (fechada && estFech === "No prazo") t.fechadas_no_prazo++;
    }
  }

  // calcular percentuais
  for (const [k, ind] of bucket.entries()) {
    ind.eng_pct_corretivas_fechadas = pct(ind.eng_corretivas_fechadas, ind.eng_corretivas_fechadas + ind.eng_corretivas_abertas);
    ind.eng_pct_corretivas_atendidas_prazo = pct(ind.eng_corretivas_atendidas_prazo, ind.eng_corretivas_fechadas);
    ind.eng_pct_preventivas_fechadas = pct(ind.eng_preventivas_fechadas, ind.eng_preventivas_fechadas + ind.eng_preventivas_abertas);
    ind.pred_pct_corretivas_fechadas = pct(ind.pred_corretivas_fechadas, ind.pred_corretivas_fechadas + ind.pred_corretivas_abertas);
    ind.pred_pct_preventivas_fechadas = pct(ind.pred_preventivas_fechadas, ind.pred_preventivas_fechadas + ind.pred_preventivas_abertas);

    const sla = slaBucket.get(k)!;
    ind.eng_os_emergentes = sla.eng.Emergente.total;
    ind.eng_pct_sla_triagem_emergente = pct(sla.eng.Emergente.triagemPrazo, sla.eng.Emergente.total);
    ind.eng_pct_sla_fechamento_emergente = pct(sla.eng.Emergente.fechPrazo, sla.eng.Emergente.total);
    ind.eng_os_urgentes = sla.eng.Urgente.total;
    ind.eng_pct_sla_triagem_urgente = pct(sla.eng.Urgente.triagemPrazo, sla.eng.Urgente.total);
    ind.eng_pct_sla_fechamento_urgente = pct(sla.eng.Urgente.fechPrazo, sla.eng.Urgente.total);
    ind.eng_os_pouco_urgentes = sla.eng["Pouco urgente"].total;
    ind.eng_pct_sla_triagem_poucourgente = pct(sla.eng["Pouco urgente"].triagemPrazo, sla.eng["Pouco urgente"].total);
    ind.eng_pct_sla_fechamento_poucourgente = pct(sla.eng["Pouco urgente"].fechPrazo, sla.eng["Pouco urgente"].total);
    ind.pred_os_emergentes = sla.pred.Emergente.total;
    ind.pred_pct_sla_triagem_emergente = pct(sla.pred.Emergente.triagemPrazo, sla.pred.Emergente.total);
    ind.pred_pct_sla_fechamento_emergente = pct(sla.pred.Emergente.fechPrazo, sla.pred.Emergente.total);
    ind.pred_os_urgentes = sla.pred.Urgente.total;
    ind.pred_pct_sla_triagem_urgente = pct(sla.pred.Urgente.triagemPrazo, sla.pred.Urgente.total);
    ind.pred_pct_sla_fechamento_urgente = pct(sla.pred.Urgente.fechPrazo, sla.pred.Urgente.total);
    ind.pred_os_pouco_urgentes = sla.pred["Pouco urgente"].total;
    ind.pred_pct_sla_triagem_poucourgente = pct(sla.pred["Pouco urgente"].triagemPrazo, sla.pred["Pouco urgente"].total);
    ind.pred_pct_sla_fechamento_poucourgente = pct(sla.pred["Pouco urgente"].fechPrazo, sla.pred["Pouco urgente"].total);

    const tEng = totalEngPrioridade.get(k)!;
    ind.eng_pct_emergentes = pct(tEng.e, tEng.total);
    ind.eng_pct_urgentes = pct(tEng.u, tEng.total);
    ind.eng_pct_poucourgentes = pct(tEng.p, tEng.total);
  }

  for (const t of tecBucket.values()) {
    t.percentual_atendimento = pct(t.atendidas_no_prazo, t.total_os);
    t.percentual_fechamento = pct(t.fechadas_no_prazo, t.total_os);
  }

  return {
    indicadores: Array.from(bucket.values()),
    tecnicos: Array.from(tecBucket.values()),
    totalLinhas: data.length,
  };
}