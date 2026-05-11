import { PlusCircle, ListChecks, Truck, Hash } from "lucide-react";
import type { NavItem } from "@/components/nav/nav-items";

export const FINANCEIRO_NAV_ITEMS: NavItem[] = [
  { label: "Lançar", path: "/financeiro/lancamento", icon: PlusCircle, tileColor: "150 60% 50%" },
  { label: "Contas", path: "/financeiro/contas", icon: ListChecks, tileColor: "200 80% 65%" },
  { label: "Códigos", path: "/financeiro/codigos", icon: Hash, tileColor: "40 85% 65%" },
  { label: "Fornecedores", path: "/financeiro/fornecedores", icon: Truck, tileColor: "260 55% 72%" },
];
