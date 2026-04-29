import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/contexts/EmpresaContext";

export default function EmpresasModulo() {
  const navigate = useNavigate();
  const { empresa, hydrating } = useEmpresa();

  useEffect(() => {
    if (!hydrating && !empresa) navigate("/selecionar-empresa", { replace: true });
  }, [empresa, hydrating, navigate]);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-6 animate-fade-in text-center">
        <div className="liquid-glass !rounded-3xl p-10 space-y-5">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">
              Em breve. Esse módulo está em desenvolvimento.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/selecionar-modulo")}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Trocar módulo
          </Button>
        </div>
      </div>
    </div>
  );
}
