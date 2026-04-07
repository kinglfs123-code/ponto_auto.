import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export interface FuncionarioOption {
  id: string;
  nome_completo: string;
  horario_entrada: string;
  horario_saida: string;
}

interface Props {
  empresaId: string | null;
  value: FuncionarioOption | null;
  manualName: string;
  onSelect: (func: FuncionarioOption | null) => void;
  onManualName: (name: string) => void;
}

export default function FuncionarioSelector({ empresaId, value, manualName, onSelect, onManualName }: Props) {
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!empresaId) {
      setFuncionarios([]);
      return;
    }
    supabase
      .from("funcionarios")
      .select("id, nome_completo, horario_entrada, horario_saida")
      .eq("empresa_id", empresaId)
      .order("nome_completo")
      .then(({ data }) => {
        setFuncionarios(data || []);
      });
  }, [empresaId]);

  if (manual || funcionarios.length === 0) {
    return (
      <div className="flex gap-1 items-center">
        <Input
          value={manualName}
          onChange={(e) => { onManualName(e.target.value); onSelect(null); }}
          placeholder="Nome do funcionário"
          className="flex-1"
        />
        {funcionarios.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setManual(false)} title="Selecionar cadastrado">
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-1 items-center">
      <Select
        value={value?.id || ""}
        onValueChange={(v) => {
          if (v === "__manual__") {
            setManual(true);
            onSelect(null);
            return;
          }
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
          <SelectItem value="__manual__">✏️ Digitar nome manualmente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
