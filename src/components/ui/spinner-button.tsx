import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SpinnerButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Botão com spinner integrado e proteção contra duplo-clique.
 * Quando `loading=true`, fica `disabled` e mostra `<Loader2>` + `loadingText` (ou children originais).
 */
export const SpinnerButton = React.forwardRef<HTMLButtonElement, SpinnerButtonProps>(
  ({ loading = false, loadingText, disabled, children, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn("gap-1.5", className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  },
);
SpinnerButton.displayName = "SpinnerButton";
