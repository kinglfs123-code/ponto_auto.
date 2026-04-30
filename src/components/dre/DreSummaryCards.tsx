import { formatBRL } from "@/lib/format";
import { DRE_HEADLINE_CODES, DRE_INDEX } from "@/lib/dre-categories";
import { yearValue, pctOfReceita } from "./dre-shared";

import type { DreYearMatrix } from "@/types/dre";

interface Props {
  matrix: DreYearMatrix;
}

export default function DreSummaryCards({ matrix }: Props) {
  const receitaAnual = yearValue(matrix["1.00"] ?? new Array(12).fill(0));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {DRE_HEADLINE_CODES.map((code) => {
        const cat = DRE_INDEX[code];
        const months = matrix[code] ?? new Array(12).fill(0);
        const total = yearValue(months);
        const pct = code === "1.00" ? null : pctOfReceita(total, receitaAnual);
        const negative = total < 0;
        return (
          <div key={code} className="liquid-glass !rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {cat?.label ?? code}
            </div>
            <div
              className={`mt-1 text-base font-semibold tabular-nums ${
                negative ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatBRL(total)}
            </div>
            {pct != null && (
              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {(pct * 100).toFixed(1)}% da receita
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
