import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DreLayout from "@/components/dre/DreLayout";
import { useDreYear, useYearCursor, YearSelector, monthISO, MONTH_LABELS_SHORT, quarterValue, ytdValue, yearValue, pctOfReceita } from "@/components/dre/dre-shared";
import { Skeleton } from "@/components/ui/skeleton";
import { DRE_CATEGORIES } from "@/lib/dre-categories";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { formatBRL, maskCurrencyInput, parseBRL } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function numberToMask(n: number): string {
  if (!n) return "";
  return maskCurrencyInput(String(Math.round(Math.abs(n) * 100)));
}

export default function DreMensal() {
  const [year, setYear] = useYearCursor();
  const { matrix, manualMask, isLoading } = useDreYear(year);
  const { empresa } = useEmpresa();
  const qc = useQueryClient();

  // drafts: key `${code}|${monthIdx}` -> masked string
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const cat of DRE_CATEGORIES) {
      if (cat.is_subtotal) continue;
      const months = matrix[cat.code] ?? new Array(12).fill(0);
      for (let m = 0; m < 12; m++) {
        next[`${cat.code}|${m}`] = numberToMask(months[m]);
      }
    }
    setDrafts(next);
  }, [matrix]);

  const upsert = useMutation({
    mutationFn: async (params: { code: string; monthIdx: number; value: number }) => {
      if (!empresa) throw new Error("Empresa não selecionada");
      const payload = {
        empresa_id: empresa.id,
        category_code: params.code,
        entry_month: monthISO(year, params.monthIdx),
        amount: params.value,
      };
      const { error } = await supabase
        .from("dre_manual_entries")
        .upsert(payload, { onConflict: "empresa_id,category_code,entry_month" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dre-manual"] });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const handleBlur = (code: string, monthIdx: number, current: number) => {
    const key = `${code}|${monthIdx}`;
    const value = parseBRL(drafts[key] ?? "");
    if (value === current) return;
    upsert.mutate({ code, monthIdx, value });
  };

  const receita = matrix["1.00"] ?? new Array(12).fill(0);

  return (
    <DreLayout title="DRE — Tabela mensal" wide>
      <YearSelector year={year} onChange={setYear} />
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="liquid-glass !rounded-2xl overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="sticky left-0 z-10 bg-background/95 backdrop-blur text-left px-3 py-2 min-w-[280px]">
                  Descrição
                </th>
                {[0, 1, 2, 3].map((q) => (
                  <QuarterHeader key={q} q={q} />
                ))}
              </tr>
            </thead>
            <tbody>
              {DRE_CATEGORIES.map((cat) => {
                const months = matrix[cat.code] ?? new Array(12).fill(0);
                const isSub = !!cat.is_subtotal;
                const rowClass = isSub
                  ? "bg-muted/40 font-semibold"
                  : "hover:bg-muted/20";
                return (
                  <tr key={cat.code} className={`border-b border-border/20 ${rowClass}`}>
                    <td
                      className={`sticky left-0 z-10 bg-background/95 backdrop-blur px-3 py-1.5 ${
                        cat.indent === 1 ? "pl-6" : ""
                      }`}
                    >
                      <span className="text-muted-foreground font-mono mr-2">[{cat.sign}]</span>
                      <span className="text-muted-foreground font-mono mr-2 text-[10px]">{cat.code}</span>
                      {cat.label}
                    </td>
                    {[0, 1, 2, 3].map((q) => (
                      <QuarterCells
                        key={q}
                        q={q}
                        months={months}
                        receita={receita}
                        catCode={cat.code}
                        isSubtotal={isSub}
                        hasAuto={!!cat.auto_from?.length}
                        autoFrom={cat.auto_from}
                        manualMask={manualMask[cat.code]}
                        drafts={drafts}
                        setDrafts={setDrafts}
                        onBlur={handleBlur}
                      />
                    ))}
                    {/* Total anual */}
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold border-l border-border/40">
                      {fmtSigned(yearValue(months))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[10px] text-muted-foreground">
                      {pctCell(yearValue(months), yearValue(receita))}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="sticky left-0 z-10 bg-background/95 backdrop-blur px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Resultado anual
                </td>
                {[0, 1, 2, 3].map((q) => (
                  <td key={q} colSpan={8} />
                ))}
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Células com fundo cinza são subtotais (calculadas) · clique em uma célula em branco para digitar o valor manual ·
        valores com indicador <span className="font-bold text-primary">•</span> são overrides manuais sobre dados do Financeiro.
      </p>
    </DreLayout>
  );
}

function QuarterHeader({ q }: { q: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <th key={i} className="px-2 py-2 font-medium text-center min-w-[90px]">
          {MONTH_LABELS_SHORT[q * 3 + i]}
        </th>
      ))}
      <th className="px-2 py-2 font-medium text-center bg-muted/30 min-w-[90px] border-l border-border/40">
        {q + 1}º Trim.
      </th>
      <th className="px-2 py-2 font-medium text-center text-[9px] text-muted-foreground bg-muted/30 min-w-[55px]">
        % Rec.
      </th>
      <th className="px-2 py-2 font-medium text-center bg-muted/40 min-w-[90px] border-l border-border/40">
        Acum.
      </th>
      <th className="px-2 py-2 font-medium text-center text-[9px] text-muted-foreground bg-muted/40 min-w-[55px]">
        % Rec.
      </th>
      {q === 3 && (
        <>
          <th className="px-2 py-2 font-medium text-center bg-muted/60 min-w-[100px] border-l border-border/40">
            Ano
          </th>
          <th className="px-2 py-2 font-medium text-center text-[9px] text-muted-foreground bg-muted/60 min-w-[55px]">
            % Rec.
          </th>
        </>
      )}
    </>
  );
}

interface QuarterCellsProps {
  q: number;
  months: number[];
  receita: number[];
  catCode: string;
  isSubtotal: boolean;
  hasAuto: boolean;
  autoFrom?: string[];
  manualMask?: boolean[];
  drafts: Record<string, string>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBlur: (code: string, monthIdx: number, current: number) => void;
}

function QuarterCells({
  q, months, receita, catCode, isSubtotal, hasAuto, autoFrom, manualMask, drafts, setDrafts, onBlur,
}: QuarterCellsProps) {
  const monthIdxs = [q * 3, q * 3 + 1, q * 3 + 2];
  return (
    <>
      {monthIdxs.map((m) => {
        const value = months[m];
        const key = `${catCode}|${m}`;
        const isManualOverride = !!manualMask?.[m];
        if (isSubtotal) {
          return (
            <td key={m} className={`px-2 py-1.5 text-right tabular-nums ${value < 0 ? "text-destructive" : ""}`}>
              {fmtSigned(value)}
            </td>
          );
        }
        const cell = (
          <Input
            inputMode="numeric"
            value={drafts[key] ?? ""}
            placeholder="—"
            onChange={(e) =>
              setDrafts((d) => ({ ...d, [key]: maskCurrencyInput(e.target.value) }))
            }
            onBlur={() => onBlur(catCode, m, value)}
            className={`h-7 text-right text-[11px] tabular-nums px-1.5 bg-transparent border-transparent hover:border-border focus:border-primary ${
              isManualOverride ? "text-primary font-medium" : ""
            }`}
          />
        );
        return (
          <td key={m} className="px-1 py-0.5">
            {hasAuto && !isManualOverride ? (
              <Tooltip>
                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                <TooltipContent>
                  Vem do Financeiro · cód. {autoFrom?.join(", ")}
                </TooltipContent>
              </Tooltip>
            ) : (
              cell
            )}
            {isManualOverride && hasAuto && (
              <span className="block text-[8px] text-primary text-right pr-2 -mt-0.5">• manual</span>
            )}
          </td>
        );
      })}
      {/* Trimestre */}
      <td className={`px-2 py-1.5 text-right tabular-nums bg-muted/30 border-l border-border/40 ${quarterValue(months, q) < 0 ? "text-destructive" : ""}`}>
        {fmtSigned(quarterValue(months, q))}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[10px] text-muted-foreground bg-muted/30">
        {pctCell(quarterValue(months, q), quarterValue(receita, q))}
      </td>
      {/* Acumulado */}
      <td className={`px-2 py-1.5 text-right tabular-nums bg-muted/40 border-l border-border/40 ${ytdValue(months, q) < 0 ? "text-destructive" : ""}`}>
        {fmtSigned(ytdValue(months, q))}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[10px] text-muted-foreground bg-muted/40">
        {pctCell(ytdValue(months, q), ytdValue(receita, q))}
      </td>
    </>
  );
}

function fmtSigned(n: number): string {
  if (!n) return "—";
  return n < 0 ? `(${formatBRL(Math.abs(n))})` : formatBRL(n);
}

function pctCell(value: number, receita: number): string {
  const p = pctOfReceita(value, receita);
  if (p == null) return "—";
  return `${(p * 100).toFixed(1)}%`;
}
