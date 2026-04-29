import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatBRL, maskCurrencyInput, parseBRL } from "@/lib/format";
import { CMV_TARGET } from "@/lib/cmv-constants";
import type { CmvRow } from "@/types/cmv";

interface Props {
  rows: CmvRow[];
}

type EditableField = "vendas_almoco" | "convenio_almoco" | "vendas_jantar" | "convenio_jantar";

const FIELDS: { key: EditableField; label: string }[] = [
  { key: "vendas_almoco", label: "V. Almoço" },
  { key: "convenio_almoco", label: "C. Almoço" },
  { key: "vendas_jantar", label: "V. Jantar" },
  { key: "convenio_jantar", label: "C. Jantar" },
];

function numberToMask(n: number): string {
  if (!n) return "";
  return maskCurrencyInput(String(Math.round(n * 100)));
}

function pctClass(p: number | null): string {
  if (p == null) return "text-muted-foreground";
  return p > CMV_TARGET ? "text-destructive" : "text-success";
}

export default function CmvMonthTable({ rows }: Props) {
  const { empresa } = useEmpresa();
  const qc = useQueryClient();

  // Local masked values per (date, field). Hydrated from rows.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const r of rows) {
      for (const f of FIELDS) {
        next[`${r.date}|${f.key}`] = numberToMask(r[f.key]);
      }
    }
    setDrafts(next);
  }, [rows]);

  const upsert = useMutation({
    mutationFn: async (params: { date: string; field: EditableField; value: number }) => {
      if (!empresa) throw new Error("Empresa não selecionada");
      const existing = rows.find((r) => r.date === params.date);
      const base = {
        vendas_almoco: existing?.vendas_almoco ?? 0,
        convenio_almoco: existing?.convenio_almoco ?? 0,
        vendas_jantar: existing?.vendas_jantar ?? 0,
        convenio_jantar: existing?.convenio_jantar ?? 0,
      };
      base[params.field] = params.value;
      const payload = {
        empresa_id: empresa.id,
        entry_date: params.date,
        ...base,
      };
      const { error } = await supabase
        .from("cmv_daily_sales")
        .upsert(payload, { onConflict: "empresa_id,entry_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmv-sales"] });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const handleBlur = (date: string, field: EditableField, currentRow: CmvRow) => {
    const key = `${date}|${field}`;
    const masked = drafts[key] ?? "";
    const value = parseBRL(masked);
    if (value === currentRow[field]) return;
    upsert.mutate({ date, field, value });
  };

  const totals = useMemo(() => {
    const t = rows.reduce(
      (acc, r) => {
        acc.vendas_almoco += r.vendas_almoco;
        acc.convenio_almoco += r.convenio_almoco;
        acc.vendas_jantar += r.vendas_jantar;
        acc.convenio_jantar += r.convenio_jantar;
        acc.compras += r.compras;
        acc.total_vendas += r.total_vendas;
        return acc;
      },
      { vendas_almoco: 0, convenio_almoco: 0, vendas_jantar: 0, convenio_jantar: 0, compras: 0, total_vendas: 0 },
    );
    const cmv = t.total_vendas > 0 ? t.compras / t.total_vendas : null;
    return { ...t, cmv_pct: cmv, desvio: cmv == null ? null : cmv - CMV_TARGET };
  }, [rows]);

  return (
    <div className="liquid-glass !rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border/40">
            <th className="text-left px-3 py-2">Dia</th>
            {FIELDS.map((f) => (
              <th key={f.key} className="text-right px-2 py-2 font-medium">
                {f.label}
              </th>
            ))}
            <th className="text-right px-2 py-2 font-medium">Compras 301</th>
            <th className="text-right px-2 py-2 font-medium">CMV %</th>
            <th className="text-right px-3 py-2 font-medium">Desvio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-b border-border/20 hover:bg-muted/20">
              <td className="px-3 py-1.5 tabular-nums font-mono text-xs text-muted-foreground">
                {String(r.day).padStart(2, "0")}
              </td>
              {FIELDS.map((f) => {
                const k = `${r.date}|${f.key}`;
                return (
                  <td key={f.key} className="px-1 py-1">
                    <Input
                      inputMode="numeric"
                      value={drafts[k] ?? ""}
                      placeholder="0,00"
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [k]: maskCurrencyInput(e.target.value) }))
                      }
                      onBlur={() => handleBlur(r.date, f.key, r)}
                      className="h-8 text-right text-xs tabular-nums px-2 bg-transparent"
                    />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-right tabular-nums text-xs">
                {r.compras > 0 ? formatBRL(r.compras) : <span className="text-muted-foreground">—</span>}
              </td>
              <td className={`px-2 py-1.5 text-right tabular-nums text-xs font-semibold ${pctClass(r.cmv_pct)}`}>
                {r.cmv_pct == null ? "—" : `${(r.cmv_pct * 100).toFixed(1)}%`}
              </td>
              <td className={`px-3 py-1.5 text-right tabular-nums text-xs ${pctClass(r.cmv_pct)}`}>
                {r.desvio == null
                  ? "—"
                  : `${r.desvio > 0 ? "+" : ""}${(r.desvio * 100).toFixed(1)} p.p.`}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border/60 bg-muted/20 font-semibold">
            <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Total</td>
            {FIELDS.map((f) => (
              <td key={f.key} className="px-2 py-2 text-right tabular-nums text-xs">
                {formatBRL(totals[f.key])}
              </td>
            ))}
            <td className="px-2 py-2 text-right tabular-nums text-xs">{formatBRL(totals.compras)}</td>
            <td className={`px-2 py-2 text-right tabular-nums text-xs ${pctClass(totals.cmv_pct)}`}>
              {totals.cmv_pct == null ? "—" : `${(totals.cmv_pct * 100).toFixed(2)}%`}
            </td>
            <td className={`px-3 py-2 text-right tabular-nums text-xs ${pctClass(totals.cmv_pct)}`}>
              {totals.desvio == null
                ? "—"
                : `${totals.desvio > 0 ? "+" : ""}${(totals.desvio * 100).toFixed(2)} p.p.`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
