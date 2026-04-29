import { memo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Table2 } from "lucide-react";

const prefetchers: Record<string, () => Promise<unknown>> = {
  "/cmv": () => import("@/pages/cmv/Home"),
  "/cmv/tabela": () => import("@/pages/cmv/Tabela"),
};

const links = [
  { to: "/cmv", label: "Visão geral", icon: LayoutDashboard, color: "--primary", exact: true },
  { to: "/cmv/tabela", label: "Tabela mensal", icon: Table2, color: "--info" },
];

function NavBarCmvBase() {
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
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
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

export default memo(NavBarCmvBase);
