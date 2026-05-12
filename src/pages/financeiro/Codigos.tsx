import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Hash, Pencil, Plus, Trash2 } from "lucide-react";
import type { ItemCode } from "@/types/financeiro";

const emptyForm = { code: "", description: "" };

export default function Codigos() {
  const { empresa } = useEmpresa();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ItemCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const open = creating || !!editing;

  const { data: codes = [], isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["item-codes-page", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("item_codes")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .order("code")
        .limit(500);
      return (data ?? []) as ItemCode[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [codes, search]);

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (c: ItemCode) => {
    setForm({ code: c.code, description: c.description });
    setCreating(false);
    setEditing(c);
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!empresa) throw new Error("Empresa não selecionada");
      const code = form.code.trim();
      const description = form.description.trim();
      if (!code || !description) throw new Error("Código e descrição são obrigatórios");
      const payload = { empresa_id: empresa.id, code, description };
      if (editing) {
        const { error } = await supabase.from("item_codes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("item_codes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Código atualizado" : "Código criado" });
      qc.invalidateQueries({ queryKey: ["item-codes-page"] });
      qc.invalidateQueries({ queryKey: ["item-codes-combobox"] });
      close();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("item_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Código excluído" });
      qc.invalidateQueries({ queryKey: ["item-codes-page"] });
      qc.invalidateQueries({ queryKey: ["item-codes-combobox"] });
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const handleDelete = async (c: ItemCode) => {
    const ok = await confirm({
      title: "Excluir código?",
      description: `${c.code} — ${c.description}`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (ok) remove.mutate(c.id);
  };

  return (
    <FinanceiroLayout title="Códigos">
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
          <Hash className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhum código encontrado." : "Nenhum código cadastrado."}
          </p>
          {!search && (
            <Button variant="outline" onClick={startCreate}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar código
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="liquid-glass !rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-mono text-xs shrink-0">
                {c.code.slice(0, 4)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm">{c.code}</div>
                <div className="text-sm text-muted-foreground truncate">{c.description}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(c)}
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
            <DialogTitle>{editing ? "Editar código" : "Novo código"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="c-code">Código *</Label>
              <Input
                id="c-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                autoFocus
                placeholder="Ex: 001"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Descrição *</Label>
              <Input
                id="c-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Materiais de limpeza"
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
    </FinanceiroLayout>
  );
}
