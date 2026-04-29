import { memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "@/contexts/EmpresaContext";
import NavBarFinanceiro from "./NavBarFinanceiro";
import { maskCNPJ } from "@/lib/ponto-rules";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

interface Props {
  children: React.ReactNode;
  title?: string;
  showBackToHome?: boolean;
}

function FinanceiroLayoutBase({ children, title, showBackToHome = true }: Props) {
  const { empresa, hydrating } = useEmpresa();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrating && !empresa) navigate("/selecionar-empresa", { replace: true });
  }, [empresa, hydrating, navigate]);

  if (!empresa) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <NavBarFinanceiro />
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        <header className="flex items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-semibold tracking-tight truncate">{title}</h1>}
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="font-medium text-foreground/80 truncate">{empresa.nome}</span>
              <span className="font-mono">{maskCNPJ(empresa.cnpj)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/selecionar-modulo")}
            className="liquid-glass liquid-hover !rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Módulo
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export default memo(FinanceiroLayoutBase);
