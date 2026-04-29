import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Info } from "lucide-react";

/** Explains practical-lesson cancellation: ≥24h office refund path vs &lt;24h no refund. */
export function BookingCancellationPolicyCallout({
  bookingType = "practical",
}: {
  bookingType?: "practical" | "theory_personal";
}) {
  const { t } = useLang();
  const titleKey = bookingType === "theory_personal" ? "bookingTheoryPolicyTitle" : "bookingCancellationPolicyTitle";
  const bodyKey = bookingType === "theory_personal" ? "bookingTheoryPolicyBody" : "bookingCancellationPolicyBody";
  return (
    <Card className="border-border bg-muted/25 overflow-hidden">
      <div className="flex gap-3 p-4">
        <div className="shrink-0 mt-0.5 text-primary">
          <Info className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground leading-snug">{t(titleKey)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
        </div>
      </div>
    </Card>
  );
}
