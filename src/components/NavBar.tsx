import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ClipboardList, FileText, LogOut, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Início", icon: Home },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/funcionarios", label: "Funcionários", icon: Users },
  { to: "/ponto", label: "Ponto", icon: ClipboardList },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-card border-b border-border px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive gap-1.5">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </nav>
  );
}
