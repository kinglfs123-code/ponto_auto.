
export { maskCNPJ as formatCNPJ } from "./ponto-rules";
export { formatBRL, parseBRL, maskCurrencyInput, todayISO } from "./currency";

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
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  const dateTime = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (dateTime) {
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return `${dateTime[3]}/${dateTime[2]}/${dateTime[1]}`;
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const y = dt.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return "";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}
