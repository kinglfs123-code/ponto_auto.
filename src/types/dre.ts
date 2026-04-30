export interface DreManualEntry {
  id: string;
  empresa_id: string;
  category_code: string;
  entry_month: string; // ISO date (YYYY-MM-01)
  amount: number;
  created_at: string;
  updated_at: string;
}

/** Matriz de valores: matrix[code][monthIndex 0-11] = number. */
export type DreYearMatrix = Record<string, number[]>;

/** Indica se a célula tem override manual (não automático). */
export type DreManualMask = Record<string, boolean[]>;
