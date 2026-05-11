import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Sidebar fixa à esquerda em desktop (md+).
 * Escondida em mobile — lá quem aparece é o MobileDock.
 *
 * Lembre: o conteúdo principal precisa de `md:pl-60` (240px) pra não
 * ficar atrás dela. Isso é feito no layout pai, não aqui.
 */
export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 z-40 w-60 bg-sidebar border-r border-sidebar-border">
      <SidebarHeader />
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.path} item={item} />
        ))}
      </nav>
      <SidebarFooter />
    </aside>
  );
}

function SidebarHeader() {
  return (
    <div className="px-6 pt-7 pb-6 border-b border-sidebar-border">
      <span className="text-eyebrow block">RH · Painel</span>
      <h1 className="font-display italic text-2xl text-sidebar-foreground mt-1 leading-tight">
        Espaço Família
      </h1>
    </div>
  );
}

function SidebarItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        isActive
          ? "text-sidebar-foreground font-medium bg-sidebar-accent"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      {/* Indicador ativo: barra vertical à esquerda */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary transition-opacity",
          isActive ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarFooter() {
  return (
    <div className="px-6 py-4 border-t border-sidebar-border">
      <p className="text-eyebrow">v1.0</p>
    </div>
  );
}
