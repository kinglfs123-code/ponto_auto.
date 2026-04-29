import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { CMV_PURCHASE_CODE } from "@/lib/cmv-constants";
import type { CmvDailySales, CmvRow } from "@/types/cmv";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function firstOfMonthISO(year: number, month: number) {
  return `${year}-${pad2(month + 1)}-01`;
}
export function lastOfMonthISO(year: number, month: number) {
  const d = new Date(year, month + 1, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export interface MonthCursor {
  y: number;
  m: number;
}

export function useMonthCursor() {
  return useState<MonthCursor>(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
}

interface SelectorProps {
  cursor: MonthCursor;
  onChange: (c: MonthCursor) => void;
}

export function MonthSelector({ cursor, onChange }: SelectorProps) {
  const goPrev = () => onChange(cursor.m === 0 ? { y: cursor.y - 1, m: 11 } : { y: cursor.y, m: cursor.m - 1 });
  const goNext = () => onChange(cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 });
  return (
    <div className="flex items-center justify-between gap-2 liquid-glass !rounded-2xl px-3 py-2">
      <Button size="icon" variant="ghost" onClick={goPrev} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium capitalize">{monthLabel(new Date(cursor.y, cursor.m, 1))}</div>
      <Button size="icon" variant="ghost" onClick={goNext} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Hook that fetches and assembles the CMV rows for a given month. */
export function useCmvMonth(cursor: MonthCursor) {
  const { empresa } = useEmpresa();
  const start = firstOfMonthISO(cursor.y, cursor.m);
  const end = lastOfMonthISO(cursor.y, cursor.m);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  const salesQuery = useQuery({
    enabled: !!empresa,
    queryKey: ["cmv-sales", empresa?.id, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cmv_daily_sales")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .gte("entry_date", start)
        .lte("entry_date", end);
      if (error) throw error;
      return (data ?? []) as CmvDailySales[];
    },
    staleTime: 15_000,
  });

  const purchasesQuery = useQuery({
    enabled: !!empresa,
    queryKey: ["cmv-purchases", empresa?.id, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payables")
        .select("arrival_date, amount")
        .eq("empresa_id", empresa!.id)
        .eq("item_code", CMV_PURCHASE_CODE)
        .gte("arrival_date", start)
        .lte("arrival_date", end);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const p of (data ?? []) as { arrival_date: string; amount: number }[]) {
        map.set(p.arrival_date, (map.get(p.arrival_date) ?? 0) + Number(p.amount));
      }
      return map;
    },
    staleTime: 15_000,
  });

  const rows = useMemo<CmvRow[]>(() => {
    const salesMap = new Map<string, CmvDailySales>();
    for (const s of salesQuery.data ?? []) salesMap.set(s.entry_date, s);
    const purchases = purchasesQuery.data ?? new Map<string, number>();

    const out: CmvRow[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${cursor.y}-${pad2(cursor.m + 1)}-${pad2(day)}`;
      const s = salesMap.get(date);
      const vendas_almoco = Number(s?.vendas_almoco ?? 0);
      const convenio_almoco = Number(s?.convenio_almoco ?? 0);
      const vendas_jantar = Number(s?.vendas_jantar ?? 0);
      const convenio_jantar = Number(s?.convenio_jantar ?? 0);
      const compras = Number(purchases.get(date) ?? 0);
      const total_vendas = vendas_almoco + convenio_almoco + vendas_jantar + convenio_jantar;
      const cmv_pct = total_vendas > 0 ? compras / total_vendas : null;
      const desvio = cmv_pct == null ? null : cmv_pct - 0.4;
      out.push({
        date,
        day,
        vendas_almoco,
        convenio_almoco,
        vendas_jantar,
        convenio_jantar,
        compras,
        total_vendas,
        cmv_pct,
        desvio,
      });
    }
    return out;
  }, [salesQuery.data, purchasesQuery.data, daysInMonth, cursor.y, cursor.m]);

  return {
    rows,
    isLoading: salesQuery.isLoading || purchasesQuery.isLoading,
    range: { start, end },
  };
}
