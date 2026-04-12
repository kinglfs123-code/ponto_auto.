// OCR utilities: auto-correction, validation, preprocessing config

/** Auto-correction rules for common OCR misreads */
const AUTO_CORRECTION_RULES: Array<{
  pattern: RegExp;
  replacement: string;
  description: string;
}> = [
  { pattern: /O/g, replacement: "0", description: "Letra O → zero" },
  { pattern: /l(?=\d)/g, replacement: "1", description: "Letra l → um" },
  { pattern: /I(?=\d)/g, replacement: "1", description: "Letra I → um" },
  { pattern: /S(?=\d)/g, replacement: "5", description: "Letra S → cinco" },
  { pattern: /\./g, replacement: ":", description: "Ponto → dois pontos" },
];

/** Apply auto-correction to a time string */
export function autoCorrectTime(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let corrected = raw.trim();

  for (const rule of AUTO_CORRECTION_RULES) {
    corrected = corrected.replace(rule.pattern, rule.replacement);
  }

  // Add leading zero if needed (e.g., "8:00" → "08:00")
  if (/^\d:\d{2}$/.test(corrected)) {
    corrected = "0" + corrected;
  }

  return corrected;
}

/** Validate HH:MM format */
export const HORARIO_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(time: string | null | undefined): boolean {
  if (!time) return false;
  return HORARIO_REGEX.test(time);
}

/** Confidence thresholds and color mapping */
export const CONFIDENCE_CONFIG = {
  thresholds: { high: 90, medium: 70, low: 0 },
  colors: {
    high: "hsl(var(--success))",
    medium: "hsl(var(--warning))",
    low: "hsl(var(--destructive))",
  },
  classes: {
    high: "text-[hsl(var(--success))]",
    medium: "text-[hsl(var(--warning))]",
    low: "text-destructive",
  },
  bgClasses: {
    high: "",
    medium: "bg-[hsl(var(--warning)/0.08)]",
    low: "bg-destructive/10",
  },
} as const;

export type ConfidenceLevel = "high" | "medium" | "low";

/** Get confidence level from a numeric score (0-100) or string */
export function getConfidenceLevel(confidence: number | string | undefined): ConfidenceLevel {
  if (typeof confidence === "string") {
    if (confidence === "alta") return "high";
    if (confidence === "baixa") return "low";
    const n = parseInt(confidence);
    if (!isNaN(n)) return getConfidenceLevel(n);
    return "medium";
  }
  if (typeof confidence !== "number") return "medium";
  if (confidence >= CONFIDENCE_CONFIG.thresholds.high) return "high";
  if (confidence >= CONFIDENCE_CONFIG.thresholds.medium) return "medium";
  return "low";
}

/** Preprocessing configuration */
export const PREPROCESS_CONFIG = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.9,
  format: "image/jpeg" as const,
  contrast: 1.2,
  brightness: 5,
};

/** Enhanced image preprocessing with configurable params */
export function preprocessImage(
  dataUrl: string,
  config = PREPROCESS_CONFIG
): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error("Imagem inválida"));
    img.onload = () => {
      const scaleW = Math.min(1, config.maxWidth / img.width);
      const scaleH = Math.min(1, config.maxHeight / img.height);
      const sc = Math.min(scaleW, scaleH);
      const w = Math.round(img.width * sc);
      const h = Math.round(img.height * sc);

      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      // Contrast boost
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, (d[i] - 128) * config.contrast + 128 + config.brightness));
        d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * config.contrast + 128 + config.brightness));
        d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * config.contrast + 128 + config.brightness));
      }
      ctx.putImageData(imageData, 0, 0);

      res(c.toDataURL(config.format, config.quality));
    };
    img.src = dataUrl;
  });
}

/** Validate and auto-correct an array of OCR time records */
export function autoCorrectRegistros(
  registros: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const timeFields = ["me", "ms", "te", "ts", "ee", "es"];
  return registros.map((reg) => {
    const corrected = { ...reg };
    for (const field of timeFields) {
      const val = corrected[field] as string | null;
      if (val) {
        corrected[field] = autoCorrectTime(val);
      }
    }
    return corrected;
  });
}
