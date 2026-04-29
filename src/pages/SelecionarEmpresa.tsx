import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { formatCNPJ } from "@/lib/format";
import SettingsMenu from "@/components/SettingsMenu";
import type { Empresa } from "@/types";

export default function SelecionarEmpresa() {
  const navigate = useNavigate();
  const { setEmpresa } = useEmpresa();

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas-selector-list"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id, cnpj, nome, jornada_padrao").order("nome");
      return (data ?? []) as Empresa[];
    },
    staleTime: 30_000,
  });

  const escolher = (e: Empresa) => {
    setEmpresa(e);
    navigate("/selecionar-modulo");
  };

  return (
    <div className="relative min-h-screen bg-background p-4 flex items-center justify-center">
      <SettingsMenu showTrocarModulo={false} />
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Escolha a empresa</h1>
          <p className="text-muted-foreground text-sm"></p>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : empresas.length === 0 ? (
          <div className="liquid-glass !rounded-3xl p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
            <Button onClick={() => navigate("/empresas")}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar primeira empresa
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {empresas.map((e) => (
              <button
                key={e.id}
                onClick={() => escolher(e)}
                className="liquid-glass liquid-hover !rounded-2xl p-5 text-left flex items-center gap-4 group"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{e.nome}</div>
                  <div className="text-xs text-muted-foreground font-mono">{formatCNPJ(e.cnpj)}</div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary transition-colors">→</div>
              </button>
            ))}
            <Button variant="outline" onClick={() => navigate("/empresas")} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Nova empresa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
