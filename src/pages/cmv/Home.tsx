import CmvLayout from "@/components/cmv/CmvLayout";
import CmvSummaryCards from "@/components/cmv/CmvSummaryCards";
import { MonthSelector, useCmvMonth, useMonthCursor } from "@/components/cmv/cmv-month";
import { Skeleton } from "@/components/ui/skeleton";

export default function CmvHome() {
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
    <CmvLayout title="CMV" showBack={false}>
      <MonthSelector cursor={cursor} onChange={setCursor} />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <CmvSummaryCards
          vendasAlmoco={totals.va}
          vendasJantar={totals.vj}
          convenios={totals.conv}
          compras={totals.compras}
        />
      )}
    </CmvLayout>
  );
}

