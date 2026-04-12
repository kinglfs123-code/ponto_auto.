// Learning system: metrics calculation and pattern aggregation
import { supabase } from "@/integrations/supabase/client";

export interface AccuracyMetrics {
  overall_accuracy: number;
  total_processed: number;
  total_corrections: number;
  accuracy_by_field: Record<string, number>;
  accuracy_trend: Array<{
    date: string;
    accuracy: number;
    total_processed: number;
  }>;
}

export interface EmployeePattern {
  nome: string;
  total_corrections: number;
  common_errors: Array<{
    pattern: string;
    frequency: number;
  }>;
  typical_times: {
    entrada_manha: string | null;
    saida_almoco: string | null;
    entrada_tarde: string | null;
    saida_final: string | null;
  };
  handwriting_difficulty: number; // 1-10
}

export interface GlobalPattern {
  pattern_type: string;
  description: string;
  ocr_value: string;
  correct_value: string;
  frequency: number;
}

/** Calculate accuracy metrics from corrections and folhas data */
export async function calcularMetricas(empresaId?: string): Promise<AccuracyMetrics> {
  // Get total folhas processed
  let folhasQuery = supabase.from("folhas_ponto").select("id, created_at", { count: "exact" });
  if (empresaId) folhasQuery = folhasQuery.eq("empresa_id", empresaId);
  const { count: totalProcessed } = await folhasQuery;

  // Get all corrections
  let corQuery = supabase.from("correcoes_ia").select("campo, valor_ia, valor_corrigido, dia, created_at");
  if (empresaId) corQuery = corQuery.eq("empresa_id", empresaId);
  const { data: corrections } = await corQuery;

  const totalCorrections = corrections?.length || 0;
  const totalRegs = (totalProcessed || 1) * 30; // estimate ~30 records per folha

  // Overall accuracy
  const overall_accuracy =
    totalRegs > 0 ? Math.round(((totalRegs - totalCorrections) / totalRegs) * 1000) / 10 : 100;

  // Accuracy by field
  const fieldCounts: Record<string, number> = {};
  for (const c of corrections || []) {
    fieldCounts[c.campo] = (fieldCounts[c.campo] || 0) + 1;
  }

  const accuracy_by_field: Record<string, number> = {};
  const fields = ["hora_entrada", "hora_saida", "hora_entrada_tarde", "hora_saida_tarde", "hora_entrada_extra", "hora_saida_extra", "obs"];
  for (const f of fields) {
    const errors = fieldCounts[f] || 0;
    const fieldTotal = totalProcessed || 1;
    accuracy_by_field[f] = Math.round(((fieldTotal * 30 - errors) / (fieldTotal * 30)) * 1000) / 10;
  }

  // Accuracy trend (last 30 days)
  const accuracy_trend: AccuracyMetrics["accuracy_trend"] = [];
  // Group corrections by date
  const byDate: Record<string, number> = {};
  for (const c of corrections || []) {
    const date = c.created_at.split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;
  }
  for (const [date, count] of Object.entries(byDate).sort()) {
    accuracy_trend.push({
      date,
      accuracy: Math.round(((30 - count) / 30) * 1000) / 10,
      total_processed: count,
    });
  }

  return {
    overall_accuracy,
    total_processed: totalProcessed || 0,
    total_corrections: totalCorrections,
    accuracy_by_field,
    accuracy_trend,
  };
}

/** Extract learned patterns from correction history */
export async function extrairPadroes(empresaId: string): Promise<GlobalPattern[]> {
  const { data: corrections } = await supabase
    .from("correcoes_ia")
    .select("campo, valor_ia, valor_corrigido")
    .eq("empresa_id", empresaId);

  if (!corrections || corrections.length === 0) return [];

  // Aggregate patterns
  const patternMap: Record<string, { count: number; campo: string; ocr: string; correct: string }> = {};

  for (const c of corrections) {
    const key = `${c.campo}:${c.valor_ia}→${c.valor_corrigido}`;
    if (!patternMap[key]) {
      patternMap[key] = { count: 0, campo: c.campo, ocr: c.valor_ia || "", correct: c.valor_corrigido || "" };
    }
    patternMap[key].count++;
  }

  return Object.values(patternMap)
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map((p) => ({
      pattern_type: "field_correction",
      description: `Campo "${p.campo}": IA lê "${p.ocr}" mas correto é "${p.correct}"`,
      ocr_value: p.ocr,
      correct_value: p.correct,
      frequency: p.count,
    }));
}

/** Build learning context string for the AI prompt */
export async function buildLearningContext(empresaId: string): Promise<string> {
  const patterns = await extrairPadroes(empresaId);
  if (patterns.length === 0) return "";

  let context = "";
  for (const p of patterns.slice(0, 20)) {
    context += `- ${p.description} (ocorreu ${p.frequency}x)\n`;
  }
  return context;
}
