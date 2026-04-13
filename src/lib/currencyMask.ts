/**
 * Formats a raw string of digits into Brazilian currency format: R$ 1.234,56
 * Works as a mask — user types digits, output is auto-formatted.
 */
export function applyCurrencyMask(raw: string): string {
  // Keep only digits
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const value = (cents / 100).toFixed(2);
  const [intPart, decPart] = value.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formatted},${decPart}`;
}

/**
 * Parses a masked currency string back to a number.
 * "R$ 1.234,56" → 1234.56
 */
export function parseCurrencyMask(masked: string): number {
  const digits = masked.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/**
 * Converts a number to the masked format for pre-filling inputs.
 * 1234.56 → "R$ 1.234,56"
 */
export function numberToCurrencyMask(value: number): string {
  if (!value && value !== 0) return "";
  const cents = Math.round(value * 100);
  return applyCurrencyMask(String(cents));
}
