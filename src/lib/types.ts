import { z } from "zod";

export interface LancamentoItem {
  id: string;
  lancamento_id: string;
  identificacao?: string;
  marca?: string;
  modelo?: string;
  observacao?: string;
}

export interface Lancamento {
  id: string;
  cliente: string;
  valor: number;
  custos?: number;
  data: string;
  produto?: string;
  servico?: string;
  item?: string;
  vendedor?: string;
  tipo?: string;
  itens?: LancamentoItem[];
}

export interface IndicadorSemanal {
  id: string;
  data: string;
  semana: number;
  mes: string;
  vendedor: string;
  captacoes: number;
  orcamentos: number;
  visitas: number;
  ano: number;
}

export interface NotaContato {
  id: string;
  texto: string;
  timestamp: string; // ISO string
}

export interface PosVenda {
  id: string;
  data: string;
  cliente: string;
  vendedor: string;
  status: "Aguardando retorno" | "Contatado" | "Convertido";
  notas?: NotaContato[];
  status_changed_at?: string; // ISO string of last status change
}

export interface MetaHistorica {
  id?: string;
  mes: number; // 1-12
  ano: number;
  metas: { produto: number; servico: number; contrato: number; acessorio: number };
  meta_semanal: { captacoes: number; orcamentos: number; visitas: number };
}

export interface AppData {
  metas: { produto: number; servico: number; contrato: number; acessorio: number };
  meta_semanal: { captacoes: number; orcamentos: number; visitas: number };
  lancamentos: {
    produtos: Lancamento[];
    servicos: Lancamento[];
    contratos: Lancamento[];
    acessorios: Lancamento[];
  };
  indicadores_semanais: IndicadorSemanal[];
  pos_venda: PosVenda[];
  vendedores: string[];
  historico_metas: MetaHistorica[];
}

export type Categoria = "produto" | "servico" | "contrato" | "acessorio";

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  produto: "Produtos",
  servico: "Serviços",
  contrato: "Contratos",
  acessorio: "Acessórios",
};

export const CATEGORIA_FIELD: Record<Categoria, string> = {
  produto: "produto",
  servico: "servico",
  contrato: "servico",
  acessorio: "item",
};

export const CATEGORIA_ARRAY: Record<Categoria, keyof AppData["lancamentos"]> = {
  produto: "produtos",
  servico: "servicos",
  contrato: "contratos",
  acessorio: "acessorios",
};

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Calcula a comissão de um lançamento.
 * - Serviço: R$ 300 fixo se valor > 900, caso contrário 0.
 * - Demais categorias: 20% de (valor - custos).
 */
export function calcularComissao(cat: Categoria, valor: number, custos: number = 0): number {
  if (cat === "servico") {
    return valor > 900 ? 300 : 0;
  }
  const liquido = Math.max(0, valor - (custos || 0));
  return liquido * 0.2;
}

// Zod schemas
export const lancamentoSchema = z.object({
  cliente: z.string().trim().min(1, "Cliente é obrigatório").max(100, "Máximo 100 caracteres"),
  descricao: z.string().trim().min(1, "Descrição é obrigatória").max(200, "Máximo 200 caracteres"),
  valor: z.number({ invalid_type_error: "Valor inválido" }).positive("Valor deve ser maior que zero"),
  data: z.string().min(1, "Data é obrigatória").refine((d) => !isNaN(Date.parse(d)), "Data inválida"),
});

export const indicadorSchema = z.object({
  semana: z.number({ invalid_type_error: "Semana inválida" }).int().min(1, "Mínimo 1").max(53, "Máximo 53"),
  mes: z.string().min(1, "Mês é obrigatório"),
  vendedor: z.string().min(1, "Vendedor é obrigatório"),
  captacoes: z.number({ invalid_type_error: "Valor inválido" }).int().min(0, "Mínimo 0"),
  orcamentos: z.number({ invalid_type_error: "Valor inválido" }).int().min(0, "Mínimo 0"),
  visitas: z.number({ invalid_type_error: "Valor inválido" }).int().min(0, "Mínimo 0"),
});

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function dayOfMonth(date: Date): number {
  return date.getDate();
}

export function getMetasForMonth(historico: MetaHistorica[], mes: number, ano: number, defaultMetas: AppData["metas"], defaultMetaSemanal: AppData["meta_semanal"]): { metas: AppData["metas"]; meta_semanal: AppData["meta_semanal"] } {
  const found = historico.find(h => h.mes === mes + 1 && h.ano === ano);
  if (found) return { metas: found.metas, meta_semanal: found.meta_semanal };
  return { metas: defaultMetas, meta_semanal: defaultMetaSemanal };
}
