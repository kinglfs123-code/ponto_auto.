import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Route to navigate to when there is no browser history (e.g., user opened the URL directly). */
  fallback: string;
  /** Optional label override. Defaults to "Voltar". */
  label?: string;
  className?: string;
}

/**
 * Standard back button used across all internal pages.
 * Uses browser history when possible (navigate(-1)); otherwise navigates to the provided fallback.
 */
export function BackButton({ fallback, label = "Voltar", className }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // window.history.length is 1 when the tab was opened directly on this URL
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn("gap-2 -ml-2", className)}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}


