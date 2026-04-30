import DreLayout from "@/components/dre/DreLayout";
import DreSummaryCards from "@/components/dre/DreSummaryCards";
import { useDreYear, useYearCursor, YearSelector } from "@/components/dre/dre-shared";
import { Skeleton } from "@/components/ui/skeleton";

export default function DreHome() {
  const [year, setYear] = useYearCursor();
  const { matrix, isLoading } = useDreYear(year);

  return (
    <DreLayout title="DRE" showBack={false}>
      <YearSelector year={year} onChange={setYear} />
      {isLoading ? (
        <Skeleton className="h-60" />
      ) : (
        <DreSummaryCards matrix={matrix} />
      )}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Linhas com código vinculado puxam valores do Financeiro · demais são editáveis na aba Mensal.
      </p>
    </DreLayout>
  );
}
