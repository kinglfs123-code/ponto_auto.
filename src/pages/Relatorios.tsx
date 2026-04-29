import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { friendlyError } from "@/lib/error-messages";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/ui/back-button";
import EmpresaSelector from "@/components/EmpresaSelector";
import { formatDateBR } from "@/lib/format";
import { useEmpresa } from "@/contexts/EmpresaContext";
import type { Folha, Relatorio } from "@/types";
import { FileText, Download, ClipboardList, Trash2 } from "lucide-react";

export default function Relatorios() {
  const { empresa } = useEmpresa();
  const confirm = useConfirm();
  const empresaId = empresa?.id || "";
  const [folhas, setFolhas] = useState<Folha[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [generatingMes, setGeneratingMes] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) { setFolhas([]); setRelatorios([]); return; }
    setLoading(true);
    Promise.all([
      supabase
        .from("folhas_ponto")
        .select("id, funcionario, mes_referencia, status, empresa_id")
        .eq("empresa_id", empresaId)
        .order("mes_referencia", { ascending: false })
        .limit(500),
      supabase
        .from("relatorios")
        .select("id, empresa_id, mes_referencia, pdf_path, created_at")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([fRes, rRes]) => {
      if (fRes.data) setFolhas(fRes.data);
      if (rRes.data) setRelatorios(rRes.data);
      if (fRes.error) toast({ title: "Erro ao carregar folhas", description: friendlyError(fRes.error), variant: "destructive" });
      if (rRes.error) toast({ title: "Erro ao carregar relatórios", description: friendlyError(rRes.error), variant: "destructive" });
      setLoading(false);
    });
  }, [empresaId]);

  const loadRelatorios = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("relatorios")
      .select("id, empresa_id, mes_referencia, pdf_path, created_at")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setRelatorios(data);
  };

  const gerarRelatorio = async (mesRef: string) => {
    if (!empresaId) return;
    setGeneratingMes(mesRef);
    try {
      const { error } = await supabase.functions.invoke("generate-report", {
        body: { empresa_id: empresaId, mes_referencia: mesRef },
      });
      if (error) throw error;
      toast({ title: "Relatório gerado!", description: `Relatório de ${mesRef} disponível para download.` });
      await loadRelatorios();
    } catch (err) {
      toast({ title: "Erro ao gerar", description: friendlyError(err), variant: "destructive" });
    } finally {
      setGeneratingMes(null);
    }
  };

  const download = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from("relatorios").createSignedUrl(path, 300);
      if (error) throw error;
      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      toast({ title: "Erro ao baixar", description: friendlyError(err), variant: "destructive" });
    }
  };

  const handleDeleteFolha = async (folha: Folha) => {
    const ok = await confirm({
      title: "Excluir folha de ponto",
      description: `Tem certeza que deseja excluir a folha de ${folha.funcionario} (${folha.mes_referencia})? Todos os registros do mês serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir folha",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(folha.id);
    try {
      const { error: regErr } = await supabase.from("registros_ponto").delete().eq("folha_id", folha.id);
      if (regErr) throw regErr;
      const { error: folhaErr } = await supabase.from("folhas_ponto").delete().eq("id", folha.id);
      if (folhaErr) throw folhaErr;
      toast({ title: "Folha excluída" });
      setFolhas((prev) => prev.filter((f) => f.id !== folha.id));
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteMes = async (mes: string) => {
    const mesfolhas = folhas.filter((f) => f.mes_referencia === mes);
    if (mesfolhas.length === 0) return;
    const ok = await confirm({
      title: `Excluir ${mesfolhas.length} folha(s) de ${mes}`,
      description: `Tem certeza que deseja excluir todas as ${mesfolhas.length} folha(s) de ${mes}? Todos os registros serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir tudo",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(`mes-${mes}`);
    try {
      const ids = mesfolhas.map((f) => f.id);
      const { error: regErr } = await supabase.from("registros_ponto").delete().in("folha_id", ids);
      if (regErr) throw regErr;
      const { error: folhaErr } = await supabase.from("folhas_ponto").delete().in("id", ids);
      if (folhaErr) throw folhaErr;
      toast({ title: `Folhas de ${mes} excluídas` });
      setFolhas((prev) => prev.filter((f) => f.mes_referencia !== mes));
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteRelatorio = async (r: Relatorio) => {
    const ok = await confirm({
      title: "Excluir relatório",
      description: `Tem certeza que deseja excluir o relatório de ${r.mes_referencia}? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir relatório",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(`rel-${r.id}`);
    try {
      await supabase.storage.from("relatorios").remove([r.pdf_path]);
      const { error } = await supabase.from("relatorios").delete().eq("id", r.id);
      if (error) throw error;
      toast({ title: "Relatório excluído" });
      await loadRelatorios();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const meses = [...new Set(folhas.map((f) => f.mes_referencia))].sort().reverse();

  return (
    <div className="min-h-screen bg-background pb-44">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <BackButton fallback="/" />
        <h1 className="text-2xl font-bold text-foreground tracking-tight animate-fade-in">Relatórios</h1>

        <div className="flex gap-3 items-center animate-fade-in">
          <EmpresaSelector />
        </div>

        {empresaId && (
          <>
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Folhas de ponto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                  </div>
                ) : folhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma folha para esta empresa.</p>
                ) : (
                  meses.map((mes) => {
                    const mesfolhas = folhas.filter((f) => f.mes_referencia === mes);
                    return (
                      <div key={mes} className="p-3 rounded-xl bg-muted/30 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{mes}</span>
                          <div className="flex items-center gap-1.5">
                            <SpinnerButton
                              size="sm"
                              variant="outline"
                              onClick={() => gerarRelatorio(mes)}
                              loading={generatingMes === mes}
                              loadingText="Gerando…"
                              className="gap-1 min-h-[44px] sm:min-h-0"
                            >
                              <FileText className="h-3 w-3" /> Gerar PDF
                            </SpinnerButton>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteMes(mes)}
                              disabled={deletingId === `mes-${mes}`}
                              className="h-11 w-11 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                              aria-label={`Excluir todas as folhas de ${mes}`}
                              title={`Excluir todas as folhas de ${mes}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {mesfolhas.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between gap-2 px-1"
                          >
                            <Link
                              to={`/ponto/${f.id}`}
                              className="block text-xs text-muted-foreground hover:text-foreground transition-colors flex-1 min-w-0 truncate"
                            >
                              {f.funcionario} ·{" "}
                              <span className={f.status === "finalizada" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}>
                                {f.status}
                              </span>
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteFolha(f);
                              }}
                              disabled={deletingId === f.id}
                              className="h-9 w-9 sm:h-7 sm:w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Excluir folha de ${f.funcionario}`}
                              title="Excluir folha"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </Button>
                          </div>
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
                  <FileText className="h-4 w-4" /> Relatórios gerados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                  </div>
                ) : relatorios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda.</p>
                ) : (
                  relatorios.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">{r.mes_referencia}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateBR(r.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => download(r.pdf_path)} className="gap-1 min-h-[44px] sm:min-h-0">
                          <Download className="h-3 w-3" /> Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRelatorio(r)}
                          disabled={deletingId === `rel-${r.id}`}
                          className="h-11 w-11 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Excluir relatório de ${r.mes_referencia}`}
                        >
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
