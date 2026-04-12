import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-04" → "04/2026" */
export function toBrMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return m && y ? `${m}/${y}` : iso;
}

/** "04/2026" → "2026-04" */
export function fromBrMonth(br: string): string {
  const [m, y] = br.split("/");
  if (m && y && y.length === 4) return `${y}-${m.padStart(2, "0")}`;
  return br;
}
