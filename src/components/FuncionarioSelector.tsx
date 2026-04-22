import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface FuncionarioOption {
  id: string;
  nome_completo: string;
  horario_entrada: string;
  horario_saida: string;
  intervalo: string;
}

interface Props {
  empresaId: string | null;
  value: FuncionarioOption | null;
  manualName: string;
  onSelect: (func: FuncionarioOption | null) => void;
  onManualName: (name: string) => void;
  onLoadedFuncionarios?: (list: FuncionarioOption[]) => void;
}

export default function FuncionarioSelector({ empresaId, value, manualName, onSelect, onManualName, onLoadedFuncionarios }: Props) {
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);

  useEffect(() => {
    if (!empresaId) {
      setFuncionarios([]);
      return;
    }
    supabase
      .from("funcionarios")
      .select("id, nome_completo, horario_entrada, horario_saida, intervalo")
      .eq("empresa_id", empresaId)
      .order("nome_completo")
      .then(({ data }) => {
        const list = data || [];
        setFuncionarios(list);
        onLoadedFuncionarios?.(list);
      });
  }, [empresaId]);

  // Fallback: empresa sem colaboradores cadastrados — input manual
  if (funcionarios.length === 0) {
    return (
      <Input
        value={manualName}
        onChange={(e) => { onManualName(e.target.value); onSelect(null); }}
        placeholder="Nome do funcionário"
        className="flex-1"
      />
    );
  }

  return (
    <Select
      value={value?.id || ""}
      onValueChange={(v) => {
        const f = funcionarios.find((x) => x.id === v) || null;
        onSelect(f);
        if (f) onManualName(f.nome_completo);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione o funcionário" />
      </SelectTrigger>
      <SelectContent>
        {funcionarios.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.nome_completo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
