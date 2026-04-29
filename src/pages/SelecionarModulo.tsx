import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Wallet, Building2, ArrowLeftRight } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { maskCNPJ } from "@/lib/ponto-rules";

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
      desc: "Empresas, colaboradores, ponto, holerites e relatórios.",
      icon: Users,
      to: "/",
    },
    {
      key: "financeiro",
      label: "Financeiro",
      desc: "Contas a pagar, fornecedores e fluxo do dia.",
      icon: Wallet,
      to: "/financeiro",
    },
    {
      key: "empresas",
      label: "Empresas",
      desc: "Gestão de empresas. Em breve.",
      icon: Building2,
      to: "/empresas-modulo",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground liquid-glass !rounded-full px-3 py-1.5">
            <span className="font-medium text-foreground">{empresa.nome}</span>
            <span className="font-mono">{maskCNPJ(empresa.cnpj)}</span>
            <button
              onClick={() => navigate("/selecionar-empresa")}
              className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ArrowLeftRight className="h-3 w-3" /> trocar
            </button>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">O que você vai fazer?</h1>
          <p className="text-muted-foreground text-sm">Escolha o módulo para continuar.</p>
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
  );
}
