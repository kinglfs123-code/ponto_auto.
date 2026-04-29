import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Sun, Moon, LogOut, ArrowLeftRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  /** Show the "Trocar módulo" entry. Defaults to true. */
  showTrocarModulo?: boolean;
  /** Optional className for positioning (e.g., "absolute top-4 right-4"). */
  className?: string;
}

/**
 * Floating settings button (gear icon) with a popover containing:
 *  - Theme toggle
 *  - Trocar módulo (optional)
 *  - Sair
 *
 * Designed to live in the top-right corner of entry screens (SelecionarEmpresa, etc).
 */
export default function SettingsMenu({ showTrocarModulo = true, className = "absolute top-4 right-4 z-40" }: Props) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { empresa } = useEmpresa();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Configurações"
            className={`liquid-glass liquid-hover !rounded-full h-10 w-10 flex items-center justify-center ${
              open ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-5 w-5" strokeWidth={open ? 2.2 : 1.8} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="liquid-glass w-60 p-2 border-0 !rounded-2xl text-foreground"
        >
          <div className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Configurações
          </div>

          {showTrocarModulo && empresa && (
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
          )}

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
  );
}
