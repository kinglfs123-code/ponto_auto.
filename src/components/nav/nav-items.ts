import { Users, Clock, Wallet, FileText, type LucideIcon } from "lucide-react";

/**
 * Lista única de navegação — usada pela sidebar (desktop) e pelo dock (mobile).
 *
 * Para adicionar uma seção nova, é só adicionar um objeto aqui.
 * Para mudar label, rota ou cor do tile, edite só este arquivo.
 *
 * tileColor: HSL sem o `hsl()` ao redor, no formato "H S% L%".
 *            Mantenha lightness próximo de 60-70% para harmonizar com os outros.
 */
export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  tileColor: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Colaboradores",
    path: "/funcionarios",
    icon: Users,
    tileColor: "200 80% 65%", // azul calmo
  },
  {
    label: "Ponto",
    path: "/ponto",
    icon: Clock,
    tileColor: "40 85% 65%", // âmbar suave
  },
  {
    label: "Financeiro",
    path: "/financeiro",
    icon: Wallet,
    tileColor: "155 55% 55%", // verde esmeralda
  },
  {
    label: "Documentos",
    path: "/documentos",
    icon: FileText,
    tileColor: "260 55% 72%", // violeta pastel
  },
];
