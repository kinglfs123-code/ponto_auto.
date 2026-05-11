import { DesktopSidebar } from "./DesktopSidebar";
import { MobileDock } from "./MobileDock";

/**
 * Navegação responsiva única.
 *
 * Em desktop (md+): renderiza apenas a sidebar fixa à esquerda.
 * Em mobile (<md): renderiza apenas o dock no rodapé.
 *
 * Use <ResponsiveNav /> no layout raiz. Lembre de adicionar `md:pl-60` no
 * container do conteúdo principal pra abrir espaço pra sidebar.
 */
export function ResponsiveNav() {
  return (
    <>
      <DesktopSidebar />
      <MobileDock />
    </>
  );
}
