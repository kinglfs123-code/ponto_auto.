// OCR utilities: validation, preprocessing config, confidence

/** Confidence thresholds and color mapping */
const CONFIDENCE_CONFIG = {
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

type ConfidenceLevel = "high" | "medium" | "low";

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
const PREPROCESS_CONFIG = {
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
