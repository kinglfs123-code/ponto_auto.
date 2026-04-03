import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/ponto-rules";
import NavBar from "@/components/NavBar";
import { CheckCircle2, ArrowLeft } from "lucide-react";

interface Folha {
  id: string;
  funcionario: string;
  mes_referencia: string;
  status: string;
  empresa_id: string;
  empresas: { nome: string; cnpj: string } | null;
}

interface Registro {
  id: string;
  dia: number;
  hora_entrada: string | null;
  hora_saida: string | null;
  hora_entrada_tarde: string | null;
  hora_saida_tarde: string | null;
  hora_entrada_extra: string | null;
  hora_saida_extra: string | null;
  horas_normais: number;
  horas_extras: number;
  horas_noturnas: number;
  tipo_excecao: string | null;
  obs: string | null;
}

export default function FolhaDetalhe() {
  const { folhaId } = useParams();
  const navigate = useNavigate();
  const [folha, setFolha] = useState<Folha | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    if (!folhaId) return;
    supabase
      .from("folhas_ponto")
      .select("*, empresas(nome, cnpj)")
      .eq("id", folhaId)
      .single()
      .then(({ data }) => {
        if (data) setFolha(data as unknown as Folha);
      });
    supabase
      .from("registros_ponto")
      .select("*")
      .eq("folha_id", folhaId)
      .order("dia")
      .then(({ data }) => {
        if (data) setRegistros(data);
      });
  }, [folhaId]);

  const finalizar = async () => {
    if (!folhaId) return;
    const { error } = await supabase.from("folhas_ponto").update({ status: "finalizada" } as any).eq("id", folhaId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Folha finalizada!" });
      setFolha((f) => f ? { ...f, status: "finalizada" } : f);
    }
  };

  if (!folha) return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <p className="text-center text-muted-foreground mt-10">Carregando...</p>
    </div>
  );

  const totNormais = registros.reduce((s, r) => s + (r.horas_normais || 0), 0);
  const totExtras = registros.reduce((s, r) => s + (r.horas_extras || 0), 0);
  const totNoturnas = registros.reduce((s, r) => s + (r.horas_noturnas || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{folha.funcionario}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {folha.empresas?.nome} · {folha.mes_referencia} ·{" "}
                <span className={folha.status === "finalizada" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}>
                  {folha.status}
                </span>
              </p>
            </div>
            {folha.status === "rascunho" && (
              <Button onClick={finalizar} size="sm" className="gap-1">
                <CheckCircle2 className="h-4 w-4" /> Finalizar
              </Button>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="py-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Normais</p>
            <p className="text-lg font-bold text-primary">{formatHours(totNormais)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Extras</p>
            <p className="text-lg font-bold text-[hsl(var(--success))]">{formatHours(totExtras)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Noturnas</p>
            <p className="text-lg font-bold text-[hsl(var(--warning))]">{formatHours(totNoturnas)}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    {["Dia", "Ent M", "Saí M", "Ent T", "Saí T", "Ent E", "Saí E", "Normal", "Extra", "Not.", "Exceção", "Obs"].map((h) => (
                      <th key={h} className="px-2 py-2 text-center font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-2 py-1.5 text-center font-semibold text-primary">{r.dia}</td>
                      <td className="px-2 py-1 text-center">{r.hora_entrada || "—"}</td>
                      <td className="px-2 py-1 text-center">{r.hora_saida || "—"}</td>
                      <td className="px-2 py-1 text-center">{r.hora_entrada_tarde || "—"}</td>
                      <td className="px-2 py-1 text-center">{r.hora_saida_tarde || "—"}</td>
                      <td className="px-2 py-1 text-center">{r.hora_entrada_extra || "—"}</td>
                      <td className="px-2 py-1 text-center">{r.hora_saida_extra || "—"}</td>
                      <td className="px-2 py-1 text-center">{formatHours(r.horas_normais)}</td>
                      <td className="px-2 py-1 text-center text-[hsl(var(--success))]">
                        {r.horas_extras > 0 ? formatHours(r.horas_extras) : "—"}
                      </td>
                      <td className="px-2 py-1 text-center text-[hsl(var(--warning))]">
                        {r.horas_noturnas > 0 ? formatHours(r.horas_noturnas) : "—"}
                      </td>
                      <td className="px-2 py-1 text-center text-[10px]">{r.tipo_excecao || "—"}</td>
                      <td className="px-2 py-1 text-center text-[10px] text-muted-foreground">{r.obs || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
