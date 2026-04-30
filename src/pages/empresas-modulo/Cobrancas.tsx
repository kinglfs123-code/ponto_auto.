import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import EmpresasModuloLayout from "@/components/empresas-modulo/EmpresasModuloLayout";
import ClientCompanyCombobox from "@/components/empresas-modulo/ClientCompanyCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Pencil, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatBRL, maskCurrencyInput, parseBRL, formatDateBR, todayISO } from "@/lib/format";
import {
  BILLING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  computePaymentStatus,
  type BillingStatus,
  type ClientBilling,
  type ClientCompany,
  type PaymentStatusBilling,
} from "@/types/empresas-modulo";

type BillingRow = ClientBilling & { client: ClientCompany | null };

const emptyForm = {
  client_company_id: null as string | null,
  measurement_date: "",
  send_date: "",
  description: "",
  amountMasked: "",
  due_date: "",
  received_date: "",
  billing_status: "aguardando_oc" as BillingStatus,
};

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function firstOfMonthISO(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function lastOfMonthISO(year: number, month: number) {
  const d = new Date(year, month + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_TONE: Record<PaymentStatusBilling, string> = {
  recebido: "bg-success/15 text-success border-success/30",
  recebido_com_atraso: "bg-warning/15 text-warning border-warning/30",
  a_receber: "bg-warning/15 text-warning border-warning/30",
  atrasado: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Cobrancas() {
  const { empresa } = useEmpresa();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const refMonth = firstOfMonthISO(cursor.y, cursor.m);
  const refMonthEnd = lastOfMonthISO(cursor.y, cursor.m);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClientBilling | null>(null);
  const [form, setForm] = useState(emptyForm);
  const open = creating || !!editing;

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["client-billings", empresa?.id, refMonth],
    queryFn: async () => {
      const { data: bills } = await supabase
        .from("client_billings")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .gte("reference_month", refMonth)
        .lte("reference_month", refMonthEnd)
        .order("created_at", { ascending: true });
      const billings = (bills ?? []) as ClientBilling[];
      const ids = Array.from(new Set(billings.map((b) => b.client_company_id)));
      let clientsMap = new Map<string, ClientCompany>();
      if (ids.length) {
        const { data: cs } = await supabase
          .from("client_companies")
          .select("*")
          .in("id", ids);
        for (const c of (cs ?? []) as ClientCompany[]) clientsMap.set(c.id, c);
      }
      return billings.map<BillingRow>((b) => ({ ...b, client: clientsMap.get(b.client_company_id) ?? null }));
    },
    staleTime: 30_000,
  });

  const today = todayISO();

  const summary = useMemo(() => {
    const totalFaturado = rows
      .filter((r) => r.billing_status === "faturado")
      .reduce((s, r) => s + Number(r.amount), 0);
    const totalRecebido = rows
      .filter((r) => r.payment_status === "recebido" || r.payment_status === "recebido_com_atraso")
      .reduce((s, r) => s + Number(r.amount), 0);
    const totalAReceber = rows
      .filter((r) => r.payment_status === "a_receber")
      .reduce((s, r) => s + Number(r.amount), 0);
    const totalAtrasado = rows
      .filter((r) => r.payment_status === "atrasado")
      .reduce((s, r) => s + Number(r.amount), 0);
    return { totalFaturado, totalRecebido, totalAReceber, totalAtrasado };
  }, [rows]);

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (b: ClientBilling) => {
    setForm({
      client_company_id: b.client_company_id,
      measurement_date: b.measurement_date ?? "",
      send_date: b.send_date ?? "",
      description: b.description ?? "",
      amountMasked: maskCurrencyInput(String(Math.round(Number(b.amount) * 100))),
      due_date: b.due_date ?? "",
      received_date: b.received_date ?? "",
      billing_status: b.billing_status,
    });
    setCreating(false);
    setEditing(b);
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!empresa) throw new Error("Empresa não selecionada");
      if (!form.client_company_id) throw new Error("Selecione um cliente");
      const amount = parseBRL(form.amountMasked);
      const payment_status = computePaymentStatus({
        due_date: form.due_date || null,
        received_date: form.received_date || null,
        today,
      });
      const payload = {
        empresa_id: empresa.id,
        client_company_id: form.client_company_id,
        reference_month: refMonth,
        measurement_date: form.measurement_date || null,
        send_date: form.send_date || null,
        description: form.description.trim() || null,
        amount,
        due_date: form.due_date || null,
        received_date: form.received_date || null,
        billing_status: form.billing_status,
        payment_status,
      };
      if (editing) {
        const { error } = await supabase.from("client_billings").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_billings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Cobrança atualizada" : "Cobrança criada" });
      qc.invalidateQueries({ queryKey: ["client-billings"] });
      close();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_billings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cobrança excluída" });
      qc.invalidateQueries({ queryKey: ["client-billings"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleDelete = async (b: BillingRow) => {
    const ok = await confirm({
      title: "Excluir cobrança?",
      description: b.client?.name ?? "",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (ok) remove.mutate(b.id);
  };

  const goPrev = () => {
    setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  };
  const goNext = () => {
    setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
  };

  return (
    <EmpresasModuloLayout title="Empresas">
      {/* Month selector */}
      <div className="flex items-center justify-between gap-2 liquid-glass !rounded-2xl px-3 py-2">
        <Button size="icon" variant="ghost" onClick={goPrev} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium capitalize">{monthLabel(new Date(cursor.y, cursor.m, 1))}</div>
        <Button size="icon" variant="ghost" onClick={goNext} aria-label="Próximo mês">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Faturado", value: summary.totalFaturado, tone: "text-foreground" },
          { label: "Recebido", value: summary.totalRecebido, tone: "text-primary-foreground" },
          { label: "A receber", value: summary.totalAReceber, tone: "text-warning" },
          { label: "Atrasado", value: summary.totalAtrasado, tone: "text-destructive" },
        ].map((c) => (
          <div key={c.label} className="liquid-glass !rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className={`mt-1 text-base font-semibold tabular-nums ${c.tone}`}>{formatBRL(c.value)}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova cobrança
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : rows.length === 0 ? (
        <div className="liquid-glass !rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Nenhuma cobrança neste mês.</p>
          <Button variant="outline" onClick={startCreate}>
            <Plus className="h-4 w-4 mr-2" /> Lançar cobrança
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((b) => (
            <div key={b.id} className="liquid-glass !rounded-2xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-medium truncate">{b.client?.name ?? "—"}</div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_TONE[b.payment_status]}`}
                  >
                    {PAYMENT_STATUS_LABELS[b.payment_status]}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                    {BILLING_STATUS_LABELS[b.billing_status]}
                  </span>
                </div>
                {b.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">{b.description}</div>
                )}
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  <span>Valor: <span className="font-medium text-foreground">{formatBRL(Number(b.amount))}</span></span>
                  {b.due_date && <span>Venc.: {formatDateBR(b.due_date)}</span>}
                  {b.received_date && <span>Receb.: {formatDateBR(b.received_date)}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(b)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cobrança" : "Nova cobrança"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <ClientCompanyCombobox
                value={form.client_company_id}
                onChange={(c) => setForm({ ...form, client_company_id: c?.id ?? null })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-amount">Valor *</Label>
                <Input
                  id="b-amount"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.amountMasked}
                  onChange={(e) => setForm({ ...form, amountMasked: maskCurrencyInput(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-due">Vencimento</Label>
                <Input
                  id="b-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-meas">Data medição</Label>
                <Input
                  id="b-meas"
                  type="date"
                  value={form.measurement_date}
                  onChange={(e) => setForm({ ...form, measurement_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-send">Envio medição</Label>
                <Input
                  id="b-send"
                  type="date"
                  value={form.send_date}
                  onChange={(e) => setForm({ ...form, send_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status faturamento</Label>
                <Select
                  value={form.billing_status}
                  onValueChange={(v) => setForm({ ...form, billing_status: v as BillingStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando_oc">Aguardando OC</SelectItem>
                    <SelectItem value="faturado">Faturado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-recv">Data recebimento</Label>
                <Input
                  id="b-recv"
                  type="date"
                  value={form.received_date}
                  onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-desc">Descrição / Observação</Label>
              <Textarea
                id="b-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Ex: Pavotec NF 1ª R$ 5.323,80..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </EmpresasModuloLayout>
  );
}
