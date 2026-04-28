import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types/financeiro";

interface Props {
  value: string | null;
  onChange: (supplier: Supplier | null) => void;
}

export default function SupplierCombobox({ value, onChange }: Props) {
  const { empresa } = useEmpresa();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: suppliers = [], refetch } = useQuery({
    enabled: !!empresa,
    queryKey: ["suppliers-combobox", empresa?.id],
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

  const selected = useMemo(() => suppliers.find((s) => s.id === value) || null, [suppliers, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.cnpj.includes(q));
  }, [suppliers, query]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {selected ? selected.name : <span className="text-muted-foreground">Selecione o fornecedor</span>}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Buscar por nome ou CNPJ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-sm text-center text-muted-foreground">
                Nenhum fornecedor encontrado.
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left"
                >
                  <Check className={cn("h-4 w-4", selected?.id === s.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.cnpj}</div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-1 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo fornecedor
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <QuickCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (newId) => {
          const { data: refreshed } = await refetch();
          const created = (refreshed ?? []).find((s) => s.id === newId) || null;
          if (created) onChange(created);
        }}
      />
    </>
  );
}

function QuickCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { empresa } = useEmpresa();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa) return;
    if (!name.trim() || !cnpj.trim()) {
      toast({ title: "Preencha nome e CNPJ", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ empresa_id: empresa.id, name: name.trim(), cnpj: cnpj.trim() })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar fornecedor", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fornecedor criado" });
    setName("");
    setCnpj("");
    onClose();
    if (data?.id) onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo fornecedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qc-name">Nome</Label>
            <Input id="qc-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-cnpj">CNPJ</Label>
            <Input id="qc-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
