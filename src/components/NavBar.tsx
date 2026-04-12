import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ClipboardList, FileText, LogOut, Home, Users, Receipt, Sun, Moon, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkflowStatus, isRouteEnabled, getRouteMessage } from "@/hooks/use-workflow-status";
import { toast } from "sonner";

const links = [
  { to: "/", label: "Início", icon: Home },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/funcionarios", label: "Funcionários", icon: Users },
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
      toast.error(getRouteMessage(to));
    }
  };

  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-primary font-mono">
            FOLHA DE PONTO
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              const enabled = isRouteEnabled(l.to, workflow);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => handleNavClick(e, l.to)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[3.5rem] ${
                    !enabled
                      ? "opacity-35 cursor-not-allowed"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${active && enabled ? "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : ""}`} />
                    {!enabled && (
                      <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className={`text-[10px] leading-tight ${active && enabled ? "font-semibold" : "font-normal"}`}>
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
    <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-tight text-primary font-mono">
            FOLHA DE PONTO
          </span>
          <div className="flex items-center gap-1">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              const enabled = isRouteEnabled(l.to, workflow);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => handleNavClick(e, l.to)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    !enabled
                      ? "opacity-35 cursor-not-allowed"
                      : active
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive gap-1.5">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
