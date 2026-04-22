import { memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresa } from "@/contexts/EmpresaContext";
import type { Empresa } from "@/types";

interface Props {
  value?: string | null;
  onChange?: (empresa: Empresa | null) => void;
}

function EmpresaSelectorBase({ value, onChange }: Props) {
  const { empresa: ctxEmpresa, setEmpresa: setCtxEmpresa } = useEmpresa();
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-selector"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id, cnpj, nome, jornada_padrao");
      return (data ?? []) as Empresa[];
    },
    staleTime: 60_000,
  });

  const selectedId = value ?? ctxEmpresa?.id ?? "";

  const handleChange = useCallback(
    (v: string) => {
      const emp = empresas.find((e) => e.id === v) || null;
      setCtxEmpresa(emp);
      onChange?.(emp);
    },
    [empresas, setCtxEmpresa, onChange],
  );

  return (
    <Select value={selectedId || ""} onValueChange={handleChange}>
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="Selecione a empresa" />
      </SelectTrigger>
      <SelectContent>
        {empresas.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const EmpresaSelector = memo(EmpresaSelectorBase);
export default EmpresaSelector;
