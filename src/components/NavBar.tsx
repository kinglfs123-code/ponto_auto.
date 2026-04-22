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
        <header className="sticky top-0 z-40 glass border-b px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-primary">
            FOLHA DE PONTO
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground rounded-full">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t safe-area-bottom">
          <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              const enabled = isRouteEnabled(l.to, workflow);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => handleNavClick(e, l.to)}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all min-w-[3.5rem] ${
                    !enabled
                      ? "opacity-30 cursor-not-allowed"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5.5 w-5.5 ${active && enabled ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`} strokeWidth={active && enabled ? 2.2 : 1.8} />
                    {!enabled && (
                      <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className={`text-[10px] leading-tight ${active && enabled ? "font-semibold" : "font-normal opacity-80"}`}>
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
    <nav className="sticky top-0 z-40 glass border-b px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-tight text-primary">
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    !enabled
                      ? "opacity-30 cursor-not-allowed"
                      : active
                        ? "bg-primary/12 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive gap-1.5 rounded-xl">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
