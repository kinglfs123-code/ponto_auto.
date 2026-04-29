// Single source of truth for display formatting and validation across the app.
// Re-exports existing utilities and adds standardized helpers (DD/MM/AAAA, etc).

export { maskCNPJ as formatCNPJ, maskCPF as formatCPF, validateCNPJ, maskCNPJ, maskCPF, maskHM } from "./ponto-rules";
export { formatBRL, parseBRL, maskCurrencyInput, todayISO, addDaysISO } from "./currency";

/**
 * Always returns DD/MM/AAAA. Accepts:
 *  - ISO date string "YYYY-MM-DD"
 *  - ISO datetime string "YYYY-MM-DDTHH:mm:ss..."
 *  - Date object
 */
export function formatDateBR(input: string | Date | null | undefined): string {
  if (!input) return "";
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return "";
    const d = String(input.getDate()).padStart(2, "0");
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const y = input.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(input);
  // Pure date "YYYY-MM-DD"
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  // Datetime ISO — extract date part to avoid TZ shifts
  const dateTime = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (dateTime) {
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return `${dateTime[3]}/${dateTime[2]}/${dateTime[1]}`;
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const y = dt.getFullYear();
    return `${d}/${m}/${y}`;
  }
  // Fallback
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return "";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Validates CPF (11 digits with check digits). */
export function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const dv1 = calc(d.slice(0, 9), 10);
  const dv2 = calc(d.slice(0, 10), 11);
  return dv1 === parseInt(d[9], 10) && dv2 === parseInt(d[10], 10);
}
