export interface CmvDailySales {
  id: string;
  empresa_id: string;
  entry_date: string; // ISO date
  vendas_almoco: number;
  convenio_almoco: number;
  vendas_jantar: number;
  convenio_jantar: number;
  created_at: string;
  updated_at: string;
}

/** Linha derivada por dia do mês (combina vendas manuais + compras 301 do banco). */
export interface CmvRow {
  date: string; // ISO
  day: number;
  vendas_almoco: number;
  convenio_almoco: number;
  vendas_jantar: number;
  convenio_jantar: number;
  compras: number;
  /** Vendas + convênios do dia (denominador do CMV). */
  total_vendas: number;
  /** compras / total_vendas. null quando total_vendas = 0. */
  cmv_pct: number | null;
  /** cmv_pct - meta. null quando cmv_pct é null. */
  desvio: number | null;
}
