import CmvLayout from "@/components/cmv/CmvLayout";
import CmvMonthTable from "@/components/cmv/CmvMonthTable";
import CmvSummaryCards from "@/components/cmv/CmvSummaryCards";
import { MonthSelector, useCmvMonth, useMonthCursor } from "@/components/cmv/cmv-month";
import { Skeleton } from "@/components/ui/skeleton";

export default function CmvTabela() {
  const [cursor, setCursor] = useMonthCursor();
  const { rows, isLoading } = useCmvMonth(cursor);

  const totals = rows.reduce(
    (acc, r) => {
      acc.va += r.vendas_almoco;
      acc.vj += r.vendas_jantar;
      acc.conv += r.convenio_almoco + r.convenio_jantar;
      acc.compras += r.compras;
      return acc;
    },
    { va: 0, vj: 0, conv: 0, compras: 0 },
  );

  return (
    <CmvLayout title="Tabela mensal">
      <MonthSelector cursor={cursor} onChange={setCursor} />
      {isLoading ? (
        <>
          <Skeleton className="h-32" />
          <Skeleton className="h-96" />
        </>
      ) : (
        <>
          <CmvSummaryCards
            vendasAlmoco={totals.va}
            vendasJantar={totals.vj}
            convenios={totals.conv}
            compras={totals.compras}
          />
          <CmvMonthTable rows={rows} />
          <p className="text-xs text-muted-foreground text-center pt-2">
            Lance valores diretamente nas células · Compras vêm dos lançamentos do Financeiro com código <span className="font-mono">301</span>
          </p>
        </>
      )}
    </CmvLayout>
  );
}
