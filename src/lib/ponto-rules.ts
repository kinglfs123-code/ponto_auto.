// Business rules for timesheet processing

function parseTimeToMinutes(s: string | null | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  let c = s
    .trim()
    .replace(/[hH.]/g, ":")
    .replace(/[^\d:]/g, "");
  let h: number, m: number;
  if (c.includes(":")) {
    const p = c.split(":");
    h = parseInt(p[0]);
    m = parseInt(p[1] || "0");
  } else if (c.length === 4) {
    h = parseInt(c.slice(0, 2));
    m = parseInt(c.slice(2, 4));
  } else if (c.length === 3) {
    h = parseInt(c.slice(0, 1));
    m = parseInt(c.slice(1, 3));
  } else return null;
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatHours(d: number | null | undefined): string {
  if (d == null || isNaN(d)) return "—";
  const s = d < 0 ? "-" : "";
  const a = Math.abs(d);
  const totalMinutes = Math.round(a * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${s}${h}h${m.toString().padStart(2, "0")}min`;
}

export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins)) return "—";
  if (mins === 0) return "0min";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}min`;
  return `${m}min`;
}

export function maskHM(v: string): string {
  let d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + ":" + d.slice(2) : d;
}

export function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0, 2) + "." + d.slice(2);
  if (d.length <= 8) return d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5);
  if (d.length <= 12) return d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5, 8) + "/" + d.slice(8);
  return d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5, 8) + "/" + d.slice(8, 12) + "-" + d.slice(12);
}

export function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, ch, i) => acc + parseInt(ch, 10) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calc(d.slice(0, 12), w1);
  const dv2 = calc(d.slice(0, 12) + dv1, w2);
  return dv1 === parseInt(d[12], 10) && dv2 === parseInt(d[13], 10);
}

export function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + "." + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
}

export function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += parseInt(slice[i], 10) * (factor - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const dv1 = calc(d.slice(0, 9), 10);
  const dv2 = calc(d.slice(0, 10), 11);
  return dv1 === parseInt(d[9], 10) && dv2 === parseInt(d[10], 10);
}

/** Valida formato de e-mail (RFC simplificada). */
export function validateEmail(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.trim();
  if (s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Mascara um CPF mantendo apenas os 3 primeiros e os 2 últimos dígitos: 123.***.***-00 */
export function maskCpfSensitive(v: string | null | undefined): string {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length < 11) return maskCPF(v);
  return `${d.slice(0, 3)}.***.***-${d.slice(9, 11)}`;
}

/** Mascara um e-mail mantendo apenas a 1ª letra do usuário: j****@dominio.com */
export function maskEmailSensitive(v: string | null | undefined): string {
  if (!v) return "—";
  const at = v.indexOf("@");
  if (at < 1) return "****";
  const user = v.slice(0, at);
  const domain = v.slice(at);
  const first = user[0];
  return `${first}${"*".repeat(Math.max(3, user.length - 1))}${domain}`;
}

/** Normalize a name for fuzzy comparison: remove accents, lowercase, trim */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Match a name against a list of employees using fuzzy comparison */
export function matchFuncionario<T extends { nome_completo: string }>(nome: string, lista: T[]): T | null {
  if (!nome || lista.length === 0) return null;
  const n = normalizeName(nome);
  let match = lista.find((f) => normalizeName(f.nome_completo) === n);
  if (match) return match;
  match = lista.find((f) => {
    const fn = normalizeName(f.nome_completo);
    return fn.startsWith(n) || n.startsWith(fn);
  });
  if (match) return match;
  match = lista.find((f) => {
    const fn = normalizeName(f.nome_completo);
    return fn.includes(n) || n.includes(fn);
  });
  return match || null;
}

/** Adicional noturno CLT (mantido por compatibilidade — não usado no novo cálculo). */
export function calcAdicionalNoturnoCLT(realMinutes: number): number {
  return realMinutes * (60 / 52.5);
}

/** Format hours as signed HH:MM (e.g. -01:30). */
export function formatHHMM(d: number | null | undefined): string {
  if (d == null || isNaN(d)) return "—";
  const sign = d < 0 ? "-" : "";
  const totalMinutes = Math.round(Math.abs(d) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export interface RegistroPonto {
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
  atraso_minutos: number;
  tipo_excecao: string | null;
  corrigido_manualmente: boolean;
  obs: string | null;
  jornada_alt_entrada?: string | null;
  jornada_alt_saida?: string | null;
}

export interface ResumoCalculo {
  dias_trabalhados: number;
  total_horas: number;
  total_extras: number;
  total_atraso: number;
  total_noturnas: number;
  total_an_clt: number;
  total_faltas: number;
  saldo: number;
}

/**
 * ============================================================================
 *  CÁLCULO DE PONTO — Regra simples definida pelo cliente
 * ============================================================================
 *
 *  Para cada dia, comparamos DUAS marcações com o horário cadastrado:
 *
 *    ENTRADA REAL   = primeira batida do dia (me)
 *    SAÍDA REAL     = última batida do dia (es ?? ts)
 *
 *  Regras:
 *    1) Entrada ANTES do horário cadastrado  → HORA EXTRA (diferença)
 *    2) Saída   DEPOIS do horário cadastrado → HORA EXTRA (diferença)
 *    3) Entrada DEPOIS do horário cadastrado → ATRASO     (diferença)
 *    4) Saída   ANTES  do horário cadastrado → IGNORAR    (não conta)
 *
 *  Ignorado intencionalmente:
 *    - Intervalo de almoço (não desconta, não compara)
 *    - HE 100% / feriado / domingo / sábado (todos iguais a dia útil)
 *    - Adicional noturno
 *    - Faltas (não geram desconto)
 *    - Folgas (pulam o dia)
 * ============================================================================
 */
export function applyToleranceAndDetect(
  registro: Partial<RegistroPonto>,
  jornadaPadraoStr: string,
  horarioEntradaPadrao: string = "08:00",
  horarioSaidaPadrao: string = "17:00",
  intervaloStr: string = "01:00",
  ehDiaUtil: boolean = true,
): RegistroPonto {
  // Parâmetros não utilizados são preservados na assinatura por compatibilidade.
  // (jornadaPadraoStr, intervaloStr, ehDiaUtil são intencionalmente ignorados.)
  void jornadaPadraoStr;
  void intervaloStr;
  void ehDiaUtil;

  const dia = typeof registro.dia === "number" ? registro.dia : parseInt(String(registro.dia)) || 0;

  // Horário cadastrado (com possível override por jornada alternativa do dia)
  const altEntradaRef = parseTimeToMinutes(registro.jornada_alt_entrada);
  const altSaidaRef = parseTimeToMinutes(registro.jornada_alt_saida);
  const entradaRef = altEntradaRef ?? parseTimeToMinutes(horarioEntradaPadrao) ?? 480;
  const saidaRef = altSaidaRef ?? parseTimeToMinutes(horarioSaidaPadrao) ?? 1020;

  // Batidas do dia (em minutos)
  const me = parseTimeToMinutes(registro.hora_entrada);
  const ms = parseTimeToMinutes(registro.hora_saida);
  const te = parseTimeToMinutes(registro.hora_entrada_tarde);
  const ts = parseTimeToMinutes(registro.hora_saida_tarde);
  const ee = parseTimeToMinutes(registro.hora_entrada_extra);
  const es = parseTimeToMinutes(registro.hora_saida_extra);

  // ---- Detecção de exceções (folga / falta / atestado) ----
  let tipo_excecao: string | null = registro.tipo_excecao || null;
  const manualExceptions = ["folga", "falta", "atestado"];
  const isManualException = tipo_excecao && manualExceptions.includes(tipo_excecao);

  if (!isManualException) {
    tipo_excecao = null;
    const obs = (registro.obs || "").toUpperCase();
    const isFalta = obs.includes("FALTA") || obs.includes("AUSENT");
    const isFolga =
      obs.includes("FOLGA") ||
      obs.includes("FERIADO") ||
      obs.includes("COMPENSAÇÃO") ||
      obs.includes("COMPENSACAO") ||
      obs.includes("ABONO");
    const isAtestado =
      obs.includes("ATESTADO") ||
      obs.includes("LICENÇA") ||
      obs.includes("LICENCA") ||
      obs.includes("SUSPENSÃO") ||
      obs.includes("SUSPENSAO");

    if (isAtestado) tipo_excecao = "atestado";
    else if (isFalta) tipo_excecao = "falta";
    else if (isFolga) tipo_excecao = "folga";
  }

  // Dia marcado como folga/falta/atestado → não calcula nada
  const isAbsence = tipo_excecao === "falta" || tipo_excecao === "atestado" || tipo_excecao === "folga";
  if (isAbsence) {
    return {
      dia,
      hora_entrada: registro.hora_entrada || null,
      hora_saida: registro.hora_saida || null,
      hora_entrada_tarde: registro.hora_entrada_tarde || null,
      hora_saida_tarde: registro.hora_saida_tarde || null,
      hora_entrada_extra: registro.hora_entrada_extra || null,
      hora_saida_extra: registro.hora_saida_extra || null,
      horas_normais: 0,
      horas_extras: 0,
      horas_noturnas: 0,
      atraso_minutos: 0,
      tipo_excecao,
      corrigido_manualmente: registro.corrigido_manualmente || false,
      obs: registro.obs || null,
      jornada_alt_entrada: registro.jornada_alt_entrada || null,
      jornada_alt_saida: registro.jornada_alt_saida || null,
    };
  }

  // Dia totalmente vazio (sem batidas e sem exceção marcada) → não calcula nada
  const semBatidas = me === null && ms === null && te === null && ts === null && ee === null && es === null;
  if (semBatidas) {
    return {
      dia,
      hora_entrada: null,
      hora_saida: null,
      hora_entrada_tarde: null,
      hora_saida_tarde: null,
      hora_entrada_extra: null,
      hora_saida_extra: null,
      horas_normais: 0,
      horas_extras: 0,
      horas_noturnas: 0,
      atraso_minutos: 0,
      tipo_excecao: null,
      corrigido_manualmente: registro.corrigido_manualmente || false,
      obs: registro.obs || null,
      jornada_alt_entrada: registro.jornada_alt_entrada || null,
      jornada_alt_saida: registro.jornada_alt_saida || null,
    };
  }

  // ---- Identifica primeira e última batida do dia ----
  const entradaReal = me; // primeira batida
  const saidaReal = es ?? ts ?? ms; // última batida (prioriza período extra > tarde > manhã)

  // ---- Cálculo das HE e atraso (regra simples) ----
  let heMin = 0;
  let atrasoMin = 0;

  // Regras 1 e 3: entrada
  if (entradaReal !== null) {
    const diff = entradaRef - entradaReal; // positivo = chegou antes
    if (diff > 0) {
      heMin += diff; // entrada antes do horário = HE
    } else if (diff < 0) {
      atrasoMin += -diff; // entrada depois do horário = ATRASO
    }
  }

  // Regra 2: saída depois do horário = HE. (Regra 4: saída antes = ignora.)
  if (saidaReal !== null) {
    const diff = saidaReal - saidaRef; // positivo = saiu depois
    if (diff > 0) {
      heMin += diff;
    }
  }

  // tipo_excecao "atraso" só quando houve atraso e nenhuma HE
  if (atrasoMin > 0 && heMin === 0) {
    tipo_excecao = "atraso";
  }

  return {
    dia,
    hora_entrada: registro.hora_entrada || null,
    hora_saida: registro.hora_saida || null,
    hora_entrada_tarde: registro.hora_entrada_tarde || null,
    hora_saida_tarde: registro.hora_saida_tarde || null,
    hora_entrada_extra: registro.hora_entrada_extra || null,
    hora_saida_extra: registro.hora_saida_extra || null,
    horas_normais: 0,
    horas_extras: Math.round((heMin / 60) * 100) / 100,
    horas_noturnas: 0,
    atraso_minutos: Math.round(atrasoMin),
    tipo_excecao,
    corrigido_manualmente: registro.corrigido_manualmente || false,
    obs: registro.obs || null,
    jornada_alt_entrada: registro.jornada_alt_entrada || null,
    jornada_alt_saida: registro.jornada_alt_saida || null,
  };
}

/**
 * Resumo do mês — totais simples de HE e atraso.
 * Os demais campos do ResumoCalculo são preservados (zerados) por compatibilidade
 * com a UI atual; só `total_extras` e `total_atraso` representam dados reais agora.
 */
export function calcularResumo(registros: RegistroPonto[]): ResumoCalculo {
  let dias = 0;
  let extras = 0;
  let atraso = 0;
  let faltas = 0;

  for (const r of registros) {
    if (r.tipo_excecao === "falta") {
      faltas += 1;
      continue;
    }

    // Considera dia trabalhado se tem qualquer batida registrada
    const temBatida =
      !!r.hora_entrada || !!r.hora_saida || !!r.hora_entrada_tarde ||
      !!r.hora_saida_tarde || !!r.hora_entrada_extra || !!r.hora_saida_extra;

    if (temBatida) {
      dias++;
      extras += r.horas_extras || 0;
      atraso += r.atraso_minutos || 0;
    }
  }

  const extrasMin = Math.round(extras * 60);
  const saldo = (extrasMin - atraso) / 60;

  return {
    dias_trabalhados: dias,
    total_horas: 0, // não calculado (cliente pediu só HE e atraso)
    total_extras: Math.round(extras * 100) / 100,
    total_atraso: atraso,
    total_noturnas: 0, // não calculado
    total_an_clt: 0, // não calculado
    total_faltas: faltas,
    saldo: Math.round(saldo * 100) / 100,
  };
}
