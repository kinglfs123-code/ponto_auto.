import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ClipboardList, FileText, LogOut, Home, Users, Receipt, Sun, Moon, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useWorkflowStatus, isRouteEnabled, getRouteMessage } from "@/hooks/use-workflow-status";
import { toast } from "@/hooks/use-toast";

const links = [
  { to: "/", label: "Início", icon: Home },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/funcionarios", label: "Colaboradores", icon: Users },
  { to: "/ponto", label: "Ponto", icon: ClipboardList },
  { to: "/holerites", label: "Holerites", icon: Receipt },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const workflow = useWorkflowStatus();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (!isRouteEnabled(to, workflow)) {
      e.preventDefault();
      toast({ title: getRouteMessage(to), variant: "destructive" });
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      {/* Dock principal de navegação */}
      <nav className="liquid-glass pointer-events-auto !rounded-[28px]">
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

      {/* Linha de controles: tema e sair em pílulas separadas */}
      <div className="flex items-center justify-center gap-3 pointer-events-auto">
        <div className="liquid-glass !rounded-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="h-10 w-10 text-muted-foreground rounded-full liquid-hover hover:bg-transparent"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        <div className="liquid-glass !rounded-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            aria-label="Sair"
            className="h-10 px-4 gap-2 text-muted-foreground hover:text-destructive rounded-full liquid-hover hover:bg-transparent"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
