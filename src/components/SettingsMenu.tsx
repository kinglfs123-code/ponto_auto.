import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Sun, Moon, LogOut, Image as ImageIcon, Trash2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** Optional className for positioning (e.g., "absolute top-4 right-4 z-40"). Defaults to no positioning. */
  className?: string;
}

/**
 * Settings button (gear icon) with a popover containing theme toggle, wallpaper and logout.
 * Module switching lives in the central ModuleSwitcher (see AppHeader).
 */
export default function SettingsMenu({ className = "" }: Props) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { wallpaper, setWallpaperFromFile, clearWallpaper } = useWallpaper();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await setWallpaperFromFile(file);
      toast({ title: "Wallpaper atualizado" });
      setOpen(false);
    } catch (err) {
      toast({
        title: "Erro ao salvar wallpaper",
        description: err instanceof Error ? err.message : "Tente uma imagem menor.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
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

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="liquid-hover w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5"
          >
            <span className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5" />
              <span>Wallpaper</span>
            </span>
            <span className="text-xs text-muted-foreground">{wallpaper ? "Alterar" : "Escolher"}</span>
          </button>

          {wallpaper && (
            <button
              type="button"
              onClick={() => {
                clearWallpaper();
                toast({ title: "Wallpaper removido" });
              }}
              className="liquid-hover w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5"
            >
              <Trash2 className="h-5 w-5" />
              <span>Remover wallpaper</span>
            </button>
          )}

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
