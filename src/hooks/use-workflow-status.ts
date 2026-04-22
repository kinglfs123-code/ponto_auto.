import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkflowStatus {
  temEmpresa: boolean;
  temFuncionario: boolean;
  temFolha: boolean;
  loading: boolean;
}

export function useWorkflowStatus(): WorkflowStatus {
  const { data, isLoading } = useQuery({
    queryKey: ["workflow-status"],
    queryFn: async () => {
      const [emp, func, folha] = await Promise.all([
        supabase.from("empresas").select("id", { count: "exact", head: true }),
        supabase.from("funcionarios").select("id", { count: "exact", head: true }),
        supabase.from("folhas_ponto").select("id", { count: "exact", head: true }),
      ]);
      return {
        temEmpresa: (emp.count ?? 0) > 0,
        temFuncionario: (func.count ?? 0) > 0,
        temFolha: (folha.count ?? 0) > 0,
      };
    },
    staleTime: 30_000,
  });

  return {
    temEmpresa: data?.temEmpresa ?? false,
    temFuncionario: data?.temFuncionario ?? false,
    temFolha: data?.temFolha ?? false,
    loading: isLoading,
  };
}

export type RouteKey = "/" | "/empresas" | "/funcionarios" | "/ponto" | "/holerites" | "/relatorios";

const requirements: Record<RouteKey, (s: WorkflowStatus) => boolean> = {
  "/": () => true,
  "/empresas": () => true,
  "/funcionarios": (s) => s.temEmpresa,
  "/ponto": (s) => s.temFuncionario,
  "/holerites": () => true,
  "/relatorios": () => true,
};

const messages: Record<RouteKey, string> = {
  "/": "",
  "/empresas": "",
  "/funcionarios": "Cadastre uma empresa primeiro",
  "/ponto": "Cadastre um funcionário primeiro",
  "/holerites": "Importe uma folha de ponto primeiro",
  "/relatorios": "Importe uma folha de ponto primeiro",
};

export function isRouteEnabled(route: string, status: WorkflowStatus): boolean {
  const check = requirements[route as RouteKey];
  return check ? check(status) : true;
}

export function getRouteMessage(route: string): string {
  return messages[route as RouteKey] ?? "";
}
