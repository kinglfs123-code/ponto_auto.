// Business rules for timesheet processing

export function parseTimeToMinutes(s: string | null | undefined): number | null {
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

export function parseTimeToHours(s: string | null | undefined): number | null {
  const mins = parseTimeToMinutes(s);
  if (mins === null) return null;
  return mins / 60;
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
export function normalizeName(s: string): string {
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
}

export interface ResumoCalculo {
  dias_trabalhados: number;
  total_horas: number;
  total_extras: number;
  total_atraso: number;
  total_noturnas: number;
  saldo: number;
}

/**
 * Calculate night hours (adicional noturno) for a shift.
 * Night period: 22:00 (1320min) to 05:00 (300min next day).
 */
function calcNightMinutes(entrada: number | null, saida: number | null): number {
  if (entrada === null || saida === null) return 0;

  const NIGHT_START = 22 * 60; // 1320
  const NIGHT_END = 5 * 60; // 300

  let adjustedSaida = saida;
  // Handle overnight: if exit <= entry, it crossed midnight
  if (saida <= entrada) {
    adjustedSaida = saida + 24 * 60;
  }

  let nightMinutes = 0;

  // Check overlap with early morning period: 00:00 – 05:00
  if (entrada < NIGHT_END) {
    nightMinutes += Math.min(adjustedSaida, NIGHT_END) - entrada;
  }

  // Check overlap with late night period: 22:00 – 29:00 (05:00 next day)
  const nightWindowEnd = NIGHT_END + 24 * 60; // 1740
  if (adjustedSaida > NIGHT_START) {
    const overlapStart = Math.max(entrada, NIGHT_START);
    const overlapEnd = Math.min(adjustedSaida, nightWindowEnd);
    if (overlapEnd > overlapStart) {
      nightMinutes += overlapEnd - overlapStart;
    }
  }

  return Math.max(0, nightMinutes);
}

export function applyToleranceAndDetect(
  registro: Partial<RegistroPonto>,
  jornadaPadraoStr: string,
  horarioEntradaPadrao: string = "08:00",
  horarioSaidaPadrao: string = "17:00",
  _intervaloStr: string = "01:00",
): RegistroPonto {
  const dia = typeof registro.dia === "number" ? registro.dia : parseInt(String(registro.dia)) || 0;

  const jornadaMinutos = parseTimeToMinutes(jornadaPadraoStr) || 440; // 7h20 default
  const entradaPadraoMin = parseTimeToMinutes(horarioEntradaPadrao) || 480;
  const saidaPadraoMin = parseTimeToMinutes(horarioSaidaPadrao) || 780;

  const me = parseTimeToMinutes(registro.hora_entrada);
  const ms = parseTimeToMinutes(registro.hora_saida);
  const te = parseTimeToMinutes(registro.hora_entrada_tarde);
  const ts = parseTimeToMinutes(registro.hora_saida_tarde);
  const ee = parseTimeToMinutes(registro.hora_entrada_extra);
  const es = parseTimeToMinutes(registro.hora_saida_extra);

  // Detect exceptions from obs
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

  // If absence type (folga, atestado, falta from obs) → everything zero
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
      atraso_minutos: tipo_excecao === "falta" ? jornadaMinutos : 0,
      tipo_excecao,
      corrigido_manualmente: registro.corrigido_manualmente || false,
      obs: registro.obs || null,
    };
  }

  // No records at all → falta
  if (me === null && ms === null && te === null && ts === null) {
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
      atraso_minutos: jornadaMinutos,
      tipo_excecao: "falta",
      corrigido_manualmente: registro.corrigido_manualmente || false,
      obs: registro.obs || null,
    };
  }

  // === NEW LOGIC: Compare punch times against standard schedule ===
  // First entry and last exit of the day
  const primeiraEntrada = me ?? te ?? ee;
  const ultimaSaida = es ?? ts ?? ms;

  let extraMinutos = 0;
  let atrasoMinutos = 0;

  // ENTRY: arrived before standard = extra, after = atraso (with 5min tolerance)
  if (primeiraEntrada !== null) {
    const diffEntrada = primeiraEntrada - entradaPadraoMin;
    if (diffEntrada < -TOLERANCE_MINUTES) {
      // Arrived early → extra (amount before standard entry)
      extraMinutos += Math.abs(diffEntrada);
    } else if (diffEntrada > TOLERANCE_MINUTES) {
      // Arrived late → atraso
      atrasoMinutos += diffEntrada;
    }
  }

  // EXIT: left after standard = extra, before = atraso (with 5min tolerance)
  if (ultimaSaida !== null) {
    const diffSaida = ultimaSaida - saidaPadraoMin;
    if (diffSaida > TOLERANCE_MINUTES) {
      // Left late → extra
      extraMinutos += diffSaida;
    } else if (diffSaida < -TOLERANCE_MINUTES) {
      // Left early → atraso
      atrasoMinutos += Math.abs(diffSaida);
    }
  }

  // Normal hours = standard workday (always, when they worked)
  const jornadaHours = jornadaMinutos / 60;

  // Night hours calculation
  let nightMinutes = 0;
  nightMinutes += calcNightMinutes(me, ms);
  nightMinutes += calcNightMinutes(te, ts);
  nightMinutes += calcNightMinutes(ee, es);

  // Detect exception type
  if (atrasoMinutos > 0 && extraMinutos > 0) {
    // Has both delay and extra — unusual but possible
    tipo_excecao = null;
  } else if (atrasoMinutos > 0) {
    const hasEarlyExit = ultimaSaida !== null && ultimaSaida - saidaPadraoMin < -TOLERANCE_MINUTES;
    const hasLateEntry = primeiraEntrada !== null && primeiraEntrada - entradaPadraoMin > TOLERANCE_MINUTES;
    if (hasLateEntry && hasEarlyExit) {
      tipo_excecao = "atraso_saida_antecipada";
    } else if (hasEarlyExit) {
      tipo_excecao = "saida_antecipada";
    } else {
      tipo_excecao = "atraso";
    }
  }

  return {
    dia,
    hora_entrada: registro.hora_entrada || null,
    hora_saida: registro.hora_saida || null,
    hora_entrada_tarde: registro.hora_entrada_tarde || null,
    hora_saida_tarde: registro.hora_saida_tarde || null,
    hora_entrada_extra: registro.hora_entrada_extra || null,
    hora_saida_extra: registro.hora_saida_extra || null,
    horas_normais: Math.round(jornadaHours * 100) / 100,
    horas_extras: Math.round((extraMinutos / 60) * 100) / 100,
    horas_noturnas: Math.round((nightMinutes / 60) * 100) / 100,
    atraso_minutos: atrasoMinutos,
    tipo_excecao,
    corrigido_manualmente: registro.corrigido_manualmente || false,
    obs: registro.obs || null,
  };
}

export function calcularResumo(registros: RegistroPonto[]): ResumoCalculo {
  let dias = 0,
    totalH = 0,
    extras = 0,
    atraso = 0,
    noturnas = 0;

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

  // Saldo = extras(min) - atraso(min), converted to hours
  const extrasMin = Math.round(extras * 60);
  const saldo = (extrasMin - atraso) / 60;

  return {
    dias_trabalhados: dias,
    total_horas: Math.round(totalH * 100) / 100,
    total_extras: Math.round(extras * 100) / 100,
    total_atraso: atraso,
    total_noturnas: Math.round(noturnas * 100) / 100,
    saldo: Math.round(saldo * 100) / 100,
  };
}
