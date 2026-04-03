import { useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NavBar from "@/components/NavBar";
import EmpresaSelector from "@/components/EmpresaSelector";
import FileImporter, { type ImportedRecord } from "@/components/FileImporter";
import {
  parseTimeToHours,
  formatHours,
  maskHM,
  applyToleranceAndDetect,
  calcularResumo,
  type RegistroPonto,
  type ResumoCalculo,
} from "@/lib/ponto-rules";
import { Camera, Save, Calculator } from "lucide-react";

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/read-timesheet`;

async function callAI(body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(FUNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(data.error || `Erro ${resp.status}`);
  return data.text;
}

function compress(dataUrl: string, maxW = 600): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error("Imagem inválida"));
    img.onload = () => {
      const sc = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.5));
    };
    img.src = dataUrl;
  });
}

interface EmpresaSel {
  id: string;
  cnpj: string;
  nome: string;
  jornada_padrao: string;
}

export default function Ponto() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<EmpresaSel | null>(null);
  const [funcionario, setFuncionario] = useState("");
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [resumo, setResumo] = useState<ResumoCalculo | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const jornada = empresa?.jornada_padrao || "07:20";

  // Process imported file records
  const handleFileImport = (records: ImportedRecord[]) => {
    if (!empresa) {
      toast({ title: "Selecione uma empresa primeiro", variant: "destructive" });
      return;
    }
    if (records.length > 0 && !funcionario) {
      setFuncionario(records[0].funcionario);
    }

    const processed = records.map((r) =>
      applyToleranceAndDetect(
        {
          dia: r.data,
          hora_entrada: r.hora_entrada || null,
          hora_saida: r.hora_saida || null,
        },
        jornada
      )
    );
    setRegistros(processed);
    setResumo(calcularResumo(processed));
    setEditMode(true);
  };

  // OCR from photo
  const onPhoto = useCallback((f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => setImage(e.target?.result as string);
    r.readAsDataURL(f);
  }, []);

  const runOCR = async () => {
    if (!image || !empresa) return;
    setLoading(true);
    try {
      setStep("Comprimindo...");
      const img = await compress(image, 600);
      const b64 = img.split(",")[1];
      setStep("Enviando para IA...");
      const text = await callAI({ image: b64 });
      setStep("Processando...");
      const clean = text.replace(/```json|```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA não retornou JSON");
      const p = JSON.parse(m[0]);
      if (p.error) throw new Error(p.error);
      if (p.nome) setFuncionario(p.nome);
      if (p.mes) setMesRef(p.mes);

      if (p.registros?.length > 0) {
        const processed = p.registros.map((r: Record<string, string | null>) =>
          applyToleranceAndDetect(
            {
              dia: r.dia as unknown as number,
              hora_entrada: r.me || null,
              hora_saida: r.ms || null,
              hora_entrada_tarde: r.te || null,
              hora_saida_tarde: r.ts || null,
              hora_entrada_extra: r.ee || null,
              hora_saida_extra: r.es || null,
              obs: r.obs || null,
            },
            jornada
          )
        );
        setRegistros(processed);
        setResumo(calcularResumo(processed));
        setEditMode(true);
      }
    } catch (err: unknown) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao processar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  const recalc = () => {
    const processed = registros.map((r) => applyToleranceAndDetect(r, jornada));
    setRegistros(processed);
    setResumo(calcularResumo(processed));
  };

  const updateReg = (i: number, field: string, value: string) => {
    const u = [...registros];
    u[i] = { ...u[i], [field]: value || null, corrigido_manualmente: true };
    setRegistros(u);
  };

  const salvar = async () => {
    if (!empresa || !funcionario.trim() || registros.length === 0) {
      toast({ title: "Preencha empresa, funcionário e tenha registros", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Create folha
      const { data: folha, error: fErr } = await supabase
        .from("folhas_ponto")
        .insert({
          empresa_id: empresa.id,
          funcionario: funcionario.trim(),
          mes_referencia: mesRef,
          status: "rascunho" as const,
        })
        .select("id")
        .single();
      if (fErr || !folha) throw fErr || new Error("Erro ao criar folha");

      // Insert registros
      const regs = registros.map((r) => ({
        folha_id: folha.id,
        dia: typeof r.dia === "number" ? r.dia : parseInt(String(r.dia)) || 0,
        hora_entrada: r.hora_entrada,
        hora_saida: r.hora_saida,
        hora_entrada_tarde: r.hora_entrada_tarde,
        hora_saida_tarde: r.hora_saida_tarde,
        hora_entrada_extra: r.hora_entrada_extra,
        hora_saida_extra: r.hora_saida_extra,
        horas_normais: r.horas_normais,
        horas_extras: r.horas_extras,
        horas_noturnas: r.horas_noturnas,
        tipo_excecao: r.tipo_excecao,
        corrigido_manualmente: r.corrigido_manualmente,
        obs: r.obs,
      }));

      const { error: rErr } = await supabase.from("registros_ponto").insert(regs);
      if (rErr) throw rErr;

      toast({ title: "Folha de ponto salva!" });
      navigate(`/ponto/${folha.id}`);
    } catch (err: unknown) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const excecaoColor = (t: string | null) => {
    if (t === "atraso") return "text-destructive";
    if (t === "saida_antecipada") return "text-[hsl(var(--warning))]";
    if (t === "falta") return "text-destructive font-bold";
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-primary">Importar Ponto</h1>

        {/* Company selector + info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
                <EmpresaSelector
                  value={empresa?.id || searchParams.get("empresa")}
                  onChange={(e) => setEmpresa(e)}
                />
              </div>
              <div className="w-40">
                <label className="text-xs text-muted-foreground mb-1 block">Funcionário</label>
                <Input value={funcionario} onChange={(e) => setFuncionario(e.target.value)} placeholder="Nome" />
              </div>
              <div className="w-28">
                <label className="text-xs text-muted-foreground mb-1 block">Mês ref.</label>
                <Input value={mesRef} onChange={(e) => setMesRef(e.target.value)} placeholder="2026-04" />
              </div>
              <div className="w-20">
                <label className="text-xs text-muted-foreground mb-1 block">Jornada</label>
                <Input value={jornada} disabled className="text-center" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import options */}
        <div className="flex flex-wrap gap-3">
          <FileImporter onImport={handleFileImport} />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Camera className="h-4 w-4" /> Foto (IA)
            </Button>
          </div>
          {image && (
            <Button onClick={runOCR} disabled={loading || !empresa} className="gap-2">
              {loading ? step || "..." : "Ler Folha"}
            </Button>
          )}
        </div>

        {/* Photo preview */}
        {image && (
          <Card>
            <CardContent className="p-2">
              <img src={image} alt="Foto" className="max-h-48 w-full object-contain rounded" />
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { l: "Dias", v: resumo.dias_trabalhados, c: "" },
              { l: "Total", v: formatHours(resumo.total_horas), c: "text-primary" },
              { l: "Extras", v: formatHours(resumo.total_extras), c: "text-[hsl(var(--success))]" },
              { l: "Noturnas", v: formatHours(resumo.total_noturnas), c: "text-[hsl(var(--warning))]" },
              { l: "Saldo", v: formatHours(resumo.saldo), c: resumo.saldo >= 0 ? "text-[hsl(var(--success))]" : "text-destructive" },
            ].map((x) => (
              <Card key={x.l}>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] text-muted-foreground uppercase">{x.l}</p>
                  <p className={`text-lg font-bold ${x.c}`}>{x.v}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table */}
        {registros.length > 0 && (
          <Card>
            <CardHeader className="py-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">{registros.length} registros</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={recalc} className="gap-1">
                  <Calculator className="h-3 w-3" /> Recalcular
                </Button>
                <Button size="sm" onClick={salvar} disabled={loading || !empresa} className="gap-1">
                  <Save className="h-3 w-3" /> Salvar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      {["Dia", "Ent M", "Saí M", "Ent T", "Saí T", "Ent E", "Saí E", "Normal", "Extra", "Not.", "Exceção", "Obs"].map((h) => (
                        <th key={h} className="px-2 py-2 text-center font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-2 py-1.5 text-center font-semibold text-primary">{r.dia}</td>
                        {(["hora_entrada", "hora_saida", "hora_entrada_tarde", "hora_saida_tarde", "hora_entrada_extra", "hora_saida_extra"] as const).map((f) => (
                          <td key={f} className="px-1 py-1 text-center">
                            {editMode ? (
                              <Input
                                value={r[f] || ""}
                                onChange={(e) => updateReg(i, f, e.target.value)}
                                className="h-6 w-14 text-[10px] text-center p-0.5"
                                placeholder="--:--"
                              />
                            ) : (
                              <span>{r[f] || "—"}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center">{formatHours(r.horas_normais)}</td>
                        <td className="px-2 py-1 text-center text-[hsl(var(--success))]">
                          {r.horas_extras > 0 ? formatHours(r.horas_extras) : "—"}
                        </td>
                        <td className="px-2 py-1 text-center text-[hsl(var(--warning))]">
                          {r.horas_noturnas > 0 ? formatHours(r.horas_noturnas) : "—"}
                        </td>
                        <td className={`px-2 py-1 text-center text-[10px] ${excecaoColor(r.tipo_excecao)}`}>
                          {r.tipo_excecao || "—"}
                        </td>
                        <td className="px-1 py-1 text-center">
                          {editMode ? (
                            <Input
                              value={r.obs || ""}
                              onChange={(e) => updateReg(i, "obs", e.target.value)}
                              className="h-6 w-16 text-[10px] p-0.5"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{r.obs || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
