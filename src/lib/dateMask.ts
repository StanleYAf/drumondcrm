/**
 * Aplica máscara de data brasileira enquanto o usuário digita.
 * Entrada: dígitos crus ou texto parcial
 * Saída: string formatada como dd/mm/aaaa
 */
export function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converte dd/mm/aaaa → aaaa-mm-dd (ISO).
 * Retorna string vazia se inválido.
 */
export function brToIso(br: string): string {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const day = parseInt(d, 10);
  const month = parseInt(mo, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${y}-${mo}-${d}`;
}

/**
 * Converte aaaa-mm-dd (ISO) → dd/mm/aaaa.
 * Retorna string vazia se inválido.
 */
export function isoToBr(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Verifica se uma string dd/mm/aaaa representa uma data válida.
 */
export function isValidDateBr(br: string): boolean {
  return brToIso(br) !== "";
}
