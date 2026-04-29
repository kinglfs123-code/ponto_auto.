import { useNavigate } from "react-router-dom";
import CmvLayout from "@/components/cmv/CmvLayout";
import CmvSummaryCards from "@/components/cmv/CmvSummaryCards";
import { MonthSelector, useCmvMonth, useMonthCursor } from "@/components/cmv/cmv-month";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table2, PlusCircle } from "lucide-react";

export default function CmvHome() {
  const navigate = useNavigate();
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 border-border/50"
          onClick={() => navigate("/cmv/tabela")}
        >
          <Table2 className="h-5 w-5 text-primary" />
          <span className="text-sm">Abrir tabela mensal</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 border-border/50"
          onClick={() => navigate("/financeiro/lancamento")}
        >
          <PlusCircle className="h-5 w-5 text-success" />
          <span className="text-sm">Lançar boleto (cód. 301)</span>
        </Button>
      </div>
    </CmvLayout>
  );
}
