import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Empresa {
  id: string;
  cnpj: string;
  nome: string;
  jornada_padrao: string;
}

interface Props {
  value: string | null;
  onChange: (empresa: Empresa | null) => void;
}

export default function EmpresaSelector({ value, onChange }: Props) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    supabase.from("empresas").select("id, cnpj, nome, jornada_padrao").then(({ data }) => {
      if (data) setEmpresas(data);
    });
  }, []);

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => {
        const emp = empresas.find((e) => e.id === v) || null;
        onChange(emp);
      }}
    >
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="Selecione a empresa" />
      </SelectTrigger>
      <SelectContent>
        {empresas.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.nome} — {e.cnpj}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
