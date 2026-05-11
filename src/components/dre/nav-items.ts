import { LayoutDashboard, Table2, BarChart3 } from "lucide-react";
import type { NavItem } from "@/components/nav/nav-items";

export const DRE_NAV_ITEMS: NavItem[] = [
  { label: "Visão geral", path: "/dre", icon: LayoutDashboard, tileColor: "200 80% 65%" },
  { label: "Tabela mensal", path: "/dre/mensal", icon: Table2, tileColor: "260 55% 72%" },
  { label: "Anual", path: "/dre/anual", icon: BarChart3, tileColor: "150 60% 50%" },
];
