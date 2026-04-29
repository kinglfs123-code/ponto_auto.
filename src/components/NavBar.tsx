import { memo } from "react";
import { Link, useLocation } from "react-router-dom";

// Prefetch route chunks on hover/focus to avoid waiting for download on click
const prefetchers: Record<string, () => Promise<unknown>> = {
  "/empresas": () => import("@/pages/Empresas"),
  "/funcionarios": () => import("@/pages/Funcionarios"),
  "/ponto": () => import("@/pages/Ponto"),
  "/holerites": () => import("@/pages/Holerites"),
  "/relatorios": () => import("@/pages/Relatorios"),
};
import {
  Building2,
  ClipboardList,
  FileText,
  Users,
  Receipt,
  Lock,
} from "lucide-react";
import { useWorkflowStatus, isRouteEnabled, getRouteMessage } from "@/hooks/use-workflow-status";
import { toast } from "@/hooks/use-toast";

const links = [
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/funcionarios", label: "Colaboradores", icon: Users },
  { to: "/ponto", label: "Ponto", icon: ClipboardList },
  { to: "/holerites", label: "Holerites", icon: Receipt },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
];

function NavBarBase() {
  const { pathname } = useLocation();
  const workflow = useWorkflowStatus();

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (!isRouteEnabled(to, workflow)) {
      e.preventDefault();
      toast({ title: getRouteMessage(to), variant: "destructive" });
    }
  };

  return (
    <div
      className="group fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      {/* Hover zone — invisible strip at bottom that triggers reveal */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-20" aria-hidden="true" />

      {/* Dock principal de navegação — hidden by default, revealed on hover/focus */}
      <nav
        className="liquid-glass pointer-events-auto !rounded-[28px] opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
      >
        <div className="flex items-center gap-1 px-2 py-2">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            const enabled = isRouteEnabled(l.to, workflow);
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={(e) => handleNavClick(e, l.to)}
                onMouseEnter={() => prefetchers[l.to]?.().catch(() => {})}
                onFocus={() => prefetchers[l.to]?.().catch(() => {})}
                aria-label={l.label}
                className={`liquid-hover flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl min-w-[3.5rem] ${
                  !enabled
                    ? "opacity-30 cursor-not-allowed"
                    : active
                      ? "liquid-pill-active text-primary"
                      : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-6 w-6 ${active && enabled ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`}
                    strokeWidth={active && enabled ? 2.2 : 1.8}
                  />
                  {!enabled && (
                    <Lock className="h-3 w-3 absolute -top-1 -right-1.5 text-muted-foreground" />
                  )}
                </div>
                <span
                  className={`text-[11px] leading-4 ${
                    active && enabled ? "font-semibold" : "font-normal opacity-80"
                  }`}
                >
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

const NavBar = memo(NavBarBase);
export default NavBar;
