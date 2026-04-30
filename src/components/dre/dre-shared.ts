import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { DRE_CATEGORIES, DRE_INDEX, type DreCategory } from "@/lib/dre-categories";
import type { DreManualEntry, DreYearMatrix, DreManualMask } from "@/types/dre";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function useYearCursor() {
  return useState<number>(() => new Date().getFullYear());
}

interface YearSelectorProps {
  year: number;
  onChange: (y: number) => void;
}

export function YearSelector({ year, onChange }: YearSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-2 liquid-glass !rounded-2xl px-3 py-2">
      <Button size="icon" variant="ghost" onClick={() => onChange(year - 1)} aria-label="Ano anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium">{year}</div>
      <Button size="icon" variant="ghost" onClick={() => onChange(year + 1)} aria-label="Próximo ano">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Resolve um valor de subtotal/categoria a partir da matriz de valores leaf.
 * Aplica os sinais declarados na fórmula: prefixo "-" inverte.
 */
function resolveValue(code: string, monthIdx: number, leafMatrix: DreYearMatrix, memo: Map<string, number[]>): number {
  const cached = memo.get(code);
  if (cached) return cached[monthIdx];

  const cat = DRE_INDEX[code];
  if (!cat) return 0;

  if (!cat.is_subtotal) {
    return leafMatrix[code]?.[monthIdx] ?? 0;
  }

  // Subtotal: aplica fórmula
  const months = new Array(12).fill(0) as number[];
  for (let m = 0; m < 12; m++) {
    let sum = 0;
    for (const ref of cat.formula ?? []) {
      const negate = ref.startsWith("-");
      const refCode = negate ? ref.slice(1) : ref;
      const refCat = DRE_INDEX[refCode];
      const v = resolveValue(refCode, m, leafMatrix, memo);
      // Sinal nativo da categoria filha
      const naturalSign = refCat?.sign === "-" ? -1 : 1;
      sum += (negate ? -1 : 1) * naturalSign * Math.abs(v);
      // Para subtotais filhos (sign "="), naturalSign=1
      // Para leafs com sign "+", naturalSign=1
      // Para leafs com sign "-", naturalSign=-1 (já vem como valor positivo no input)
    }
    months[m] = sum;
  }
  memo.set(code, months);
  return months[monthIdx];
}

/** Hook principal: busca dados do ano e devolve matriz consolidada + helpers. */
export function useDreYear(year: number) {
  const { empresa } = useEmpresa();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const manualQuery = useQuery({
    enabled: !!empresa,
    queryKey: ["dre-manual", empresa?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dre_manual_entries")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .gte("entry_month", start)
        .lte("entry_month", end);
      if (error) throw error;
      return (data ?? []) as DreManualEntry[];
    },
    staleTime: 15_000,
  });

  const payablesQuery = useQuery({
    enabled: !!empresa,
    queryKey: ["dre-payables", empresa?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payables")
        .select("arrival_date, amount, item_code")
        .eq("empresa_id", empresa!.id)
        .gte("arrival_date", start)
        .lte("arrival_date", end);
      if (error) throw error;
      // map: code -> [12 months]
      const out: Record<string, number[]> = {};
      for (const p of (data ?? []) as { arrival_date: string; amount: number; item_code: string }[]) {
        const m = Number(p.arrival_date.slice(5, 7)) - 1;
        if (!out[p.item_code]) out[p.item_code] = new Array(12).fill(0);
        out[p.item_code][m] += Number(p.amount);
      }
      return out;
    },
    staleTime: 15_000,
  });

  const { matrix, manualMask } = useMemo<{ matrix: DreYearMatrix; manualMask: DreManualMask }>(() => {
    const leaf: DreYearMatrix = {};
    const mask: DreManualMask = {};

    // Inicializa todas as leaf categories com zeros
    for (const cat of DRE_CATEGORIES) {
      if (!cat.is_subtotal) {
        leaf[cat.code] = new Array(12).fill(0);
        mask[cat.code] = new Array(12).fill(false);
      }
    }

    // Aplica valores automáticos do Financeiro
    const payables = payablesQuery.data ?? {};
    for (const cat of DRE_CATEGORIES) {
      if (cat.is_subtotal || !cat.auto_from?.length) continue;
      for (let m = 0; m < 12; m++) {
        let sum = 0;
        for (const code of cat.auto_from) {
          sum += payables[code]?.[m] ?? 0;
        }
        leaf[cat.code][m] = sum;
      }
    }

    // Override manual
    for (const e of manualQuery.data ?? []) {
      const m = Number(e.entry_month.slice(5, 7)) - 1;
      if (!leaf[e.category_code]) {
        leaf[e.category_code] = new Array(12).fill(0);
        mask[e.category_code] = new Array(12).fill(false);
      }
      leaf[e.category_code][m] = Number(e.amount);
      mask[e.category_code][m] = true;
    }

    // Constrói matriz final (leaf + subtotais resolvidos)
    const memo = new Map<string, number[]>();
    const out: DreYearMatrix = { ...leaf };
    for (const cat of DRE_CATEGORIES) {
      if (cat.is_subtotal) {
        const months = new Array(12).fill(0) as number[];
        for (let m = 0; m < 12; m++) {
          months[m] = resolveValue(cat.code, m, leaf, memo);
        }
        out[cat.code] = months;
      }
    }

    return { matrix: out, manualMask: mask };
  }, [manualQuery.data, payablesQuery.data]);

  return {
    matrix,
    manualMask,
    isLoading: manualQuery.isLoading || payablesQuery.isLoading,
    year,
  };
}

/** Soma dos meses de um trimestre (q: 0..3). */
export function quarterValue(months: number[], q: number): number {
  return months[q * 3] + months[q * 3 + 1] + months[q * 3 + 2];
}

/** Acumulado do início do ano até o trimestre q (inclusivo). */
export function ytdValue(months: number[], q: number): number {
  let s = 0;
  for (let m = 0; m <= q * 3 + 2; m++) s += months[m];
  return s;
}

/** Total anual. */
export function yearValue(months: number[]): number {
  return months.reduce((a, b) => a + b, 0);
}

/** % da Receita Bruta (código 1.00) para um valor e período. */
export function pctOfReceita(value: number, receita: number): number | null {
  if (!receita) return null;
  return value / receita;
}

export function monthISO(year: number, monthIdx: number): string {
  return `${year}-${pad2(monthIdx + 1)}-01`;
}

export const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MONTH_LABELS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export type { DreCategory };
