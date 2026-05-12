import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCNPJ } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientCompany } from "@/types/empresas-modulo";

interface Props {
  value: string | null;
  onChange: (c: ClientCompany | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ClientCompanyCombobox({ value, onChange, placeholder = "Selecione...", disabled }: Props) {
  const { empresa } = useEmpresa();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: clients = [] } = useQuery({
    enabled: !!empresa,
    queryKey: ["client-companies-combobox", empresa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_companies")
        .select("id, name, cnpj")
        .eq("empresa_id", empresa!.id)
        .order("name");
      return (data ?? []) as ClientCompany[];
    },
    staleTime: 30_000,
  });

  const selected = useMemo(() => clients.find((c) => c.id === value) ?? null, [clients, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.cnpj ?? "").includes(q),
    );
  }, [clients, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <Input
          autoFocus
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">
              Nenhum cliente. Cadastre em "Clientes".
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-left hover:bg-foreground/5"
              >
                <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{c.name}</div>
                  {c.cnpj && <div className="text-xs text-muted-foreground font-mono truncate">{formatCNPJ(c.cnpj)}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
