import type { StudentDemoBooking } from "src/data/studentDemoBookings";
import type { TranslationKey } from "src/lib/i18n";

export function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

export function fullDateLabel(dateIso: string, locale: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function formatTimeRange(time: string, endTime: string | null | undefined) {
  if (endTime == null || endTime === "") return time;
  return `${time}–${endTime}`;
}

export function statusLabel(booking: StudentDemoBooking, t: (k: TranslationKey) => string) {
  if (
    booking.cancellationRequestedAt &&
    (booking.status === "confirmed" || booking.status === "pending" || booking.status === "pending_payment")
  ) {
    return t("bookingStatusCancellationPendingLabel");
  }
  switch (booking.status) {
    case "confirmed":
      return t("confirmed");
    case "pending":
      return t("pending");
    case "pending_payment":
      return t("pending_payment");
    case "cancelled":
      return t("cancelled");
    case "refunded":
      return t("refunded");
  }
}

export function statusExplainKey(booking: StudentDemoBooking): TranslationKey {
  if (
    booking.cancellationRequestedAt &&
    (booking.status === "confirmed" || booking.status === "pending" || booking.status === "pending_payment")
  ) {
    return "bookingStatusExplainCancellationPending";
  }
  switch (booking.status) {
    case "confirmed":
      return "bookingStatusExplainConfirmed";
    case "pending":
      return "bookingStatusExplainPending";
    case "pending_payment":
      return booking.paymentRequiredNow ? "bookingStatusExplainPendingPaymentDue" : "bookingStatusExplainPendingPaymentReserved";
    case "cancelled":
      return "bookingStatusExplainCancelled";
    case "refunded":
      return "bookingStatusExplainRefunded";
  }
}

export function statusBadgeClass(booking: StudentDemoBooking) {
  if (
    booking.cancellationRequestedAt &&
    (booking.status === "confirmed" || booking.status === "pending" || booking.status === "pending_payment")
  ) {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100";
  }
  const status = booking.status;
  if (status === "confirmed") return "bg-primary/10 text-primary";
  if (status === "pending" || status === "pending_payment") return "bg-accent text-muted-foreground";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "refunded") return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return "bg-accent text-muted-foreground";
}

export function studentUpcomingRowShowsActions(b: StudentDemoBooking, todayIso: string): boolean {
  return (b.status === "pending" || b.status === "pending_payment" || b.status === "confirmed") && b.dateIso >= todayIso;
}

export type StudentBookingCancelResponse =
  | { outcome: "pending_admin"; cancellationRequestedAt: string }
  | { outcome: "immediate"; status: string; refundIssued: boolean };
