import { useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NavBar from "@/components/NavBar";
import EmpresaSelector from "@/components/EmpresaSelector";
import FuncionarioSelector, { type FuncionarioOption } from "@/components/FuncionarioSelector";
import FileImporter, { type ImportedRecord } from "@/components/FileImporter";
import {
  parseTimeToHours,
  formatHours,
  maskHM,
  applyToleranceAndDetect,
  calcularResumo,
  matchFuncionario,
  type RegistroPonto,
  type ResumoCalculo,
} from "@/lib/ponto-rules";
import { Camera, Save, Calculator, AlertTriangle } from "lucide-react";

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/read-timesheet`;

interface AIResult {
  nome: string;
  mes: string;
  registros: Array<{
    dia: number;
    me?: string | null;
    ms?: string | null;
    te?: string | null;
    ts?: string | null;
    ee?: string | null;
    es?: string | null;
    obs?: string | null;
    confianca?: string;
  }>;
}

interface Correcao {
  campo: string;
  valor_ia: string;
  valor_corrigido: string;
  dia?: number;
}

async function callAI(body: Record<string, unknown>): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const resp = await fetch(FUNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || `Erro ${resp.status}`);
    return data.result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("A leitura demorou demais. Tente com uma foto menor ou mais nítida.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Image preprocessing: resize + light contrast boost (no binarization) */
function preprocessImage(dataUrl: string, maxW = 900): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error("Imagem inválida"));
    img.onload = () => {
      const sc = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * sc);
      const h = Math.round(img.height * sc);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      // Light contrast boost only
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      const contrast = 1.2;
      const brightness = 5;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, (d[i] - 128) * contrast + 128 + brightness));
        d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * contrast + 128 + brightness));
        d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * contrast + 128 + brightness));
      }
      ctx.putImageData(imageData, 0, 0);
      res(c.toDataURL("image/jpeg", 0.75));
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

// Store original AI values for correction tracking
interface AIOriginal {
  dia: number;
  me?: string | null;
  ms?: string | null;
  te?: string | null;
  ts?: string | null;
  ee?: string | null;
  es?: string | null;
  obs?: string | null;
  confianca?: string;
}

export default function Ponto() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<EmpresaSel | null>(null);
  const [funcionarioSel, setFuncionarioSel] = useState<FuncionarioOption | null>(null);
  const [funcionario, setFuncionario] = useState("");
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
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
  const [aiOriginals, setAiOriginals] = useState<AIOriginal[]>([]);
  const [confidenceMap, setConfidenceMap] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const horarioEntrada = funcionarioSel?.horario_entrada || "08:00";
  const jornada = empresa?.jornada_padrao || "07:20";

  // Load funcionarios when empresa changes
  const handleEmpresaChange = (e: EmpresaSel | null) => {
    setEmpresa(e);
    setFuncionarioSel(null);
    setFuncionario("");
    if (e) {
      supabase
        .from("funcionarios")
        .select("id, nome_completo, horario_entrada, horario_saida")
        .eq("empresa_id", e.id)
        .order("nome_completo")
        .then(({ data }) => setFuncionarios(data || []));
    } else {
      setFuncionarios([]);
    }
  };

  // Fetch previous corrections for this company
  const fetchCorrections = async (empresaId: string): Promise<Correcao[]> => {
    const { data } = await supabase
      .from("correcoes_ia")
      .select("campo, valor_ia, valor_corrigido, dia")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data || []) as Correcao[];
  };

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
        jornada,
        horarioEntrada
      )
    );
    setRegistros(processed);
    setResumo(calcularResumo(processed));
    setEditMode(true);
    setAiOriginals([]);
    setConfidenceMap({});
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
      setStep("Pré-processando imagem...");
      const processed = await preprocessImage(image, 900);
      const b64 = processed.split(",")[1];

      setStep("Buscando correções anteriores...");
      const correcoes = await fetchCorrections(empresa.id);

      setStep("Enviando para IA...");
      const result = await callAI({ image: b64, correcoes });

      setStep("Processando resultados...");
      if (result.nome) {
        setFuncionario(result.nome);
        // Try to match with registered employees
        const matched = matchFuncionario(result.nome, funcionarios);
        if (matched) {
          setFuncionarioSel(matched);
          setFuncionario(matched.nome_completo);
          toast({ title: `Funcionário identificado: ${matched.nome_completo}` });
        }
      }
      if (result.mes) setMesRef(result.mes);

      if (result.registros?.length > 0) {
        // Save originals for correction tracking
        setAiOriginals(result.registros);

        // Build confidence map
        const confMap: Record<number, string> = {};
        result.registros.forEach((r) => {
          confMap[r.dia] = r.confianca || "alta";
        });
        setConfidenceMap(confMap);

        const regs = result.registros.map((r) =>
          applyToleranceAndDetect(
            {
              dia: r.dia,
              hora_entrada: r.me || null,
              hora_saida: r.ms || null,
              hora_entrada_tarde: r.te || null,
              hora_saida_tarde: r.ts || null,
              hora_entrada_extra: r.ee || null,
              hora_saida_extra: r.es || null,
              obs: r.obs || null,
            },
            jornada,
            funcionarioSel?.horario_entrada || horarioEntrada
          )
        );
        setRegistros(regs);
        setResumo(calcularResumo(regs));
        setEditMode(true);

        const lowConf = result.registros.filter((r) => r.confianca === "baixa").length;
        if (lowConf > 0) {
          toast({
            title: `${lowConf} registro(s) com baixa confiança`,
            description: "Campos marcados com ⚠ precisam de revisão",
          });
        }
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
    const processed = registros.map((r) => applyToleranceAndDetect(r, jornada, horarioEntrada));
    setRegistros(processed);
    setResumo(calcularResumo(processed));
  };

  const updateReg = (i: number, field: string, value: string) => {
    const u = [...registros];
    u[i] = { ...u[i], [field]: value || null, corrigido_manualmente: true };
    setRegistros(u);
  };

  // Save corrections to correcoes_ia table
  const saveCorrections = async (folhaId: string) => {
    if (!empresa || aiOriginals.length === 0) return;

    const fieldMap: Record<string, string> = {
      hora_entrada: "me",
      hora_saida: "ms",
      hora_entrada_tarde: "te",
      hora_saida_tarde: "ts",
      hora_entrada_extra: "ee",
      hora_saida_extra: "es",
      obs: "obs",
    };

    const corrections: Array<{
      empresa_id: string;
      folha_id: string;
      dia: number;
      campo: string;
      valor_ia: string;
      valor_corrigido: string;
    }> = [];

    for (const reg of registros) {
      if (!reg.corrigido_manualmente) continue;
      const orig = aiOriginals.find((o) => o.dia === reg.dia);
      if (!orig) continue;

      for (const [regField, aiField] of Object.entries(fieldMap)) {
        const aiVal = (orig as unknown as Record<string, unknown>)[aiField] as string | null;
        const userVal = (reg as unknown as Record<string, unknown>)[regField] as string | null;
        if ((aiVal || "") !== (userVal || "")) {
          corrections.push({
            empresa_id: empresa.id,
            folha_id: folhaId,
            dia: typeof reg.dia === "number" ? reg.dia : parseInt(String(reg.dia)) || 0,
            campo: regField,
            valor_ia: aiVal || "",
            valor_corrigido: userVal || "",
          });
        }
      }
    }

    if (corrections.length > 0) {
      await supabase.from("correcoes_ia").insert(corrections);
    }
  };

  const salvar = async () => {
    if (!empresa || !funcionario.trim() || registros.length === 0) {
      toast({ title: "Preencha empresa, funcionário e tenha registros", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const insertData: Record<string, unknown> = {
        empresa_id: empresa.id,
        funcionario: funcionario.trim(),
        mes_referencia: mesRef,
        status: "rascunho" as const,
      };
      if (funcionarioSel?.id) {
        insertData.funcionario_id = funcionarioSel.id;
      }
      const { data: folha, error: fErr } = await supabase
        .from("folhas_ponto")
        .insert(insertData as any)
        .select("id")
        .single();
      if (fErr || !folha) throw fErr || new Error("Erro ao criar folha");

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

      // Save AI corrections for learning
      await saveCorrections(folha.id);

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
              {loading ? step || "..." : "Ler Folha de Ponto"}
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
                    {registros.map((r, i) => {
                      const isLowConf = confidenceMap[r.dia as number] === "baixa";
                      return (
                        <tr key={i} className={`border-b border-border/50 hover:bg-muted/30 ${isLowConf ? "bg-[hsl(var(--warning)/0.08)]" : ""}`}>
                          <td className="px-2 py-1.5 text-center font-semibold text-primary flex items-center justify-center gap-1">
                            {r.dia}
                            {isLowConf && <AlertTriangle className="h-3 w-3 text-[hsl(var(--warning))]" />}
                          </td>
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
                      );
                    })}
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
