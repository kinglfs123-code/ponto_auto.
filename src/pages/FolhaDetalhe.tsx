import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { formatHours } from "@/lib/ponto-rules";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/ui/back-button";
import { CheckCircle2 } from "lucide-react";

interface Folha {
  id: string;
  funcionario: string;
  funcionario_id: string | null;
  mes_referencia: string;
  status: string;
  empresa_id: string;
  empresas: { nome: string; cnpj: string } | null;
}

interface FuncionarioInfo {
  cargo: string | null;
  horario_entrada: string;
  horario_saida: string;
  intervalo: string;
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

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function FolhaDetalhe() {
  const { folhaId } = useParams();
  const navigate = useNavigate();
  const [folha, setFolha] = useState<Folha | null>(null);
  const [funcInfo, setFuncInfo] = useState<FuncionarioInfo | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    if (!folhaId) return;
    supabase
      .from("folhas_ponto")
      .select("id, funcionario, mes_referencia, status, empresa_id, funcionario_id, empresas(nome, cnpj)")
      .eq("id", folhaId)
      .single()
      .then(({ data }) => {
        if (data) {
          const f = data as unknown as Folha;
          setFolha(f);
          if (f.funcionario_id) {
            supabase
              .from("funcionarios")
              .select("cargo, horario_entrada, horario_saida, intervalo")
              .eq("id", f.funcionario_id)
              .maybeSingle()
              .then(({ data: fd }) => {
                if (fd) setFuncInfo(fd as FuncionarioInfo);
              });
          }
        }
      });
    supabase
      .from("registros_ponto")
      .select("id, dia, hora_entrada, hora_saida_tarde, hora_entrada_tarde, hora_saida, hora_entrada_extra, hora_saida_extra, horas_normais, horas_extras, horas_noturnas, atraso_minutos, obs, corrigido_manualmente, tipo_excecao")
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
      toast({ title: "Folha finalizada com sucesso" });
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

  const [ano, mes] = folha.mes_referencia.split("-");
  const mesNome = MESES_PT[parseInt(mes, 10) - 1] || mes;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <BackButton fallback="/ponto" />

        {/* Cabeçalho da folha */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">Folha de Ponto Mensal</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {mesNome} de {ano} ·{" "}
                  <span className={folha.status === "finalizada" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}>
                    {folha.status === "finalizada" ? "Finalizada" : "Rascunho"}
                  </span>
                </p>
              </div>
              {folha.status === "rascunho" && (
                <Button onClick={finalizar} size="sm" className="gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Finalizar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm pt-2 border-t border-border">
              <Info label="Empresa" value={folha.empresas?.nome || "—"} />
              <Info label="Colaborador" value={folha.funcionario} />
              <Info label="Cargo" value={funcInfo?.cargo || "—"} />
              <Info label="Intervalo" value={funcInfo?.intervalo || "—"} />
              <Info label="Horário de entrada" value={funcInfo?.horario_entrada || "—"} />
              <Info label="Horário de saída" value={funcInfo?.horario_saida || "—"} />
              <Info label="Mês" value={mesNome} />
              <Info label="Ano" value={ano} />
            </div>
          </CardContent>
        </Card>

        {/* Totais */}
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

        {/* Tabela estilo planilha */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full md:table-fixed text-sm border-collapse min-w-[560px]">
                <colgroup>
                  <col className="md:w-[8%]" />
                  <col className="md:w-[23%]" />
                  <col className="md:w-[23%]" />
                  <col className="md:w-[23%]" />
                  <col className="md:w-[23%]" />
                </colgroup>
                <thead className="sticky top-0 bg-card">
                  <tr>
                    {["Dia", "Entrada", "Saída p/ intervalo", "Volta do intervalo", "Saída"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-center font-semibold text-foreground border border-foreground/80"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="dark:hover:bg-muted/10 hover:bg-muted/30">
                      <td className="px-3 py-2 text-center font-semibold text-foreground border border-foreground/80">
                        {String(r.dia).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground border border-foreground/80">
                        {r.hora_entrada || "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground border border-foreground/80">
                        {r.hora_saida || "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground border border-foreground/80">
                        {r.hora_entrada_tarde || "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground border border-foreground/80">
                        {r.hora_saida_tarde || "—"}
                      </td>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground font-medium truncate">{value}</p>
    </div>
  );
}
