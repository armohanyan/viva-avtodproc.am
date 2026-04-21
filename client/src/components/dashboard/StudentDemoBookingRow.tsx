import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Clock } from "lucide-react";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { formatBookingSlotRangeLabel, type StudentDemoBooking } from "src/data/studentDemoBookings";

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

function dayBoxParts(dateIso: string, locale: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  const month = d.toLocaleDateString(locale, { month: "short" });
  const day = d.getDate();
  return { month, day: String(day) };
}

function fullDateLabel(dateIso: string, locale: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(booking: StudentDemoBooking, t: (k: TranslationKey) => string) {
  if (
    booking.cancellationRequestedAt &&
    (booking.status === "confirmed" || booking.status === "pending")
  ) {
    return t("bookingStatusCancellationPendingLabel");
  }
  switch (booking.status) {
    case "confirmed":
      return t("confirmed");
    case "pending":
      return t("pending");
    case "cancelled":
      return t("cancelled");
    case "refunded":
      return t("refunded");
  }
}

function statusBadgeClass(booking: StudentDemoBooking) {
  if (
    booking.cancellationRequestedAt &&
    (booking.status === "confirmed" || booking.status === "pending")
  ) {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100";
  }
  const status = booking.status;
  if (status === "confirmed") return "bg-primary/10 text-primary";
  if (status === "pending") return "bg-accent text-muted-foreground";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "refunded") return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return "bg-accent text-muted-foreground";
}

type Props = {
  booking: StudentDemoBooking;
  /** Dashboard home: compact calendar-style date cell */
  variant?: "dashboard" | "bookings";
};

export default function StudentDemoBookingRow({ booking, variant = "bookings" }: Props) {
  const { t, lang } = useLang();
  const locale = localeFromLang(lang);
  const { month, day } = dayBoxParts(booking.dateIso, locale);
  const dateLine = fullDateLabel(booking.dateIso, locale);

  return (
    <Card className="p-4 border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          {variant === "dashboard" ? (
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary leading-none">{month}</span>
              <span className="text-sm font-bold text-primary leading-tight mt-0.5">{day}</span>
            </div>
          ) : null}
          <div className="min-w-0">
            {variant === "bookings" ? (
              <p className="text-xs text-muted-foreground">{dateLine}</p>
            ) : null}
            <p className={`font-medium text-foreground text-sm truncate ${variant === "bookings" ? "mt-0.5" : ""}`}>
              {booking.instructor}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {formatBookingSlotRangeLabel(booking.time, booking.endTime)}
                {booking.totalPriceAmd != null && booking.totalPriceAmd > 0 ? (
                  <span className="text-muted-foreground/80"> · {booking.totalPriceAmd.toLocaleString()} ֏</span>
                ) : null}
              </span>
              <Badge variant="secondary" className="text-xs px-2 py-0 bg-accent text-foreground">
                {t(booking.lessonTypeKey)}
              </Badge>
            </div>
          </div>
        </div>
        <Badge className={`text-xs shrink-0 ${statusBadgeClass(booking)}`}>{statusLabel(booking, t)}</Badge>
      </div>
    </Card>
  );
}
