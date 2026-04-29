import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Wallet, Building2 } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { formatCNPJ } from "@/lib/format";
import AppHeader from "@/components/AppHeader";

export default function SelecionarModulo() {
  const navigate = useNavigate();
  const { empresa, hydrating } = useEmpresa();

  useEffect(() => {
    if (!hydrating && !empresa) navigate("/selecionar-empresa", { replace: true });
  }, [empresa, hydrating, navigate]);

  if (!empresa) return null;

  const modulos = [
    {
      key: "rh",
      label: "Recursos Humanos",
      desc: "Colaboradores, holerites e relatórios.",
      icon: Users,
      to: "/",
    },
    {
      key: "financeiro",
      label: "Financeiro",
      desc: "Contas a pagar e fornecedores.",
      icon: Wallet,
      to: "/financeiro",
    },
    {
      key: "empresas",
      label: "Empresas",
      desc: "Gestão de empresas e convênio.",
      icon: Building2,
      to: "/empresas-modulo",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <AppHeader backFallback="/selecionar-empresa" backLabel="Empresas" />
      </div>
      <div className="p-4 flex items-center justify-center">
        <div className="w-full max-w-3xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground liquid-glass !rounded-full px-3 py-1.5">
              <span className="font-medium text-foreground">{empresa.nome}</span>
              <span className="font-mono">{formatCNPJ(empresa.cnpj)}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Escolha o módulo</h1>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {modulos.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => navigate(m.to)}
                  className="liquid-glass liquid-hover !rounded-3xl p-8 text-left space-y-4 group min-h-[180px]"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{m.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
