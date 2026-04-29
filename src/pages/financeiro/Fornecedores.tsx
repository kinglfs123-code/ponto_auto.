import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethod, type Supplier, type ItemCode } from "@/types/financeiro";
import { useQuery } from "@tanstack/react-query";

const emptyForm = {
  name: "",
  cnpj: "",
  default_payment_method: "" as PaymentMethod | "",
  default_item_code: "",
  default_due_days: "" as string,
};

export default function Fornecedores() {
  const { empresa } = useEmpresa();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const open = creating || !!editing;

  const { data: suppliers = [], isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["suppliers-page", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .order("name");
      return (data ?? []) as Supplier[];
    },
    staleTime: 30_000,
  });

  const { data: itemCodes = [] } = useQuery({
    enabled: !!empresa,
    queryKey: ["item-codes-combobox", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("item_codes")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .order("code");
      return (data ?? []) as ItemCode[];
    },
    staleTime: 30_000,
  });

  const selectedCodeId = useMemo(
    () => itemCodes.find((c) => c.code === form.default_item_code)?.id ?? null,
    [itemCodes, form.default_item_code],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.cnpj.includes(q));
  }, [suppliers, search]);

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      cnpj: s.cnpj,
      default_payment_method: (s.default_payment_method as PaymentMethod) ?? "",
      default_item_code: s.default_item_code ?? "",
      default_due_days: s.default_due_days != null ? String(s.default_due_days) : "",
    });
    setCreating(false);
    setEditing(s);
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!empresa) throw new Error("Empresa não selecionada");
      if (!form.name.trim() || !form.cnpj.trim()) throw new Error("Nome e CNPJ são obrigatórios");
      const payload = {
        empresa_id: empresa.id,
        name: form.name.trim(),
        cnpj: form.cnpj.trim(),
        default_payment_method: form.default_payment_method || null,
        default_item_code: form.default_item_code.trim() || null,
        default_due_days: form.default_due_days ? parseInt(form.default_due_days, 10) : null,
      };
      if (editing) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Fornecedor atualizado" : "Fornecedor criado" });
      qc.invalidateQueries({ queryKey: ["suppliers-page"] });
      qc.invalidateQueries({ queryKey: ["suppliers-combobox"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      close();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Bloqueia exclusão se houver lançamentos
      const { count } = await supabase
        .from("payables")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", id);
      if ((count ?? 0) > 0) {
        throw new Error("Existem lançamentos vinculados a este fornecedor. Exclua-os primeiro.");
      }
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fornecedor excluído" });
      qc.invalidateQueries({ queryKey: ["suppliers-page"] });
      qc.invalidateQueries({ queryKey: ["suppliers-combobox"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
    },
    onError: (e: Error) => toast({ title: "Não foi possível excluir", description: e.message, variant: "destructive" }),
  });

  const handleDelete = async (s: Supplier) => {
    const ok = await confirm({
      title: "Excluir fornecedor?",
      description: s.name,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (ok) remove.mutate(s.id);
  };

  return (
    <FinanceiroLayout title="Fornecedores">
      <div className="flex items-center gap-2">
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass !rounded-2xl p-8 text-center space-y-3">
          <Truck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhum fornecedor encontrado." : "Nenhum fornecedor cadastrado."}
          </p>
          {!search && (
            <Button variant="outline" onClick={startCreate}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar fornecedor
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="liquid-glass !rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.cnpj}</div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  {s.default_payment_method && (
                    <span>
                      Padrão: {PAYMENT_METHODS.find((m) => m.value === s.default_payment_method)?.label}
                    </span>
                  )}
                  {s.default_item_code && <span>Cód.: {s.default_item_code}</span>}
                  {s.default_due_days != null && <span>{s.default_due_days}d p/ vencer</span>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(s)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="f-name">Nome *</Label>
              <Input id="f-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cnpj">CNPJ *</Label>
              <Input
                id="f-cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento padrão</Label>
              <Select
                value={form.default_payment_method || undefined}
                onValueChange={(v) => setForm({ ...form, default_payment_method: v as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-code">Código padrão</Label>
                <Input
                  id="f-code"
                  value={form.default_item_code}
                  onChange={(e) => setForm({ ...form, default_item_code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-days">Prazo (dias)</Label>
                <Input
                  id="f-days"
                  type="number"
                  min="0"
                  value={form.default_due_days}
                  onChange={(e) => setForm({ ...form, default_due_days: e.target.value })}
                />
              </div>
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
    </FinanceiroLayout>
  );
}
