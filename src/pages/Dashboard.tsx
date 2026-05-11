import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, FileText, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCNPJ } from "@/lib/format";
import { ResponsiveNav } from "@/components/nav/ResponsiveNav";
import AppHeader from "@/components/AppHeader";
import { useWorkflowStatus, isRouteEnabled, getRouteMessage } from "@/hooks/use-workflow-status";
import { toast } from "@/hooks/use-toast";
import type { Empresa } from "@/types";

export default function Dashboard() {
  const workflow = useWorkflowStatus();
  const { data: empresas = [], isLoading: loading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id, cnpj, nome, jornada_padrao");
      return (data ?? []) as Empresa[];
    },
    staleTime: 60_000,
  });

  const quickActions = [
    { to: "/funcionarios", label: "Colaboradores", icon: Users },
    { to: "/ponto", label: "Importar ponto", icon: ClipboardList },
    { to: "/relatorios", label: "Relatórios", icon: FileText },
  ];

  const getNextStep = (): string | null => {
    if (!workflow.temEmpresa) return null;
    if (!workflow.temFuncionario) return "/funcionarios";
    if (!workflow.temFolha) return "/ponto";
    return null;
  };
  const nextStep = getNextStep();

  const handleActionClick = (e: React.MouseEvent, to: string) => {
    if (!isRouteEnabled(to, workflow)) {
      e.preventDefault();
      toast({ title: getRouteMessage(to), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pl-60">
      <ResponsiveNav />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <AppHeader module="rh" showBack={false} />

        {/* Quick actions */}
        <div
          className="grid grid-cols-3 gap-2 animate-fade-in"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          {quickActions.map((a) => {
            const Icon = a.icon;
            const enabled = isRouteEnabled(a.to, workflow);
            const isNext = a.to === nextStep;
            return (
              <Button
                key={a.to}
                variant="outline"
                asChild={enabled}
                disabled={!enabled}
                className={`h-auto py-3 flex-col gap-1.5 transition-all ${
                  !enabled
                    ? "opacity-40 cursor-not-allowed border-border/50"
                    : isNext
                      ? "border-primary/50 bg-primary/5 hover:bg-primary/10 ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                }`}
                onClick={(e: React.MouseEvent) => !enabled && handleActionClick(e, a.to)}
              >
                {enabled ? (
                  <Link to={a.to}>
                    <span className="flex flex-col items-center gap-1.5">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs">{a.label}</span>
                      {isNext && <span className="text-[9px] text-primary font-medium">Próximo passo</span>}
                    </span>
                  </Link>
                ) : (
                  <span className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">{a.label}</span>
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Companies list */}
        <Card className="animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Suas Empresas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            ) : empresas.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhuma empresa cadastrada</p>
              </div>
            ) : (
              empresas.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">CNPJ: {formatCNPJ(e.cnpj)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
