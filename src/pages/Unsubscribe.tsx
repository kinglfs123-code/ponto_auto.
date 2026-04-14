import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Verificando...</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-foreground font-semibold">Cancelar inscrição</p>
              <p className="text-sm text-muted-foreground">
                Você não receberá mais e-mails transacionais do Ponto_auto.
              </p>
              <Button onClick={handleConfirm} disabled={processing} className="mt-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar cancelamento
              </Button>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
              <p className="text-foreground font-semibold">Já cancelado</p>
              <p className="text-sm text-muted-foreground">Sua inscrição já foi cancelada anteriormente.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
              <p className="text-foreground font-semibold">Inscrição cancelada</p>
              <p className="text-sm text-muted-foreground">Você não receberá mais e-mails.</p>
            </>
          )}
          {(status === "invalid" || status === "error") && (
            <>
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
              <p className="text-foreground font-semibold">Link inválido</p>
              <p className="text-sm text-muted-foreground">
                Este link de cancelamento é inválido ou já expirou.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
