import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Wallet, Building2, ChevronDown, ArrowLeftRight, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ModuleKey = "rh" | "financeiro" | "empresas";

const MODULES: Record<ModuleKey, { label: string; to: string; icon: typeof Users }> = {
  rh: { label: "Recursos Humanos", to: "/", icon: Users },
  financeiro: { label: "Financeiro", to: "/financeiro", icon: Wallet },
  empresas: { label: "Empresas", to: "/empresas-modulo", icon: Building2 },
};

interface Props {
  current: ModuleKey;
}

export default function ModuleSwitcher({ current }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const Active = MODULES[current];
  const ActiveIcon = Active.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Trocar módulo"
          className="liquid-glass liquid-hover !rounded-full px-3 h-10 inline-flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <ActiveIcon className="h-4 w-4 text-primary" strokeWidth={2} />
          <span className="truncate max-w-[140px]">{Active.label}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="liquid-glass w-64 p-2 border-0 !rounded-2xl text-foreground"
      >
        <div className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Módulos
        </div>
        {(Object.keys(MODULES) as ModuleKey[]).map((key) => {
          const M = MODULES[key];
          const Icon = M.icon;
          const active = key === current;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setOpen(false);
                if (!active) navigate(M.to);
              }}
              className={`liquid-hover w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5 ${
                active ? "text-primary" : ""
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1 text-left">{M.label}</span>
              {active && <Check className="h-4 w-4" />}
            </button>
          );
        })}

        <div className="my-1 h-px bg-border/60" />

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate("/selecionar-empresa");
          }}
          className="liquid-hover w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foreground/5"
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span>Trocar empresa</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
