import { LayoutDashboard, Table2 } from "lucide-react";
import type { NavItem } from "@/components/nav/nav-items";

export const CMV_NAV_ITEMS: NavItem[] = [
  { label: "Visão geral", path: "/cmv", icon: LayoutDashboard, tileColor: "200 80% 65%" },
  { label: "Tabela mensal", path: "/cmv/tabela", icon: Table2, tileColor: "260 55% 72%" },
];
