import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ClipboardList, FileText, LogOut, Home, Users, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

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

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-primary font-mono">
            FOLHA DE PONTO
          </span>
          <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[3.5rem] ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : ""}`} />
                  <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-normal"}`}>
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

  // Desktop
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
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    active
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive gap-1.5">
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </nav>
  );
}
