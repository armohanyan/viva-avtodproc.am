import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Info } from "lucide-react";

/** Explains practical-lesson cancellation: ≥24h office refund path vs &lt;24h no refund. */
export function BookingCancellationPolicyCallout() {
  const { t } = useLang();
  return (
    <Card className="border-border bg-muted/25 overflow-hidden">
      <div className="flex gap-3 p-4">
        <div className="shrink-0 mt-0.5 text-primary">
          <Info className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground leading-snug">{t("bookingCancellationPolicyTitle")}</p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{t("bookingCancellationPolicyBody")}</p>
        </div>
      </div>
    </Card>
  );
}
