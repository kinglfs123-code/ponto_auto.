import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Calendar, RefreshCw, AlertCircle, CheckCircle2, Link2, LinkIcon } from "lucide-react";
import type { ContratoAnalise, ContratoAlerta, FuncionarioDocumento } from "@/types";

const TIPO_LABEL: Record<string, string> = {
  experiencia_45_45: "Experiência 45 + 45 dias",
  experiencia_90: "Experiência 90 dias",
  prazo_determinado: "Prazo determinado",
  indeterminado: "Prazo indeterminado",
};

const TIPO_ALERTA_LABEL: Record<string, string> = {
  vencimento_contrato: "Vencimento do contrato",
  prorrogacao: "Prorrogação",
  ferias_5_meses: "Férias (5 meses antes)",
};

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const confiancaBadge = (c: number) => {
  if (c >= 80) return { label: "Alta confiança", cls: "bg-green-500/15 text-green-600 border-green-500/30" };
  if (c >= 50) return { label: "Confiança média", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  return { label: "Baixa confiança", cls: "bg-destructive/15 text-destructive border-destructive/30" };
};

interface Props {
  funcionarioId: string;
  contratos: FuncionarioDocumento[];
}

export function AnaliseContrato({ funcionarioId, contratos }: Props) {
  const [analise, setAnalise] = useState<ContratoAnalise | null>(null);
  const [alertas, setAlertas] = useState<ContratoAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleConectado, setGoogleConectado] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  const checkGoogle = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("user_id")
      .eq("user_id", u.user.id)
      .maybeSingle();
    setGoogleConectado(!!data);
  };

  const load = async () => {
    setLoading(true);
    const { data: aData } = await supabase
      .from("contratos_analise")
      .select("*")
      .eq("funcionario_id", funcionarioId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aData) {
      setAnalise(aData as unknown as ContratoAnalise);
      const { data: alData } = await supabase
        .from("contrato_alertas")
        .select("*")
        .eq("contrato_id", aData.id)
        .order("data_lembrete");
      setAlertas((alData as unknown as ContratoAlerta[]) || []);
    } else {
      setAnalise(null);
      setAlertas([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    checkGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioId]);

  // trata retorno do OAuth (?google=ok|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (!g) return;
    if (g === "ok") {
      toast({ title: "Google Agenda conectado", description: "Você já pode sincronizar os alertas." });
      checkGoogle();
    } else {
      const reason = params.get("reason");
      toast({
        title: "Falha ao conectar Google Agenda",
        description: reason || "Tente novamente.",
        variant: "destructive",
      });
    }
    // limpa query
    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleConectarGoogle = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        body: { return_to: window.location.pathname },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("URL não retornada");
      window.location.href = data.url as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao iniciar conexão";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setConnecting(false);
    }
  };

  const ultimoContrato = contratos[0];

  const handleAnalisar = async () => {
    if (!ultimoContrato) {
      toast({ title: "Anexe um contrato primeiro", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-contract", {
        body: { documento_id: ultimoContrato.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Contrato analisado", description: `${data.alertas_count} alerta(s) gerado(s)` });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na análise";
      toast({ title: "Não foi possível analisar", description: msg, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSincronizar = async () => {
    const pendentes = alertas.filter((a) => a.status !== "sincronizado");
    if (pendentes.length === 0) {
      toast({ title: "Nada para sincronizar" });
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-calendar-alerts", {
        body: { alerta_ids: pendentes.map((a) => a.id) },
      });
      if (error) throw error;
      if (data?.needs_connection) {
        setGoogleConectado(false);
        toast({
          title: "Conecte o Google Agenda",
          description: "Clique em Conectar Google Agenda para autorizar e tente sincronizar de novo.",
          variant: "destructive",
        });
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "Alertas sincronizados" });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao sincronizar";
      toast({ title: "Erro na sincronização", description: msg, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!analise) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="py-5 px-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Análise inteligente do contrato</p>
              <p className="text-xs text-muted-foreground">
                {ultimoContrato
                  ? "A IA vai ler o contrato anexado e extrair admissão, vencimento e prorrogação."
                  : "Anexe um contrato para liberar a análise automática."}
              </p>
            </div>
          </div>
          <Button onClick={handleAnalisar} disabled={!ultimoContrato || analyzing} className="gap-1.5">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analisar com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  const conf = confiancaBadge(analise.confianca);

  return (
    <div className="space-y-3">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Análise do contrato
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${conf.cls}`}>
                {conf.label} · {analise.confianca}%
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleAnalisar} disabled={analyzing} className="gap-1.5">
                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Reanalisar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Field label="Admissão" value={formatDate(analise.data_admissao)} />
          <Field label="Tipo" value={analise.tipo_contrato ? TIPO_LABEL[analise.tipo_contrato] || analise.tipo_contrato : "—"} />
          <Field label="Vencimento" value={formatDate(analise.data_vencimento)} />
          <Field label="Prorrogação" value={formatDate(analise.data_prorrogacao)} />
          <Field label="Próximas férias" value={formatDate(analise.data_proximas_ferias)} />
          {analise.observacoes && <Field label="Observações" value={analise.observacoes} className="col-span-2 sm:col-span-3" />}
        </CardContent>
      </Card>

      {alertas.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Alertas programados
              </CardTitle>
              <Button size="sm" onClick={handleSincronizar} disabled={syncing} className="gap-1.5">
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                Sincronizar no Google Agenda
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertas.map((al) => (
              <div key={al.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2 flex-wrap gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{TIPO_ALERTA_LABEL[al.tipo] || al.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    Lembrete em {formatDate(al.data_lembrete)} · evento em {formatDate(al.data_evento)}
                  </p>
                </div>
                {al.status === "sincronizado" ? (
                  <Badge variant="outline" className="text-xs bg-green-500/15 text-green-600 border-green-500/30 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Sincronizado
                  </Badge>
                ) : al.status === "erro" ? (
                  <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30 gap-1">
                    <AlertCircle className="h-3 w-3" /> Erro
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Pendente</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
