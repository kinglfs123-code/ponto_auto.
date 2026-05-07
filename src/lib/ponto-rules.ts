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
  // user@domain.tld (TLD ≥ 2 chars)
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

/** Adicional noturno CLT: cada 52min30s reais valem 60min legais. */
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
 * Calculate night hours (adicional noturno) for a shift.
 * Night period: 22:00 (1320min) to 05:00 (300min next day).
 */
function calcNightMinutes(entrada: number | null, saida: number | null): number {
  if (entrada === null || saida === null) return 0;

  const NIGHT_START = 22 * 60; // 1320
  const NIGHT_END = 5 * 60; // 300

  let adjustedSaida = saida;
  if (saida <= entrada) {
    adjustedSaida = saida + 24 * 60;
  }

  let nightMinutes = 0;

  if (entrada < NIGHT_END) {
    nightMinutes += Math.min(adjustedSaida, NIGHT_END) - entrada;
  }

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
  intervaloStr: string = "01:00",
  ehDiaUtil: boolean = true,
): RegistroPonto {
  const dia = typeof registro.dia === "number" ? registro.dia : parseInt(String(registro.dia)) || 0;

  const altEntradaRef = parseTimeToMinutes(registro.jornada_alt_entrada);
  const altSaidaRef = parseTimeToMinutes(registro.jornada_alt_saida);
  const entradaRef = altEntradaRef ?? parseTimeToMinutes(horarioEntradaPadrao) ?? 480;
  const saidaRef = altSaidaRef ?? parseTimeToMinutes(horarioSaidaPadrao) ?? 1020;
  const almocoRef = parseTimeToMinutes(intervaloStr) ?? 60;
  let cargaMinutos = saidaRef - entradaRef - almocoRef;
  if (cargaMinutos < 0) cargaMinutos += 24 * 60;
  const hasAlt = altEntradaRef !== null || altSaidaRef !== null;
  const jornadaFromArg = parseTimeToMinutes(jornadaPadraoStr);
  const jornadaMinutos = hasAlt ? cargaMinutos : (jornadaFromArg ?? cargaMinutos ?? 480);

  const me = parseTimeToMinutes(registro.hora_entrada);
  const ms = parseTimeToMinutes(registro.hora_saida);
  const te = parseTimeToMinutes(registro.hora_entrada_tarde);
  const ts = parseTimeToMinutes(registro.hora_saida_tarde);
  const ee = parseTimeToMinutes(registro.hora_entrada_extra);
  const es = parseTimeToMinutes(registro.hora_saida_extra);

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
      jornada_alt_entrada: registro.jornada_alt_entrada || null,
      jornada_alt_saida: registro.jornada_alt_saida || null,
    };
  }

  const semBatidas = me === null && ms === null && te === null && ts === null && ee === null && es === null;
  if (semBatidas) {
    if (!ehDiaUtil) {
      return {
        dia,
        hora_entrada: null, hora_saida: null,
        hora_entrada_tarde: null, hora_saida_tarde: null,
        hora_entrada_extra: null, hora_saida_extra: null,
        horas_normais: 0, horas_extras: 0, horas_noturnas: 0,
        atraso_minutos: 0, tipo_excecao: "folga",
        corrigido_manualmente: registro.corrigido_manualmente || false,
        obs: registro.obs || null,
        jornada_alt_entrada: registro.jornada_alt_entrada || null,
        jornada_alt_saida: registro.jornada_alt_saida || null,
      };
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
      horas_extras: 0,
      horas_noturnas: 0,
      atraso_minutos: jornadaMinutos,
      tipo_excecao: "falta",
      corrigido_manualmente: registro.corrigido_manualmente || false,
      obs: registro.obs || null,
      jornada_alt_entrada: registro.jornada_alt_entrada || null,
      jornada_alt_saida: registro.jornada_alt_saida || null,
    };
  }

  // Durações reais por período (suporta turnos noturnos)
  const periodMinutes = (a: number | null, b: number | null): number => {
    if (a === null || b === null) return 0;
    let dur = b - a;
    if (dur < 0) dur += 24 * 60;
    return dur;
  };
  let minutosP1 = periodMinutes(me, ms);
  let minutosP2 = periodMinutes(te, ts);
  const minutosP3 = periodMinutes(ee, es);

  // Sem batidas de almoço: tratar entrada→saída como bloco único
  const semAlmoco = ms === null && te === null && me !== null && ts !== null;
  if (semAlmoco) {
    minutosP1 = periodMinutes(me, ts);
    minutosP2 = 0;
  }

  // Adicional noturno (mesmo em fim-de-semana)
  let nightMinutes = 0;
  if (semAlmoco) {
    nightMinutes += calcNightMinutes(me, ts);
  } else {
    nightMinutes += calcNightMinutes(me, ms);
    nightMinutes += calcNightMinutes(te, ts);
  }
  nightMinutes += calcNightMinutes(ee, es);

  // Fim-de-semana / feriado: tudo vira HE; sem cálculo per-batida
  if (!ehDiaUtil) {
    // Para casos com apenas entrada+saidaTarde (sem almoço), calcular janela total
    const inicios = [me, te, ee].filter((v): v is number => v !== null);
    const fins = [ms, ts, es].filter((v): v is number => v !== null);
    let trabalhadoMin = minutosP1 + minutosP2 + minutosP3;
    if (trabalhadoMin === 0 && inicios.length && fins.length) {
      const ini = Math.min(...inicios);
      let fim = Math.max(...fins);
      if (fim < ini) fim += 24 * 60;
      trabalhadoMin = fim - ini;
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
      horas_extras: Math.round((trabalhadoMin / 60) * 100) / 100,
      horas_noturnas: Math.round((nightMinutes / 60) * 100) / 100,
      atraso_minutos: 0,
      tipo_excecao: null,
      corrigido_manualmente: registro.corrigido_manualmente || false,
      obs: registro.obs || null,
      jornada_alt_entrada: registro.jornada_alt_entrada || null,
      jornada_alt_saida: registro.jornada_alt_saida || null,
    };
  }

  // === Cálculo per-batida (dia útil) ===
  // HE per-batida
  let heMin = 0;
  if (me !== null) {
    let diff = entradaRef - me;
    if (diff > 12 * 60) diff -= 24 * 60; // entrada na madrugada vs ref de manhã
    if (diff < -12 * 60) diff += 24 * 60;
    heMin += Math.max(0, diff);
  }
  if (ms !== null && te !== null) {
    const almocoReal = periodMinutes(ms, te);
    heMin += Math.max(0, almocoRef - almocoReal);
  }
  if (ts !== null) {
    let diff = ts - saidaRef;
    if (diff < -12 * 60) diff += 24 * 60;
    if (diff > 12 * 60) diff -= 24 * 60;
    heMin += Math.max(0, diff);
  }
  // Período extra inteiro entra como HE
  heMin += minutosP3;

  // Atraso per-batida
  let atrasoMin = 0;
  if (me !== null) {
    let diff = me - entradaRef;
    if (diff > 12 * 60) diff -= 24 * 60;
    if (diff < -12 * 60) diff += 24 * 60;
    atrasoMin += Math.max(0, diff);
  }
  if (ms !== null && te !== null) {
    const almocoReal = periodMinutes(ms, te);
    atrasoMin += Math.max(0, almocoReal - almocoRef);
  }
  if (ts !== null) {
    let diff = saidaRef - ts;
    if (diff < -12 * 60) diff += 24 * 60;
    if (diff > 12 * 60) diff -= 24 * 60;
    atrasoMin += Math.max(0, diff);
  }

  // Horas normais = carga - atraso (limitado ao trabalhado real e à carga)
  const trabalhadoTotalMin = minutosP1 + minutosP2 + minutosP3;
  let horasNormaisMin = Math.max(0, jornadaMinutos - atrasoMin);
  horasNormaisMin = Math.min(horasNormaisMin, trabalhadoTotalMin);

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
    horas_normais: Math.round((horasNormaisMin / 60) * 100) / 100,
    horas_extras: Math.round((heMin / 60) * 100) / 100,
    horas_noturnas: Math.round((nightMinutes / 60) * 100) / 100,
    atraso_minutos: Math.round(atrasoMin),
    tipo_excecao,
    corrigido_manualmente: registro.corrigido_manualmente || false,
    obs: registro.obs || null,
    jornada_alt_entrada: registro.jornada_alt_entrada || null,
    jornada_alt_saida: registro.jornada_alt_saida || null,
  };
}

export function calcularResumo(registros: RegistroPonto[]): ResumoCalculo {
  let dias = 0,
    totalH = 0,
    extras = 0,
    atraso = 0,
    noturnas = 0,
    faltas = 0;

  for (const r of registros) {
    const total = r.horas_normais + r.horas_extras;
    if (total > 0) {
      dias++;
      totalH += total;
      extras += r.horas_extras;
      noturnas += r.horas_noturnas;
    }
    if (r.tipo_excecao !== "falta") {
      atraso += r.atraso_minutos || 0;
    } else {
      faltas += 1;
    }
  }

  const extrasMin = Math.round(extras * 60);
  const saldo = (extrasMin - atraso) / 60;
  const noturnasMin = noturnas * 60;
  const anClt = calcAdicionalNoturnoCLT(noturnasMin) / 60;

  return {
    dias_trabalhados: dias,
    total_horas: Math.round(totalH * 100) / 100,
    total_extras: Math.round(extras * 100) / 100,
    total_atraso: atraso,
    total_noturnas: Math.round(noturnas * 100) / 100,
    total_an_clt: Math.round(anClt * 100) / 100,
    total_faltas: faltas,
    saldo: Math.round(saldo * 100) / 100,
  };
}

