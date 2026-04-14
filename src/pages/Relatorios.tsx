import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import EmpresaSelector from "@/components/EmpresaSelector";
import { useEmpresa } from "@/contexts/EmpresaContext";
import type { Folha, Relatorio } from "@/types";
import { FileText, Download, ClipboardList, Trash2 } from "lucide-react";

export default function Relatorios() {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id || "";
  const [folhas, setFolhas] = useState<Folha[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("folhas_ponto").select("*").eq("empresa_id", empresaId).order("mes_referencia", { ascending: false }).then(({ data }) => {
      if (data) setFolhas(data);
    });
    loadRelatorios();
  }, [empresaId]);

  const loadRelatorios = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("relatorios").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
    if (data) setRelatorios(data);
  };

  const gerarRelatorio = async (mesRef: string) => {
    if (!empresaId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { empresa_id: empresaId, mes_referencia: mesRef },
      });
      if (error) throw error;
      toast({ title: "Relatório gerado!" });
      await loadRelatorios();
    } catch (err: unknown) {
      toast({
        title: "Erro ao gerar",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("relatorios").createSignedUrl(path, 300);
    if (error) {
      toast({ title: "Erro ao baixar", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const deleteRelatorio = async (r: Relatorio) => {
    if (!confirm("Excluir este relatório?")) return;
    try {
      await supabase.storage.from("relatorios").remove([r.pdf_path]);
      await supabase.from("relatorios").delete().eq("id", r.id);
      toast({ title: "Relatório excluído" });
      await loadRelatorios();
    } catch (err: unknown) {
      toast({ title: "Erro ao excluir", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    }
  };

  const meses = [...new Set(folhas.map((f) => f.mes_referencia))].sort().reverse();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight animate-fade-in">Relatórios</h1>

        <div className="flex gap-3 items-center animate-fade-in">
          <EmpresaSelector />
        </div>

        {empresaId && (
          <>
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Folhas de Ponto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {folhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma folha para esta empresa.</p>
                ) : (
                  meses.map((mes) => {
                    const mesfolhas = folhas.filter((f) => f.mes_referencia === mes);
                    return (
                      <div key={mes} className="p-3 rounded-xl bg-muted/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{mes}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => gerarRelatorio(mes)}
                            disabled={generating}
                            className="gap-1"
                          >
                            <FileText className="h-3 w-3" /> {generating ? "..." : "Gerar PDF"}
                          </Button>
                        </div>
                        {mesfolhas.map((f) => (
                          <Link
                            key={f.id}
                            to={`/ponto/${f.id}`}
                            className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {f.funcionario} ·{" "}
                            <span className={f.status === "finalizada" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}>
                              {f.status}
                            </span>
                          </Link>
                        ))}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Relatórios Gerados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {relatorios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda.</p>
                ) : (
                  relatorios.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{r.mes_referencia}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => download(r.pdf_path)} className="gap-1">
                          <Download className="h-3 w-3" /> Download
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRelatorio(r)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
