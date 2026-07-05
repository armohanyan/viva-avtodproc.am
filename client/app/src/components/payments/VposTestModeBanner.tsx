import { AlertTriangle } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { useVposCheckout } from "src/modules/payments/useVposCheckout";
import { cn } from "src/lib/utils";

type Props = {
  className?: string;
};

/** Visible when ACBA test EPG is active — reminds staff/students that cards are not charged for real. */
export function VposTestModeBanner({ className }: Props) {
  const { t } = useLang();
  const { config, configLoading } = useVposCheckout();

  if (configLoading || !config?.testMode || config.simulated) {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <p>{t("vposTestModeBanner")}</p>
    </div>
  );
}
