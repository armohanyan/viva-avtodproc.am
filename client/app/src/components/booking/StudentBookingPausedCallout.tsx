import { Card } from "src/components/ui/card";
import { useLang } from "src/lib/i18n";
import { STUDENT_SELF_SERVICE_BOOKING_ENABLED } from "src/constants/booking.constants";

export function StudentBookingPausedCallout({ className = "" }: { className?: string }) {
  const { t } = useLang();
  if (STUDENT_SELF_SERVICE_BOOKING_ENABLED) return null;
  return (
    <Card
      className={`border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5 ${className}`}
      role="status"
    >
      <p className="text-sm font-semibold text-foreground">{t("studentBookingPausedTitle")}</p>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t("studentBookingPausedBody")}</p>
    </Card>
  );
}
