import { Receipt, Building2 } from "lucide-react";
import type { NavItem } from "@/components/nav/nav-items";

export const EMPRESAS_MODULO_NAV_ITEMS: NavItem[] = [
  { label: "Cobranças", path: "/empresas-modulo", icon: Receipt, tileColor: "150 60% 50%" },
  { label: "Clientes", path: "/empresas-modulo/clientes", icon: Building2, tileColor: "200 80% 65%" },
];
