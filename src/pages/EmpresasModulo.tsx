import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import AppHeader from "@/components/AppHeader";

export default function EmpresasModulo() {
  const navigate = useNavigate();
  const { empresa, hydrating } = useEmpresa();

  useEffect(() => {
    if (!hydrating && !empresa) navigate("/selecionar-empresa", { replace: true });
  }, [empresa, hydrating, navigate]);

  if (!empresa) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        <AppHeader module="empresas" backFallback="/selecionar-modulo" backLabel="Módulos" />
      </div>
      <div className="px-4 pb-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-lg space-y-6 animate-fade-in text-center">
          <div className="liquid-glass !rounded-3xl p-10 space-y-5">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Empresas</h1>
              <p className="text-sm text-muted-foreground">
                Em breve. Esse módulo está em desenvolvimento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
