import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Dock estilo iOS no rodapé em mobile (<md).
 * Escondido em desktop — lá quem aparece é a DesktopSidebar.
 *
 * Mantém a identidade liquid-glass + tiles coloridos do app,
 * mas agora com labels visíveis embaixo de cada ícone.
 */
export function MobileDock() {
  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="liquid-glass mx-auto max-w-md flex items-stretch justify-between p-2">
        {NAV_ITEMS.map((item) => (
          <DockItem key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
}

function DockItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex-1 flex flex-col items-center gap-1 px-1 py-1 rounded-xl liquid-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <span
        className={cn("dock-tile", isActive && "dock-tile-active")}
        style={{ ["--tile-color" as string]: item.tileColor } as React.CSSProperties}
      >
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "text-[10px] font-medium tracking-wide transition-colors leading-none mt-0.5",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
