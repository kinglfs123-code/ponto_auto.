import { memo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  PlusCircle,
  ListChecks,
  Truck,
  Hash,
  Settings,
  Sun,
  Moon,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const prefetchers: Record<string, () => Promise<unknown>> = {
  "/financeiro": () => import("@/pages/financeiro/Home"),
  "/financeiro/lancamento": () => import("@/pages/financeiro/LancamentoRapido"),
  "/financeiro/contas": () => import("@/pages/financeiro/Contas"),
  "/financeiro/codigos": () => import("@/pages/financeiro/Codigos"),
  "/financeiro/fornecedores": () => import("@/pages/financeiro/Fornecedores"),
};

const links = [
  { to: "/financeiro", label: "Início", icon: Home, exact: true },
  { to: "/financeiro/lancamento", label: "Lançar", icon: PlusCircle },
  { to: "/financeiro/contas", label: "Contas", icon: ListChecks },
  { to: "/financeiro/codigos", label: "Códigos", icon: Hash },
  { to: "/financeiro/fornecedores", label: "Fornecedores", icon: Truck },
];

function NavBarFinanceiroBase() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div
      className="group fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-20" aria-hidden="true" />

      <nav
        className="liquid-glass pointer-events-auto !rounded-[28px] opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 data-[open=true]:opacity-100 data-[open=true]:translate-y-0"
        data-open={open}
      >
        <div className="flex items-center gap-1 px-2 py-2">
          {links.map((l) => {
            const Icon = l.icon;
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                onMouseEnter={() => prefetchers[l.to]?.().catch(() => {})}
                onFocus={() => prefetchers[l.to]?.().catch(() => {})}
                aria-label={l.label}
                className={`liquid-hover flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl min-w-[3.5rem] ${
                  active ? "liquid-pill-active text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${active ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={`text-[11px] leading-4 ${active ? "font-semibold" : "font-normal opacity-80"}`}>
                  {l.label}
                </span>
              </Link>
            );
          })}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Configurações"
                className={`liquid-hover flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl min-w-[3.5rem] ${
                  open ? "liquid-pill-active text-primary" : "text-muted-foreground"
                }`}
              >
                <Settings className="h-6 w-6" strokeWidth={open ? 2.2 : 1.8} />
                <span className={`text-[11px] leading-4 ${open ? "font-semibold" : "font-normal opacity-80"}`}>
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
                onClick={() => {
                  setOpen(false);
                  navigate("/selecionar-modulo");
                }}
                className="liquid-hover w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5"
              >
                <ArrowLeftRight className="h-5 w-5" />
                <span>Trocar módulo</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="liquid-hover w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5"
              >
                <span className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span>Tema</span>
                </span>
                <span className="text-xs text-muted-foreground">{theme === "dark" ? "Escuro" : "Claro"}</span>
              </button>

              <div className="my-1 h-px bg-border/60" />

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
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

const NavBarFinanceiro = memo(NavBarFinanceiroBase);
export default NavBarFinanceiro;
