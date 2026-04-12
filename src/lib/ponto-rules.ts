// Business rules for timesheet processing

export function parseTimeToMinutes(s: string | null | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  let c = s.trim().replace(/[hH.]/, ":").replace(/[^\d:]/g, "");
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

export function parseTimeToHours(s: string | null | undefined): number | null {
  const mins = parseTimeToMinutes(s);
  if (mins === null) return null;
  return mins / 60;
}

export function formatHours(d: number | null | undefined): string {
  if (d == null || isNaN(d)) return "—";
  const s = d < 0 ? "-" : "";
  const a = Math.abs(d);
  return `${s}${Math.floor(a)}h${Math.round((a % 1) * 60).toString().padStart(2, "0")}min`;
}

export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins) || mins === 0) return "—";
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
  return d.length === 14;
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
  return d.length === 11;
}

/** Normalize a name for fuzzy comparison: remove accents, lowercase, trim */
export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Match a name against a list of employees using fuzzy comparison */
export function matchFuncionario<T extends { nome_completo: string }>(
  nome: string,
  lista: T[]
): T | null {
  if (!nome || lista.length === 0) return null;
  const n = normalizeName(nome);
  // Exact
  let match = lista.find((f) => normalizeName(f.nome_completo) === n);
  if (match) return match;
  // Starts with (either direction)
  match = lista.find((f) => {
    const fn = normalizeName(f.nome_completo);
    return fn.startsWith(n) || n.startsWith(fn);
  });
  if (match) return match;
  // Includes (either direction)
  match = lista.find((f) => {
    const fn = normalizeName(f.nome_completo);
    return fn.includes(n) || n.includes(fn);
  });
  return match || null;
}

const TOLERANCE_MINUTES = 5;

export interface RegistroPonto {
  dia: number | string;
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
}

export interface ResumoCalculo {
  dias_trabalhados: number;
  total_horas: number;
  total_extras: number;
  total_atraso: number;
  total_noturnas: number;
  saldo: number;
}

function calcNightHours(entrada: number | null, saida: number | null): number {
  if (entrada === null || saida === null) return 0;
  // Night hours: 22:00 (1320min) to 05:00 (300min)
  let night = 0;
  const nightStart = 22 * 60;
  const nightEnd = 5 * 60;
  
  if (entrada >= nightStart) {
    const end = saida < entrada ? saida + 24 * 60 : saida;
    const nightEndAdjusted = nightEnd + 24 * 60;
    night += Math.max(0, Math.min(end, nightEndAdjusted) - Math.max(entrada, nightStart));
  } else if (entrada < nightEnd) {
    night += Math.max(0, Math.min(saida, nightEnd) - entrada);
  }
  
  return night / 60;
}

export function applyToleranceAndDetect(
  registro: Partial<RegistroPonto>,
  jornadaPadraoStr: string,
  horarioEntradaPadrao: string = "08:00",
  horarioSaidaPadrao: string = "17:20",
  intervaloStr: string = "01:00"
): RegistroPonto {
  const jornadaMinutos = parseTimeToMinutes(jornadaPadraoStr) || 440; // 7:20 default
  const entradaPadraoMin = parseTimeToMinutes(horarioEntradaPadrao) || 480;
  const saidaPadraoMin = parseTimeToMinutes(horarioSaidaPadrao) || (entradaPadraoMin + jornadaMinutos);
  const intervaloMinutos = parseTimeToMinutes(intervaloStr) || 60;

  const me = parseTimeToMinutes(registro.hora_entrada);
  const ms = parseTimeToMinutes(registro.hora_saida);
  const te = parseTimeToMinutes(registro.hora_entrada_tarde);
  const ts = parseTimeToMinutes(registro.hora_saida_tarde);
  const ee = parseTimeToMinutes(registro.hora_entrada_extra);
  const es = parseTimeToMinutes(registro.hora_saida_extra);

  let totalWorked = 0;
  // When only morning entry + morning exit exist (no split shifts), deduct interval
  const hasSplitShift = (te !== null && ts !== null);
  if (me !== null && ms !== null) totalWorked += ms - me;
  if (te !== null && ts !== null) totalWorked += ts - te;
  if (ee !== null && es !== null) totalWorked += es - ee;
  
  // Deduct interval only when there's a single continuous shift (no split)
  if (me !== null && ms !== null && !hasSplitShift && totalWorked > intervaloMinutos) {
    totalWorked -= intervaloMinutos;
  }

  let nightHours = 0;
  nightHours += calcNightHours(me, ms);
  nightHours += calcNightHours(te, ts);
  nightHours += calcNightHours(ee, es);

  // Calculate delay (atraso) with 5min tolerance
  let atrasoMinutos = 0;
  if (me !== null) {
    const diff = me - entradaPadraoMin;
    if (diff > TOLERANCE_MINUTES) {
      atrasoMinutos = diff;
    }
  }

  // Detect exceptions
  let tipo_excecao: string | null = registro.tipo_excecao || null;
  
  // If manually set to folga/falta/atestado, respect it
  const manualExceptions = ["folga", "falta", "atestado"];
  const isManualException = tipo_excecao && manualExceptions.includes(tipo_excecao);
  
  if (!isManualException) {
    tipo_excecao = null;
    const obs = (registro.obs || "").toUpperCase();
    const isFalta = obs.includes("FALTA") || obs.includes("AUSENT");
    const isFolga = obs.includes("FOLGA") || obs.includes("FERIADO");
    const isAtestado = obs.includes("ATESTADO");

    if (isAtestado) {
      tipo_excecao = "atestado";
    } else if (isFalta) {
      tipo_excecao = "falta";
    } else if (isFolga) {
      tipo_excecao = "folga";
    } else if (!isFolga && me === null && ms === null && te === null && ts === null) {
      tipo_excecao = "falta";
    } else if (atrasoMinutos > 0) {
      tipo_excecao = "atraso";
    }
  }

  // Zero out hours for falta/atestado
  const isAbsence = tipo_excecao === "falta" || tipo_excecao === "atestado";
  const totalWorkedHours = isAbsence ? 0 : (totalWorked > 0 ? totalWorked / 60 : 0);
  const jornadaHours = jornadaMinutos / 60;
  const extras = totalWorkedHours > jornadaHours ? totalWorkedHours - jornadaHours : 0;
  const normais = totalWorkedHours > 0 ? Math.min(totalWorkedHours, jornadaHours) : 0;

  // Check early departure
  if (!tipo_excecao && totalWorkedHours > 0 && totalWorkedHours < jornadaHours - TOLERANCE_MINUTES / 60) {
    tipo_excecao = "saida_antecipada";
  }

  return {
    dia: registro.dia || 0,
    hora_entrada: registro.hora_entrada || null,
    hora_saida: registro.hora_saida || null,
    hora_entrada_tarde: registro.hora_entrada_tarde || null,
    hora_saida_tarde: registro.hora_saida_tarde || null,
    hora_entrada_extra: registro.hora_entrada_extra || null,
    hora_saida_extra: registro.hora_saida_extra || null,
    horas_normais: Math.round(normais * 100) / 100,
    horas_extras: Math.round(extras * 100) / 100,
    horas_noturnas: Math.round(nightHours * 100) / 100,
    atraso_minutos: atrasoMinutos,
    tipo_excecao,
    corrigido_manualmente: registro.corrigido_manualmente || false,
    obs: registro.obs || null,
  };
}

export function calcularResumo(registros: RegistroPonto[]): ResumoCalculo {
  let dias = 0, totalH = 0, extras = 0, atraso = 0, noturnas = 0;
  
  for (const r of registros) {
    const total = r.horas_normais + r.horas_extras;
    if (total > 0) {
      dias++;
      totalH += total;
      extras += r.horas_extras;
      noturnas += r.horas_noturnas;
    }
    atraso += r.atraso_minutos || 0;
  }

  return {
    dias_trabalhados: dias,
    total_horas: Math.round(totalH * 100) / 100,
    total_extras: Math.round(extras * 100) / 100,
    total_atraso: atraso,
    total_noturnas: Math.round(noturnas * 100) / 100,
    saldo: Math.round(extras * 100) / 100,
  };
}
