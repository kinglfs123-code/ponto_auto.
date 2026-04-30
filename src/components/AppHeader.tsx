import { BackButton } from "@/components/ui/back-button";
import SettingsMenu from "@/components/SettingsMenu";
import ModuleSwitcher, { type ModuleKey } from "@/components/ModuleSwitcher";

interface Props {
  /** Current module — controls the central switcher. Pass null/undefined to hide it (e.g., on /selecionar-empresa). */
  module?: ModuleKey | null;
  /** Show the back button (default true). */
  showBack?: boolean;
  /** Fallback route when there is no browser history. */
  backFallback?: string;
  /** Optional back button label override. */
  backLabel?: string;
  /** Hide the settings menu (rare — defaults to showing it). */
  hideSettings?: boolean;
}

/**
 * Standard top header used across all authenticated screens.
 * Layout: [Back]  [ModuleSwitcher]  [Settings]
 * Sticks to the top with a glass surface to keep iOS 26 aesthetics.
 */
export default function AppHeader({
  module = null,
  showBack = true,
  backFallback = "/selecionar-modulo",
  backLabel,
  hideSettings = false,
}: Props) {
  return (
    <div
      className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-2 backdrop-blur-xl bg-background/70 border-b border-border/40"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {showBack ? (
            <BackButton fallback={backFallback} label={backLabel} />
          ) : (
            <span className="inline-block h-9" aria-hidden />
          )}
        </div>

        <div className="flex-shrink-0">
          {module && <ModuleSwitcher current={module} />}
        </div>

        <div className="flex-1 flex justify-end">
          {!hideSettings && <SettingsMenu />}
        </div>
      </div>
    </div>
  );
}
