import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensitiveTextProps {
  /** Valor real (mostrado quando revelado) */
  value: string;
  /** Versão mascarada (mostrada por padrão). Se ausente, mostra "•" repetidos. */
  masked?: string;
  /** Tempo em ms até voltar a ocultar automaticamente. 0 = não esconde. */
  revealMs?: number;
  className?: string;
  /** Tamanho do ícone em px */
  iconSize?: number;
  ariaLabel?: string;
}

export function SensitiveText({
  value,
  masked,
  revealMs = 5000,
  className,
  iconSize = 14,
  ariaLabel = "Mostrar/ocultar valor sensível",
}: SensitiveTextProps) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (revealed) {
      setRevealed(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }
    setRevealed(true);
    if (revealMs > 0) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setRevealed(false), revealMs);
    }
  };

  const display = revealed ? value : masked ?? "•".repeat(Math.max(4, value.length));

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={revealed ? "" : "tracking-wider"}>{display}</span>
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        aria-pressed={revealed}
        className="text-muted-foreground/70 hover:text-foreground transition-colors btn-press rounded-md p-0.5"
      >
        {revealed ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </button>
    </span>
  );
}


