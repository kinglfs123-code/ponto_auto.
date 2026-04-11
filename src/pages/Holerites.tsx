import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NavBar from "@/components/NavBar";
import EmpresaSelector from "@/components/EmpresaSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { Upload, Send, CheckCircle2, Clock, FileText, Mail, RefreshCw } from "lucide-react";

interface Funcionario {
  id: string;
  nome_completo: string;
  email: string | null;
  cargo: string | null;
}

interface Holerite {
  id: string;
  funcionario_id: string;
  mes_referencia: string;
  pdf_path: string;
  enviado: boolean;
  enviado_em: string | null;
}

export default function Holerites() {
  const isMobile = useIsMobile();
  const [empresaId, setEmpresaId] = useState("");
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sendingAll, setSendingAll] = useState(false);

  const loadData = useCallback(async () => {
    if (!empresaId || !mesRef) return;
    setLoading(true);
    try {
      const [funcRes, holRes] = await Promise.all([
        supabase.from("funcionarios").select("id, nome_completo, email, cargo").eq("empresa_id", empresaId).order("nome_completo"),
        supabase.from("holerites").select("*").eq("empresa_id", empresaId).eq("mes_referencia", mesRef),
      ]);
      setFuncionarios(funcRes.data || []);
      setHolerites(holRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [empresaId, mesRef]);

  const handleEmpresaChange = (id: string) => {
    setEmpresaId(id);
  };

  // Load data when empresa or month changes
  const handleLoad = () => loadData();

  const getHolerite = (funcId: string) => holerites.find((h) => h.funcionario_id === funcId);

  const handleUpload = async (funcId: string, file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast({ title: "Erro", description: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }
    setUploading((p) => ({ ...p, [funcId]: true }));
    try {
      const path = `${empresaId}/${mesRef}/${funcId}.pdf`;
      const { error: upErr } = await supabase.storage.from("holerites").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const existing = getHolerite(funcId);
      if (existing) {
        await supabase.from("holerites").update({ pdf_path: path, enviado: false, enviado_em: null }).eq("id", existing.id);
      } else {
        await supabase.from("holerites").insert({
          empresa_id: empresaId,
          funcionario_id: funcId,
          mes_referencia: mesRef,
          pdf_path: path,
        });
      }
      toast({ title: "PDF enviado com sucesso" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading((p) => ({ ...p, [funcId]: false }));
    }
  };

  const handleSend = async (funcId: string) => {
    const holerite = getHolerite(funcId);
    if (!holerite) return;
    const func = funcionarios.find((f) => f.id === funcId);
    if (!func?.email) {
      toast({ title: "Erro", description: "Funcionário não possui e-mail cadastrado", variant: "destructive" });
      return;
    }

    setSending((p) => ({ ...p, [funcId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("send-holerite", {
        body: { holerite_id: holerite.id },
      });
      if (error) throw error;
      toast({ title: "Holerite enviado!", description: `E-mail enviado para ${func.email}` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending((p) => ({ ...p, [funcId]: false }));
    }
  };

  const handleSendAll = async () => {
    const toSend = funcionarios.filter((f) => {
      const h = getHolerite(f.id);
      return h && f.email && !h.enviado;
    });
    if (toSend.length === 0) {
      toast({ title: "Nada para enviar", description: "Todos os holerites já foram enviados ou não há PDFs/e-mails." });
      return;
    }
    setSendingAll(true);
    let sent = 0;
    for (const f of toSend) {
      try {
        await handleSend(f.id);
        sent++;
      } catch {}
    }
    setSendingAll(false);
    toast({ title: `${sent} holerite(s) enviado(s)` });
  };

  const totalUploaded = funcionarios.filter((f) => getHolerite(f.id)).length;
  const totalSent = funcionarios.filter((f) => getHolerite(f.id)?.enviado).length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Holerites</h1>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                <EmpresaSelector value={empresaId} onChange={handleEmpresaChange} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Mês de Referência</label>
                <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} />
              </div>
              <Button onClick={handleLoad} disabled={!empresaId || !mesRef || loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Carregar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {funcionarios.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-foreground">{funcionarios.length}</p>
                <p className="text-xs text-muted-foreground">Funcionários</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-primary">{totalUploaded}</p>
                <p className="text-xs text-muted-foreground">PDFs Anexados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-green-500">{totalSent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Send All */}
        {totalUploaded > totalSent && (
          <Button onClick={handleSendAll} disabled={sendingAll} className="w-full gap-2" size="lg">
            <Send className="h-4 w-4" />
            {sendingAll ? "Enviando..." : `Enviar todos (${totalUploaded - totalSent} pendentes)`}
          </Button>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Employee list */}
        {!loading && funcionarios.length > 0 && (
          <div className="space-y-3">
            {funcionarios.map((func) => {
              const hol = getHolerite(func.id);
              const isUploading = uploading[func.id];
              const isSending = sending[func.id];

              return (
                <Card key={func.id} className="transition-all hover:shadow-md">
                  <CardContent className="py-4 px-4">
                    <div className={`flex ${isMobile ? "flex-col gap-3" : "items-center justify-between"}`}>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{func.nome_completo}</span>
                          {func.cargo && (
                            <Badge variant="secondary" className="text-xs">{func.cargo}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{func.email || "Sem e-mail"}</span>
                        </div>
                        {hol && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {hol.enviado ? (
                              <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Enviado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                                <Clock className="h-3 w-3" />
                                PDF anexado — pendente
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={`flex items-center gap-2 ${isMobile ? "justify-end" : ""}`}>
                        {/* Upload button */}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(func.id, file);
                              e.target.value = "";
                            }}
                            disabled={isUploading}
                          />
                          <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none" tabIndex={-1} asChild>
                            <span>
                              {isUploading ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : hol ? (
                                <FileText className="h-3.5 w-3.5" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              {hol ? "Substituir PDF" : "Anexar PDF"}
                            </span>
                          </Button>
                        </label>

                        {/* Send button */}
                        {hol && func.email && (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={isSending || hol.enviado}
                            onClick={() => handleSend(func.id)}
                          >
                            {isSending ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Enviar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && empresaId && funcionarios.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum funcionário cadastrado nesta empresa.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Cadastre funcionários primeiro na aba "Funcionários".</p>
            </CardContent>
          </Card>
        )}

        {!empresaId && (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Selecione uma empresa e mês para gerenciar holerites.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
