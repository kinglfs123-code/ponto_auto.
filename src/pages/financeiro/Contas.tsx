import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { formatBRL, formatDateBR, todayISO, addDaysISO } from "@/lib/currency";
import { PAYMENT_METHODS, type Payable, type Supplier } from "@/types/financeiro";
import { Check, Trash2 } from "lucide-react";

type FilterKey = "hoje" | "atrasadas" | "proximas" | "pendentes" | "pagas";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "atrasadas", label: "Atrasadas" },
  { key: "proximas", label: "Próximas 7d" },
  { key: "pendentes", label: "Todas pendentes" },
  { key: "pagas", label: "Pagas" },
];

const methodLabel = (m: string) =>
  PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;

export default function Contas() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("filter") as FilterKey) || "pendentes";
  const setFilter = (f: FilterKey) => setParams({ filter: f });

  const { empresa } = useEmpresa();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data: suppliers = [] } = useQuery({
    enabled: !!empresa,
    queryKey: ["suppliers-list", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("empresa_id", empresa!.id);
      return (data ?? []) as Pick<Supplier, "id" | "name">[];
    },
  });
  const supplierName = useMemo(() => {
    const map = new Map(suppliers.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [suppliers]);

  const today = todayISO();
  const next7 = addDaysISO(today, 7);

  const { data: payables = [], isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["payables", empresa?.id, filter, today],
    queryFn: async () => {
      let q = supabase.from("payables").select("*").eq("empresa_id", empresa!.id);
      if (filter === "hoje") q = q.eq("status", "pendente").eq("due_date", today);
      else if (filter === "atrasadas") q = q.eq("status", "pendente").lt("due_date", today);
      else if (filter === "proximas") q = q.eq("status", "pendente").gte("due_date", today).lte("due_date", next7);
      else if (filter === "pendentes") q = q.eq("status", "pendente");
      else if (filter === "pagas") q = q.eq("status", "pago");
      const { data } = await q.order("due_date", { ascending: true });
      return (data ?? []) as Payable[];
    },
    staleTime: 15_000,
  });

  const total = useMemo(
    () => payables.reduce((s, p) => s + Number(p.amount), 0),
    [payables],
  );

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payables")
        .update({ status: "pago", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Conta marcada como paga" });
      qc.invalidateQueries({ queryKey: ["payables"] });
      qc.invalidateQueries({ queryKey: ["financeiro-summary"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Conta excluída" });
      qc.invalidateQueries({ queryKey: ["payables"] });
      qc.invalidateQueries({ queryKey: ["financeiro-summary"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleDelete = async (p: Payable) => {
    const ok = await confirm({
      title: "Excluir lançamento?",
      description: `${supplierName(p.supplier_id)} — ${formatBRL(p.amount)} — venc. ${formatDateBR(p.due_date)}`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (ok) remove.mutate(p.id);
  };

  return (
    <FinanceiroLayout title="Contas a pagar">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="flex-wrap">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : payables.length === 0 ? (
        <div className="liquid-glass !rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nenhuma conta neste filtro.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {payables.map((p) => {
              const overdue = p.status === "pendente" && p.due_date < today;
              return (
                <div key={p.id} className="liquid-glass !rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{supplierName(p.supplier_id)}</span>
                      <span className="text-xs text-muted-foreground">#{p.item_code}</span>
                      {overdue && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                          atrasada
                        </span>
                      )}
                      {p.status === "pago" && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 text-success">
                          paga
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Venc. {formatDateBR(p.due_date)} · {methodLabel(p.payment_method)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatBRL(Number(p.amount))}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.status === "pendente" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markPaid.mutate(p.id)}
                        title="Marcar como paga"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-right text-sm text-muted-foreground pt-2">
            Total: <span className="font-semibold text-foreground tabular-nums">{formatBRL(total)}</span>
          </div>
        </>
      )}
    </FinanceiroLayout>
  );
}
