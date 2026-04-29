import { memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "@/contexts/EmpresaContext";
import NavBarCmv from "./NavBarCmv";
import AppHeader from "@/components/AppHeader";
import { formatCNPJ } from "@/lib/format";

interface Props {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

function CmvLayoutBase({ children, title, showBack = true }: Props) {
  const { empresa, hydrating } = useEmpresa();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrating && !empresa) navigate("/selecionar-empresa", { replace: true });
  }, [empresa, hydrating, navigate]);

  if (!empresa) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <NavBarCmv />
      <div className="max-w-5xl mx-auto p-4 space-y-5">
        <AppHeader module="cmv" showBack={showBack} backFallback="/cmv" />
        <header className="animate-fade-in">
          <div className="min-w-0">
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
            )}
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="font-medium text-foreground/80 truncate">{empresa.nome}</span>
              <span className="font-mono">{formatCNPJ(empresa.cnpj)}</span>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export default memo(CmvLayoutBase);
