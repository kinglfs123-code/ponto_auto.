import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import SupplierCombobox from "@/components/financeiro/SupplierCombobox";
import ItemCodeCombobox from "@/components/financeiro/ItemCodeCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import {
  addDaysISO,
  formatBRL,
  formatDateBR,
  maskCurrencyInput,
  parseBRL,
  todayISO,
} from "@/lib/currency";
import {
  PAYMENT_METHODS,
  type ItemCode,
  type Payable,
  type PaymentMethod,
  type Supplier,
} from "@/types/financeiro";
import { Check, Pencil, Trash2 } from "lucide-react";

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

interface EditForm {
  arrival_date: string;
  due_date: string;
  supplier: Supplier | null;
  amountMasked: string;
  payment_method: PaymentMethod | "";
  itemCode: ItemCode | null;
}

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
      return (data ?? []) as Supplier[];
    },
  });
  const supplierName = useMemo(() => {
    const map = new Map(suppliers.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [suppliers]);

  const { data: itemCodes = [] } = useQuery({
    enabled: !!empresa,
    queryKey: ["item-codes-combobox", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("item_codes")
        .select("id, code")
        .eq("empresa_id", empresa!.id)
        .order("code");
      return (data ?? []) as ItemCode[];
    },
  });

  const today = todayISO();
  const next7 = addDaysISO(today, 7);
  const tomorrow = addDaysISO(today, 1);

  const { data: payables = [], isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["payables", empresa?.id, filter, today],
    queryFn: async () => {
      let q = supabase.from("payables").select("id, status, due_date, supplier_id, item_code, amount, payment_method, arrival_date").eq("empresa_id", empresa!.id);
      if (filter === "hoje") q = q.eq("status", "pendente").eq("due_date", today);
      else if (filter === "atrasadas") q = q.eq("status", "pendente").lt("due_date", today);
      else if (filter === "proximas") q = q.eq("status", "pendente").gte("due_date", tomorrow).lte("due_date", next7);
      else if (filter === "pendentes") q = q.eq("status", "pendente");
      else if (filter === "pagas") q = q.eq("status", "pago");
      const { data } = await q.order("due_date", { ascending: true }).limit(500);
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
      qc.invalidateQueries({ queryKey: ["cmv-purchases"] });
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

  // ============ Edição ============
  const [editing, setEditing] = useState<Payable | null>(null);
  const [form, setForm] = useState<EditForm>({
    arrival_date: "",
    due_date: "",
    supplier: null,
    amountMasked: "",
    payment_method: "",
    itemCode: null,
  });

  useEffect(() => {
    if (!editing) return;
    const sup = suppliers.find((s) => s.id === editing.supplier_id) ?? null;
    const code = itemCodes.find((c) => c.code === editing.item_code) ?? null;
    setForm({
      arrival_date: editing.arrival_date,
      due_date: editing.due_date,
      supplier: sup,
      amountMasked: maskCurrencyInput(
        Number(editing.amount).toFixed(2).replace(".", ","),
      ),
      payment_method: editing.payment_method as PaymentMethod,
      itemCode: code,
    });
  }, [editing, suppliers, itemCodes]);

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("Nada para editar");
      if (!form.supplier) throw new Error("Selecione um fornecedor");
      const amount = parseBRL(form.amountMasked);
      if (!amount || amount <= 0) throw new Error("Informe um valor válido");
      if (!form.arrival_date || !form.due_date) throw new Error("Preencha as datas");
      if (form.due_date < form.arrival_date)
        throw new Error("Vencimento não pode ser antes da chegada");
      if (!form.payment_method) throw new Error("Escolha a forma de pagamento");
      if (!form.itemCode) throw new Error("Selecione um código");

      const { error } = await supabase
        .from("payables")
        .update({
          supplier_id: form.supplier.id,
          arrival_date: form.arrival_date,
          due_date: form.due_date,
          amount,
          payment_method: form.payment_method,
          item_code: form.itemCode.code,
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Lançamento atualizado" });
      qc.invalidateQueries({ queryKey: ["payables"] });
      qc.invalidateQueries({ queryKey: ["financeiro-summary"] });
      qc.invalidateQueries({ queryKey: ["cmv-purchases"] });
      setEditing(null);
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

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
                      onClick={() => setEditing(p)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar lançamento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-arrival">Data chegada *</Label>
                <Input
                  id="e-arrival"
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-due">Data vencimento *</Label>
                <Input
                  id="e-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fornecedor *</Label>
              <SupplierCombobox
                value={form.supplier?.id ?? null}
                onChange={(s) => setForm({ ...form, supplier: s })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-amount">Valor *</Label>
                <Input
                  id="e-amount"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.amountMasked}
                  onChange={(e) =>
                    setForm({ ...form, amountMasked: maskCurrencyInput(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento *</Label>
                <Select
                  value={form.payment_method || undefined}
                  onValueChange={(v) =>
                    setForm({ ...form, payment_method: v as PaymentMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Código *</Label>
              <ItemCodeCombobox
                value={form.itemCode?.id ?? null}
                onChange={(c) => setForm({ ...form, itemCode: c })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
