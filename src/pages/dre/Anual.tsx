import DreLayout from "@/components/dre/DreLayout";
import { useDreYear, useYearCursor, YearSelector, quarterValue, ytdValue, yearValue, pctOfReceita } from "@/components/dre/dre-shared";
import { Skeleton } from "@/components/ui/skeleton";
import { DRE_CATEGORIES, DRE_BAND_BG } from "@/lib/dre-categories";
import { formatBRL } from "@/lib/format";

export default function DreAnual() {
  const [year, setYear] = useYearCursor();
  const { matrix, isLoading } = useDreYear(year);

  const receita = matrix["1.00"] ?? new Array(12).fill(0);

  return (
    <DreLayout title="DRE — Visão anual" wide>
      <YearSelector year={year} onChange={setYear} />
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="liquid-glass !rounded-2xl overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="sticky left-0 z-10 bg-background/95 backdrop-blur text-left px-3 py-2 min-w-[300px]">
                  Descrição
                </th>
                {[0, 1, 2, 3].map((q) => (
                  <th key={q} className="px-3 py-2 font-medium text-center min-w-[110px]">
                    {q + 1}º Trim.
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-center min-w-[110px] bg-muted/30">Acumulado</th>
                <th className="px-3 py-2 font-medium text-center min-w-[120px] bg-muted/60">Resultado</th>
                <th className="px-3 py-2 font-medium text-center text-[9px] text-muted-foreground bg-muted/60 min-w-[60px]">
                  % Rec.
                </th>
              </tr>
            </thead>
            <tbody>
              {DRE_CATEGORIES.map((cat) => {
                const months = matrix[cat.code] ?? new Array(12).fill(0);
                const isSub = !!cat.is_subtotal;
                const bandBg = isSub && cat.band ? DRE_BAND_BG[cat.band] : "";
                const rowClass = isSub ? `${bandBg} font-semibold` : "hover:bg-muted/20";
                const stickyBg = isSub && bandBg ? bandBg : "bg-background/95";
                const indentClass = cat.indent === 2 ? "pl-10" : cat.indent === 1 ? "pl-6" : "";
                const total = yearValue(months);
                return (
                  <tr key={cat.code} className={`border-b border-border/20 ${rowClass}`}>
                    <td
                      className={`sticky left-0 z-10 ${stickyBg} backdrop-blur px-3 py-1.5 ${indentClass}`}
                    >
                      <span className="text-muted-foreground font-mono mr-2">[{cat.sign}]</span>
                      <span className="text-muted-foreground font-mono mr-2 text-[10px]">{cat.code}</span>
                      {cat.label}
                    </td>
                    {[0, 1, 2, 3].map((q) => {
                      const v = quarterValue(months, q);
                      return (
                        <td key={q} className={`px-3 py-1.5 text-right tabular-nums ${v < 0 ? "text-destructive" : ""}`}>
                          {fmt(v)}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-1.5 text-right tabular-nums ${isSub ? "" : "bg-muted/30"} ${ytdValue(months, 3) < 0 ? "text-destructive" : ""}`}>
                      {fmt(ytdValue(months, 3))}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${isSub ? "" : "bg-muted/60"} ${total < 0 ? "text-destructive" : ""}`}>
                      {fmt(total)}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums text-[10px] text-muted-foreground ${isSub ? "" : "bg-muted/60"}`}>
                      {pct(total, yearValue(receita))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DreLayout>
  );
}

function fmt(n: number): string {
  if (!n) return "—";
  return n < 0 ? `(${formatBRL(Math.abs(n))})` : formatBRL(n);
}

function pct(value: number, receita: number): string {
  const p = pctOfReceita(value, receita);
  if (p == null) return "—";
  return `${(p * 100).toFixed(1)}%`;
}
