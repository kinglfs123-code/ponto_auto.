import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    supabase.from("empresas").select("*").then(({ data }) => {
      if (data) setEmpresas(data);
    });
    supabase.from("folhas_ponto").select("id", { count: "exact", head: true }).then(({ count }) => {
      setFolhasCount(count || 0);
    });
    supabase.from("relatorios").select("id", { count: "exact", head: true }).then(({ count }) => {
      setRelatoriosCount(count || 0);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Painel</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Building2 className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{empresas.length}</p>
              <p className="text-sm text-muted-foreground">Empresas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <ClipboardList className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{folhasCount}</p>
              <p className="text-sm text-muted-foreground">Folhas de Ponto</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{relatoriosCount}</p>
              <p className="text-sm text-muted-foreground">Relatórios</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suas Empresas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {empresas.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">Nenhuma empresa cadastrada</p>
                <Button asChild>
                  <Link to="/empresas" className="gap-2">
                    <Plus className="h-4 w-4" /> Cadastrar Empresa
                  </Link>
                </Button>
              </div>
            ) : (
              empresas.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">CNPJ: {maskCNPJ(e.cnpj)} · Jornada: {e.jornada_padrao}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/ponto?empresa=${e.id}`}>Importar Ponto</Link>
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
