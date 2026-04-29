import { formatBRL } from "@/lib/format";
import { CMV_TARGET } from "@/lib/cmv-constants";

interface Props {
  vendasAlmoco: number;
  vendasJantar: number;
  convenios: number;
  compras: number;
}

export default function CmvSummaryCards({ vendasAlmoco, vendasJantar, convenios, compras }: Props) {
  const totalVendas = vendasAlmoco + vendasJantar + convenios;
  const cmvPct = totalVendas > 0 ? compras / totalVendas : null;
  const overTarget = cmvPct != null && cmvPct > CMV_TARGET;

  const cards = [
    { label: "Vendas Almoço", value: formatBRL(vendasAlmoco), tone: "text-foreground" },
    { label: "Vendas Jantar", value: formatBRL(vendasJantar), tone: "text-foreground" },
    { label: "Convênios", value: formatBRL(convenios), tone: "text-foreground" },
    { label: "Compras (cód. 301)", value: formatBRL(compras), tone: "text-foreground" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="liquid-glass !rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className={`mt-1 text-base font-semibold tabular-nums ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="liquid-glass !rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CMV do mês</div>
        <div
          className={`mt-1 text-3xl font-bold tabular-nums ${
            cmvPct == null ? "text-muted-foreground" : overTarget ? "text-destructive" : "text-success"
          }`}
        >
          {cmvPct == null ? "—" : `${(cmvPct * 100).toFixed(2)}%`}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Meta: ≤ {(CMV_TARGET * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
