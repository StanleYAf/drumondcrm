export type FormaPagamento =
  | "dinheiro_pix"
  | "debito"
  | "credito"
  | "boleto"
  | "transferencia";

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  dinheiro_pix: "Dinheiro / PIX",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  boleto: "Boleto",
  transferencia: "Transferência bancária",
};

export const FORMAS_PARCELAVEIS: FormaPagamento[] = ["credito", "boleto"];

export interface Parcela {
  numero: number;
  vencimento: string; // YYYY-MM-DD
  valor: number;
}

/**
 * Calcula parcelas usando tabela Price (juros compostos ao mês).
 * Se taxa == 0, divide igualmente.
 */
export function calcularParcelas(
  valorPresente: number,
  numParcelas: number,
  taxaMensalPct: number,
  primeiraParcelaISO: string,
): { parcelas: Parcela[]; valorParcela: number; valorTotal: number } {
  const n = Math.max(1, Math.floor(numParcelas));
  const i = Math.max(0, taxaMensalPct) / 100;
  let pmt: number;
  if (i === 0) {
    pmt = valorPresente / n;
  } else {
    pmt = (valorPresente * i) / (1 - Math.pow(1 + i, -n));
  }
  const pmtRounded = Math.round(pmt * 100) / 100;
  const [y, m, d] = primeiraParcelaISO.split("-").map(Number);
  const parcelas: Parcela[] = [];
  let acumulado = 0;
  for (let k = 0; k < n; k++) {
    const dt = new Date(y, (m - 1) + k, d);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    // Ajusta a última parcela para fechar centavos
    let valor = pmtRounded;
    if (k === n - 1) {
      const totalRounded = Math.round(pmtRounded * n * 100) / 100;
      const diff = Math.round((totalRounded - (acumulado + pmtRounded)) * 100) / 100;
      valor = Math.round((pmtRounded - diff) * 100) / 100;
    }
    acumulado = Math.round((acumulado + valor) * 100) / 100;
    parcelas.push({ numero: k + 1, vencimento: iso, valor });
  }
  const valorTotal = Math.round(pmtRounded * n * 100) / 100;
  return { parcelas, valorParcela: pmtRounded, valorTotal };
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}