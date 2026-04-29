import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ItemCode } from "@/types/financeiro";

interface Props {
  value: string | null;
  onChange: (item: ItemCode | null) => void;
  placeholder?: string;
}

export default function ItemCodeCombobox({ value, onChange, placeholder = "Selecione o código" }: Props) {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: codes = [] } = useQuery({
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

  const selected = useMemo(() => codes.find((c) => c.id === value) || null, [codes, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [codes, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected ? (
            <span className="truncate">
              <span className="font-mono">{selected.code}</span> — {selected.description}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            autoFocus
            placeholder="Buscar código ou descrição..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {codes.length === 0 ? (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground space-y-3">
              <div>Nenhum código cadastrado.</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  navigate("/financeiro/codigos");
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Cadastrar código
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">
              Nenhum código encontrado.
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left"
              >
                <Check className={cn("h-4 w-4", selected?.id === c.id ? "opacity-100" : "opacity-0")} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">{c.code}</div>
                  <div className="truncate">{c.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
        {value && (
          <div className="p-1 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
