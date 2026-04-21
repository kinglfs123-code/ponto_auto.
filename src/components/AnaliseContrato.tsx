import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Calendar, AlertCircle, CheckCircle2, Link2, LinkIcon } from "lucide-react";
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

  // refs para garantir disparo único por contexto
  const autoAnalyzedRef = useRef<string | null>(null);
  const autoSyncedRef = useRef<string | null>(null);

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
      toast({ title: "Google Agenda conectado", description: "Sincronizando alertas automaticamente…" });
      checkGoogle();
    } else {
      const reason = params.get("reason");
      toast({
        title: "Falha ao conectar Google Agenda",
        description: reason || "Tente novamente.",
        variant: "destructive",
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleConectarGoogle = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        body: { return_to: window.location.pathname, origin: window.location.origin },
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
    if (!ultimoContrato) return;
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
    if (pendentes.length === 0) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-calendar-alerts", {
        body: { alerta_ids: pendentes.map((a) => a.id) },
      });
      if (error) throw error;
      if (data?.needs_connection) {
        setGoogleConectado(false);
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "Alertas sincronizados no Google Agenda" });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao sincronizar";
      toast({ title: "Erro na sincronização", description: msg, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Auto-análise quando há contrato anexado mas sem análise ainda
  useEffect(() => {
    if (loading) return;
    if (!ultimoContrato) return;
    if (analise) return;
    if (analyzing) return;
    if (autoAnalyzedRef.current === ultimoContrato.id) return;
    autoAnalyzedRef.current = ultimoContrato.id;
    handleAnalisar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, ultimoContrato?.id, analise, analyzing]);

  // Auto-sync quando há alertas pendentes e Google conectado
  useEffect(() => {
    if (loading) return;
    if (googleConectado !== true) return;
    if (syncing) return;
    const pendentes = alertas.filter((a) => a.status !== "sincronizado");
    if (pendentes.length === 0) return;
    const key = pendentes.map((a) => a.id).sort().join(",");
    if (autoSyncedRef.current === key) return;
    autoSyncedRef.current = key;
    handleSincronizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, googleConectado, alertas, syncing]);

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
    if (analyzing) {
      return (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-5 px-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando contrato com IA…</p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const pendentes = alertas.filter((a) => a.status !== "sincronizado");

  return (
    <div className="space-y-3">
      <Card className="border-border/50">
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-5">
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
          <CardHeader className="pb-2 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Alertas programados
                {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </CardTitle>
              {googleConectado === false && pendentes.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleConectarGoogle} disabled={connecting} className="gap-1.5">
                  {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
                  Conectar Google Agenda
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {googleConectado ? (
                <Badge variant="outline" className="gap-1 bg-green-500/15 text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3" /> Google Agenda conectado
                </Badge>
              ) : googleConectado === false ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Link2 className="h-3 w-3" /> Não conectado
                </Badge>
              ) : null}
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
                  <Badge variant="outline" className="text-xs gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Sincronizando
                  </Badge>
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
