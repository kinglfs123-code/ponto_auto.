import { memo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";


const prefetchers: Record<string, () => Promise<unknown>> = {
  "/funcionarios": () => import("@/pages/Funcionarios"),
  "/ponto": () => import("@/pages/Ponto"),
  "/holerites": () => import("@/pages/Holerites"),
  "/relatorios": () => import("@/pages/Relatorios"),
};
import {
  ClipboardList,
  FileText,
  Users,
  Receipt,
  Lock,
} from "lucide-react";
import { useWorkflowStatus, isRouteEnabled, getRouteMessage } from "@/hooks/use-workflow-status";
import { toast } from "@/hooks/use-toast";

const links = [
  { to: "/funcionarios", label: "Colaboradores", icon: Users, color: "--info" },
  { to: "/ponto", label: "Ponto", icon: ClipboardList, color: "--warning" },
  { to: "/holerites", label: "Holerites", icon: Receipt, color: "--success" },
  { to: "/relatorios", label: "Relatórios", icon: FileText, color: "--accent" },
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
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <nav className="liquid-glass pointer-events-auto !rounded-[28px]">
        <div className="flex items-center gap-2 px-3 py-3">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname.startsWith(l.to);
            const enabled = isRouteEnabled(l.to, workflow);
            const tileStyle = { "--tile-color": `var(${l.color})` } as CSSProperties;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={(e) => handleNavClick(e, l.to)}
                onMouseEnter={() => prefetchers[l.to]?.().catch(() => {})}
                onFocus={() => prefetchers[l.to]?.().catch(() => {})}
                aria-label={l.label}
                title={l.label}
                style={tileStyle}
                className={`dock-tile relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active && enabled ? "dock-tile-active" : ""
                } ${!enabled ? "dock-tile-disabled" : ""}`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                {!enabled && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-background/90 border border-border">
                    <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                )}
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
