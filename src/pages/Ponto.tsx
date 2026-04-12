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

import { useEmpresa } from "@/contexts/EmpresaContext";
import { currentMonth, toBrMonth, fromBrMonth } from "@/lib/utils";
import {
  parseTimeToHours,
  formatHours,
  formatMinutes,
  maskHM,
  applyToleranceAndDetect,
  calcularResumo,
  matchFuncionario,
  type RegistroPonto,
  type ResumoCalculo,
} from "@/lib/ponto-rules";
import { Camera, Save, Calculator, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  preprocessImage,
  getConfidenceLevel,
} from "@/lib/ocr-utils";

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
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

    const resp = await fetch(FUNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

// preprocessImage imported from @/lib/ocr-utils


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
  const { empresa, setEmpresa } = useEmpresa();
  const [funcionarioSel, setFuncionarioSel] = useState<FuncionarioOption | null>(null);
  const [funcionario, setFuncionario] = useState("");
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
  const [mesRef, setMesRef] = useState(currentMonth);
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

  const handleEmpresaChange = (e: typeof empresa) => {
    setEmpresa(e);
    setFuncionarioSel(null);
    setFuncionario("");
    setFuncionarios([]);
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
      const processed = await preprocessImage(image);
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

        // Build confidence map with levels
        const confMap: Record<number, string> = {};
        result.registros.forEach((r) => {
          const level = getConfidenceLevel(r.confianca);
          confMap[r.dia] = level === "low" ? "baixa" : level === "medium" ? "media" : "alta";
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

        const lowConf = result.registros.filter((r) => {
          const level = getConfidenceLevel(r.confianca);
          return level === "low" || level === "medium";
        }).length;
        if (lowConf > 0) {
          toast({
            title: `${lowConf} registro(s) precisam de revisão`,
            description: "Campos marcados com ⚠ têm confiança baixa ou média",
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

  const excecaoBadge = (t: string | null) => {
    if (!t) return null;
    const map: Record<string, { label: string; className: string }> = {
      atraso: { label: "Atraso", className: "bg-destructive/10 text-destructive border-destructive/30" },
      saida_antecipada: { label: "Saída Ant.", className: "bg-warning/10 text-warning border-warning/30" },
      falta: { label: "Falta", className: "bg-falta/10 text-falta font-bold border-falta/30" },
      folga: { label: "Folga", className: "bg-folga/10 text-folga border-folga/30" },
      atestado: { label: "Atestado", className: "bg-atestado/10 text-atestado border-atestado/30" },
      feriado: { label: "Feriado", className: "bg-feriado/10 text-feriado border-feriado/30" },
    };
    const info = map[t] || { label: t, className: "" };
    return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${info.className}`}>{info.label}</Badge>;
  };

  const setExcecao = (i: number, tipo: string | null) => {
    const u = [...registros];
    u[i] = { ...u[i], tipo_excecao: tipo, corrigido_manualmente: true };
    // Re-apply calculations to zero out hours for falta/atestado
    const processed = applyToleranceAndDetect(u[i], jornada, horarioEntrada);
    // Keep the manually set exception
    processed.tipo_excecao = tipo;
    processed.corrigido_manualmente = true;
    u[i] = processed;
    setRegistros(u);
    setResumo(calcularResumo(u));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <NavBar />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-primary animate-fade-in">Importar Ponto</h1>

        {/* Company selector + info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
                <EmpresaSelector
                  value={empresa?.id || searchParams.get("empresa")}
                  onChange={handleEmpresaChange}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Funcionário</label>
                <FuncionarioSelector
                  empresaId={empresa?.id || null}
                  value={funcionarioSel}
                  manualName={funcionario}
                  onSelect={(f) => {
                    setFuncionarioSel(f);
                    if (f) setFuncionario(f.nome_completo);
                  }}
                  onManualName={setFuncionario}
                  onLoadedFuncionarios={setFuncionarios}
                />
              </div>
              <div className="w-28">
                <label className="text-xs text-muted-foreground mb-1 block">Mês ref.</label>
                <Input value={toBrMonth(mesRef)} onChange={(e) => setMesRef(fromBrMonth(e.target.value))} placeholder="04/2026" />
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
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Camera className="h-4 w-4" /> Anexar Foto
            </Button>
          </div>
          {image && !empresa && (
            <p className="text-xs text-destructive">Selecione uma empresa para ler a folha.</p>
          )}
          {image && empresa && (
            <Button onClick={runOCR} disabled={loading} className="gap-2">
              {loading ? step || "Processando..." : "Ler Folha de Ponto"}
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
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { l: "Dias", v: resumo.dias_trabalhados, c: "" },
              { l: "Total", v: formatHours(resumo.total_horas), c: "text-primary" },
              { l: "Extras", v: formatHours(resumo.total_extras), c: "text-[hsl(var(--success))]" },
              { l: "Atraso", v: formatMinutes(resumo.total_atraso), c: resumo.total_atraso > 0 ? "text-destructive" : "" },
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
                      const confLevel = confidenceMap[r.dia as number];
                      const isLowConf = confLevel === "baixa";
                      const isMedConf = confLevel === "media";
                      const rowBg = isLowConf ? "bg-destructive/5" : isMedConf ? "bg-[hsl(var(--warning)/0.08)]" : "";
                      return (
                        <tr key={i} className={`border-b border-border/50 hover:bg-muted/30 ${rowBg}`}>
                          <td className="px-2 py-1.5 text-center font-semibold text-primary flex items-center justify-center gap-1">
                            {r.dia}
                            {isLowConf && <AlertTriangle className="h-3 w-3 text-destructive" />}
                            {isMedConf && <AlertTriangle className="h-3 w-3 text-[hsl(var(--warning))]" />}
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
                          <td className="px-1 py-1 text-center">
                            {editMode ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="min-w-[3rem] cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                                    {excecaoBadge(r.tipo_excecao) || <span className="text-[10px] text-muted-foreground">—</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-36 p-1.5" align="center">
                                  <div className="flex flex-col gap-0.5">
                                    {[
                                      { tipo: "folga", label: "Folga" },
                                      { tipo: "falta", label: "Falta" },
                                      { tipo: "atestado", label: "Atestado" },
                                    ].map((opt) => (
                                      <button
                                        key={opt.tipo}
                                        className={`text-xs text-left px-2 py-1.5 rounded hover:bg-muted transition-colors ${r.tipo_excecao === opt.tipo ? "bg-muted font-semibold" : ""}`}
                                        onClick={() => setExcecao(i, r.tipo_excecao === opt.tipo ? null : opt.tipo)}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                    {r.tipo_excecao && (
                                      <button
                                        className="text-xs text-left px-2 py-1.5 rounded hover:bg-muted text-muted-foreground transition-colors border-t border-border mt-0.5 pt-1.5"
                                        onClick={() => setExcecao(i, null)}
                                      >
                                        Limpar
                                      </button>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              excecaoBadge(r.tipo_excecao) || <span className="text-[10px] text-muted-foreground">—</span>
                            )}
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
