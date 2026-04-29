import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { PlusCircle, ListChecks, Truck, Hash } from "lucide-react";

const prefetchers: Record<string, () => Promise<unknown>> = {
  "/financeiro/lancamento": () => import("@/pages/financeiro/LancamentoRapido"),
  "/financeiro/contas": () => import("@/pages/financeiro/Contas"),
  "/financeiro/codigos": () => import("@/pages/financeiro/Codigos"),
  "/financeiro/fornecedores": () => import("@/pages/financeiro/Fornecedores"),
};

const links = [
  { to: "/financeiro/lancamento", label: "Lançar", icon: PlusCircle },
  { to: "/financeiro/contas", label: "Contas", icon: ListChecks },
  { to: "/financeiro/codigos", label: "Códigos", icon: Hash },
  { to: "/financeiro/fornecedores", label: "Fornecedores", icon: Truck },
];

function NavBarFinanceiroBase() {
  const { pathname } = useLocation();

  return (
    <div
      className="group fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-20" aria-hidden="true" />

      <nav
        className="liquid-glass pointer-events-auto !rounded-[28px] opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
      >
        <div className="flex items-center gap-1 px-2 py-2">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                onMouseEnter={() => prefetchers[l.to]?.().catch(() => {})}
                onFocus={() => prefetchers[l.to]?.().catch(() => {})}
                aria-label={l.label}
                className={`liquid-hover flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl min-w-[3.5rem] ${
                  active ? "liquid-pill-active text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${active ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={`text-[11px] leading-4 ${active ? "font-semibold" : "font-normal opacity-80"}`}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const NavBarFinanceiro = memo(NavBarFinanceiroBase);
export default NavBarFinanceiro;
