import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  ClipboardList,
  FileText,
  LogOut,
  Home,
  Users,
  Receipt,
  Sun,
  Moon,
  Lock,
  Settings,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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

          {/* Configurações */}
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Configurações"
                className={`liquid-hover flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl min-w-[3.5rem] ${
                  settingsOpen ? "liquid-pill-active text-primary" : "text-muted-foreground"
                }`}
              >
                <Settings
                  className={`h-6 w-6 ${settingsOpen ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`}
                  strokeWidth={settingsOpen ? 2.2 : 1.8}
                />
                <span className={`text-[11px] leading-4 ${settingsOpen ? "font-semibold" : "font-normal opacity-80"}`}>
                  Configurações
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={12}
              className="liquid-glass w-60 p-2 border-0 !rounded-2xl text-foreground"
            >
              <div className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Configurações
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="liquid-hover w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5"
              >
                <span className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span>Tema</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {theme === "dark" ? "Escuro" : "Claro"}
                </span>
              </button>

              <div className="my-1 h-px bg-border/60" />

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  logout();
                }}
                className="liquid-hover w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </nav>
    </div>
  );
}
