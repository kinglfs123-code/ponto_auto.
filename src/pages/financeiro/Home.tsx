import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { CalendarDays, AlertTriangle, Wallet, PlusCircle, ListChecks, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, todayISO } from "@/lib/currency";

export default function FinanceiroHome() {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const today = todayISO();

  const { data, isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["financeiro-summary", empresa?.id, today],
    queryFn: async () => {
      const eid = empresa!.id;
      const [dueToday, overdue] = await Promise.all([
        supabase
          .from("payables")
          .select("amount")
          .eq("empresa_id", eid)
          .eq("status", "pendente")
          .eq("due_date", today),
        supabase
          .from("payables")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", eid)
          .eq("status", "pendente")
          .lt("due_date", today),
      ]);
      const dueTodayList = (dueToday.data ?? []) as { amount: number }[];
      return {
        dueTodayCount: dueTodayList.length,
        dueTodayAmount: dueTodayList.reduce((s, p) => s + Number(p.amount), 0),
        overdueCount: overdue.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const cards = [
    {
      id: "due_today",
      label: "Hoje vencem",
      value: isLoading ? "—" : String(data?.dueTodayCount ?? 0),
      icon: CalendarDays,
      tone: "text-primary",
      to: "/financeiro/contas?filter=hoje",
    },
    {
      id: "total_due_today",
      label: "Total hoje",
      value: isLoading ? "—" : formatBRL(data?.dueTodayAmount ?? 0),
      icon: Wallet,
      tone: "text-foreground",
      to: "/financeiro/contas?filter=hoje",
    },
    {
      id: "overdue",
      label: "Atrasadas",
      value: isLoading ? "—" : String(data?.overdueCount ?? 0),
      icon: AlertTriangle,
      tone: (data?.overdueCount ?? 0) > 0 ? "text-destructive" : "text-muted-foreground",
      to: "/financeiro/contas?filter=atrasadas",
    },
  ];

  const actions = [
    { label: "Novo lançamento", icon: PlusCircle, to: "/financeiro/lancamento" },
    { label: "Ver contas", icon: ListChecks, to: "/financeiro/contas" },
    { label: "Fornecedores", icon: Truck, to: "/financeiro/fornecedores" },
  ];

  return (
    <FinanceiroLayout title="Financeiro" showBackToHome={false}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => navigate(c.to)}
              className="liquid-glass liquid-hover !rounded-2xl p-4 text-left"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] uppercase tracking-wider">{c.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <div className={`mt-2 text-2xl font-semibold tabular-nums ${c.tone}`}>{c.value}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Button
              key={a.to}
              variant="outline"
              className="h-auto py-4 flex-col gap-2 border-border/50"
              onClick={() => navigate(a.to)}
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm">{a.label}</span>
            </Button>
          );
        })}
      </div>
    </FinanceiroLayout>
  );
}
