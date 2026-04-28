import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import SupplierCombobox from "@/components/financeiro/SupplierCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { addDaysISO, maskCurrencyInput, parseBRL, todayISO } from "@/lib/currency";
import { PAYMENT_METHODS, type PaymentMethod, type Supplier } from "@/types/financeiro";

export default function LancamentoRapido() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [arrivalDate, setArrivalDate] = useState(todayISO());
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [amountMasked, setAmountMasked] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [itemCode, setItemCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSupplier = (s: Supplier | null) => {
    setSupplier(s);
    if (!s) return;
    if (s.default_payment_method && !paymentMethod) {
      setPaymentMethod(s.default_payment_method);
    }
    if (s.default_item_code && !itemCode) {
      setItemCode(s.default_item_code);
    }
    if (s.default_due_days != null && !dueDate && arrivalDate) {
      setDueDate(addDaysISO(arrivalDate, s.default_due_days));
    }
  };

  const reset = () => {
    setSupplier(null);
    setAmountMasked("");
    setDueDate("");
    setPaymentMethod("");
    setItemCode("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa) return;
    if (!supplier) return toast({ title: "Selecione um fornecedor", variant: "destructive" });
    const amount = parseBRL(amountMasked);
    if (!amount || amount <= 0) return toast({ title: "Informe um valor válido", variant: "destructive" });
    if (!arrivalDate || !dueDate) return toast({ title: "Preencha as datas", variant: "destructive" });
    if (dueDate < arrivalDate) return toast({ title: "Vencimento não pode ser antes da chegada", variant: "destructive" });
    if (!paymentMethod) return toast({ title: "Escolha a forma de pagamento", variant: "destructive" });
    if (!itemCode.trim()) return toast({ title: "Informe o código", variant: "destructive" });

    setSaving(true);
    const { error } = await supabase.from("payables").insert({
      empresa_id: empresa.id,
      supplier_id: supplier.id,
      arrival_date: arrivalDate,
      amount,
      due_date: dueDate,
      payment_method: paymentMethod,
      item_code: itemCode.trim(),
      status: "pendente",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lançamento criado" });
    qc.invalidateQueries({ queryKey: ["financeiro-summary"] });
    qc.invalidateQueries({ queryKey: ["payables"] });
    reset();
  };

  return (
    <FinanceiroLayout title="Novo lançamento">
      <form onSubmit={submit} className="liquid-glass !rounded-3xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="arrival">Data chegada *</Label>
            <Input id="arrival" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Data vencimento *</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Fornecedor *</Label>
          <SupplierCombobox value={supplier?.id ?? null} onChange={handleSupplier} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              inputMode="numeric"
              placeholder="0,00"
              value={amountMasked}
              onChange={(e) => setAmountMasked(maskCurrencyInput(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Forma de pagamento *</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
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
          <Label htmlFor="code">Código *</Label>
          <Input id="code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="Código do item" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/financeiro")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar lançamento"}
          </Button>
        </div>
      </form>
    </FinanceiroLayout>
  );
}
