import { DesktopSidebar } from "./DesktopSidebar";
import { MobileDock } from "./MobileDock";
import type { NavItem } from "./nav-items";

interface Props {
  items?: NavItem[];
  title?: string;
}

/**
 * Navegação responsiva única.
 *
 * Em desktop (md+): renderiza apenas a sidebar fixa à esquerda.
 * Em mobile (<md): renderiza apenas o dock no rodapé.
 *
 * Use <ResponsiveNav /> no layout. Lembre de adicionar `md:pl-60` no
 * container do conteúdo principal pra abrir espaço pra sidebar.
 */
export function ResponsiveNav({ items, title }: Props = {}) {
  return (
    <>
      <DesktopSidebar items={items} title={title} />
      <MobileDock items={items} />
    </>
  );
}
