import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import EmpresasModuloLayout from "@/components/empresas-modulo/EmpresasModuloLayout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Pencil, Plus, Trash2, Building2 } from "lucide-react";
import type { ClientCompany } from "@/types/empresas-modulo";

const emptyForm = { name: "", cnpj: "", notes: "" };

export default function Clientes() {
  const { empresa } = useEmpresa();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClientCompany | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const open = creating || !!editing;

  const { data: clients = [], isLoading } = useQuery({
    enabled: !!empresa,
    queryKey: ["client-companies-page", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_companies")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .order("name");
      return (data ?? []) as ClientCompany[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.cnpj ?? "").includes(q));
  }, [clients, search]);

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (c: ClientCompany) => {
    setForm({ name: c.name, cnpj: c.cnpj ?? "", notes: c.notes ?? "" });
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
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        empresa_id: empresa.id,
        name: form.name.trim(),
        cnpj: form.cnpj.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("client_companies").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_companies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Cliente atualizado" : "Cliente criado" });
      qc.invalidateQueries({ queryKey: ["client-companies-page"] });
      qc.invalidateQueries({ queryKey: ["client-companies-combobox"] });
      close();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from("client_billings")
        .select("id", { count: "exact", head: true })
        .eq("client_company_id", id);
      if ((count ?? 0) > 0) {
        throw new Error("Existem cobranças vinculadas a este cliente. Exclua-as primeiro.");
      }
      const { error } = await supabase.from("client_companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cliente excluído" });
      qc.invalidateQueries({ queryKey: ["client-companies-page"] });
      qc.invalidateQueries({ queryKey: ["client-companies-combobox"] });
    },
    onError: (e: Error) =>
      toast({ title: "Não foi possível excluir", description: e.message, variant: "destructive" }),
  });

  const handleDelete = async (c: ClientCompany) => {
    const ok = await confirm({
      title: "Excluir cliente?",
      description: c.name,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (ok) remove.mutate(c.id);
  };

  return (
    <EmpresasModuloLayout title="Clientes" showBack>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
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
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
          </p>
          {!search && (
            <Button variant="outline" onClick={startCreate}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="liquid-glass !rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                {c.cnpj && <div className="text-xs text-muted-foreground font-mono">{c.cnpj}</div>}
                {c.notes && <div className="text-xs text-muted-foreground mt-1 truncate">{c.notes}</div>}
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
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nome *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cnpj">CNPJ</Label>
              <Input
                id="c-cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">Observações</Label>
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
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
