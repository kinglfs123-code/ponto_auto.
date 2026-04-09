import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, FileText, Plus, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { maskCNPJ } from "@/lib/ponto-rules";
import NavBar from "@/components/NavBar";

interface Empresa {
  id: string;
  cnpj: string;
  nome: string;
  jornada_padrao: string;
}

export default function Dashboard() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [folhasCount, setFolhasCount] = useState(0);
  const [relatoriosCount, setRelatoriosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("empresas").select("*"),
      supabase.from("folhas_ponto").select("id", { count: "exact", head: true }),
      supabase.from("relatorios").select("id", { count: "exact", head: true }),
    ]).then(([emp, fol, rel]) => {
      if (emp.data) setEmpresas(emp.data);
      setFolhasCount(fol.count || 0);
      setRelatoriosCount(rel.count || 0);
      setLoading(false);
    });
  }, []);

  const metrics = [
    { label: "Empresas", value: empresas.length, icon: Building2, color: "text-primary" },
    { label: "Folhas de Ponto", value: folhasCount, icon: ClipboardList, color: "text-primary" },
    { label: "Relatórios", value: relatoriosCount, icon: FileText, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do sistema</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.label}
                className="overflow-hidden animate-fade-in border-border/50 hover:border-primary/20 transition-colors"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
              >
                <CardContent className="pt-5 pb-4 px-4 text-center">
                  {loading ? (
                    <>
                      <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-lg" />
                      <Skeleton className="h-8 w-12 mx-auto mb-1" />
                      <Skeleton className="h-3 w-16 mx-auto" />
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className={`h-5 w-5 ${m.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          {[
            { to: "/empresas", label: "Nova Empresa", icon: Building2 },
            { to: "/funcionarios", label: "Funcionários", icon: Users },
            { to: "/ponto", label: "Importar Ponto", icon: ClipboardList },
            { to: "/relatorios", label: "Relatórios", icon: FileText },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Button key={a.to} variant="outline" asChild className="h-auto py-3 flex-col gap-1.5 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
                <Link to={a.to}>
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs">{a.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Companies list */}
        <Card className="animate-fade-in border-border/50" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Suas Empresas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))
            ) : empresas.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-3">Nenhuma empresa cadastrada</p>
                <Button asChild size="sm">
                  <Link to="/empresas" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Cadastrar Empresa
                  </Link>
                </Button>
              </div>
            ) : (
              empresas.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <div>
                    <p className="font-medium text-sm text-foreground">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">CNPJ: {maskCNPJ(e.cnpj)} · Jornada: {e.jornada_padrao}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground hover:text-primary">
                    <Link to={`/ponto?empresa=${e.id}`}>
                      Importar <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
