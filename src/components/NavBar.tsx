import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ClipboardList, FileText, LogOut, Home, Users, Receipt, Sun, Moon, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
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

  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-40 liquid-glass !rounded-none border-b px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-primary">
            FOLHA DE PONTO
          </span>
          <div className="flex items-center gap-1 liquid-glass !rounded-full px-1 py-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground rounded-full liquid-hover">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full liquid-hover">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <nav
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 liquid-glass safe-area-bottom"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-around gap-1 px-2 py-2">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              const enabled = isRouteEnabled(l.to, workflow);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => handleNavClick(e, l.to)}
                  className={`liquid-hover flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl min-w-[3.25rem] ${
                    !enabled
                      ? "opacity-30 cursor-not-allowed"
                      : active
                        ? "liquid-pill-active text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`h-5 w-5 ${active && enabled ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`}
                      strokeWidth={active && enabled ? 2.2 : 1.8}
                    />
                    {!enabled && (
                      <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-tight ${
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
      </>
    );
  }

  return (
    <nav className="sticky top-3 z-40 px-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 liquid-glass !rounded-full px-3 py-1.5">
          <span className="text-sm font-bold tracking-tight text-primary pl-2 pr-1">
            FOLHA DE PONTO
          </span>
          <div className="flex items-center gap-0.5">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              const enabled = isRouteEnabled(l.to, workflow);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => handleNavClick(e, l.to)}
                  className={`liquid-hover flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    !enabled
                      ? "opacity-30 cursor-not-allowed"
                      : active
                        ? "liquid-pill-active text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" strokeWidth={active && enabled ? 2.2 : 1.8} />
                    {!enabled && (
                      <Lock className="h-2.5 w-2.5 absolute -top-0.5 -right-1.5 text-muted-foreground" />
                    )}
                  </div>
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1 liquid-glass !rounded-full px-1.5 py-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground rounded-full liquid-hover"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive gap-1.5 rounded-full liquid-hover"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
