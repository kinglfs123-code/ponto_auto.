import { memo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { PlusCircle, ListChecks, Truck, Hash } from "lucide-react";

const prefetchers: Record<string, () => Promise<unknown>> = {
  "/financeiro/lancamento": () => import("@/pages/financeiro/LancamentoRapido"),
  "/financeiro/contas": () => import("@/pages/financeiro/Contas"),
  "/financeiro/codigos": () => import("@/pages/financeiro/Codigos"),
  "/financeiro/fornecedores": () => import("@/pages/financeiro/Fornecedores"),
};

const links = [
  { to: "/financeiro/lancamento", label: "Lançar", icon: PlusCircle, color: "--success" },
  { to: "/financeiro/contas", label: "Contas", icon: ListChecks, color: "--primary" },
  { to: "/financeiro/codigos", label: "Códigos", icon: Hash, color: "--warning" },
  { to: "/financeiro/fornecedores", label: "Fornecedores", icon: Truck, color: "--info" },
];

function NavBarFinanceiroBase() {
  const { pathname } = useLocation();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <nav className="liquid-glass pointer-events-auto !rounded-[28px]">
        <div className="flex items-center gap-2 px-3 py-3">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname.startsWith(l.to);
            const tileStyle = { "--tile-color": `var(${l.color})` } as CSSProperties;
            return (
              <Link
                key={l.to}
                to={l.to}
                onMouseEnter={() => prefetchers[l.to]?.().catch(() => {})}
                onFocus={() => prefetchers[l.to]?.().catch(() => {})}
                aria-label={l.label}
                title={l.label}
                style={tileStyle}
                className={`dock-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active ? "dock-tile-active" : ""
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
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
