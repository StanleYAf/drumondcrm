/**
 * Lista compartilhada de categorias de clientes.
 * Usada no módulo Contratos (e disponível para outros módulos).
 */
export const CATEGORIAS_CLIENTE = [
  "Hospital",
  "Clínica",
  "Veterinária",
  "Indústria",
  "Condomínio",
  "Residencial",
  "Outros",
] as const;

export type CategoriaCliente = (typeof CATEGORIAS_CLIENTE)[number];

/** Valida um CNPJ (14 dígitos numéricos) com dígitos verificadores. */
export function isValidCNPJ(cnpjRaw: string): boolean {
  const cnpj = (cnpjRaw || "").replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, n, i) => acc + Number(n) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj.slice(0, 12), w1);
  const d2 = calc(cnpj.slice(0, 12) + d1, w2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

/** Aplica máscara de CNPJ progressiva: 00.000.000/0000-00 */
export function maskCNPJ(raw: string): string {
  const d = (raw || "").replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}