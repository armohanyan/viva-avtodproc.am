import { useLang, type TranslationKey } from "src/lib/i18n";
import { partitionStudentBookings, type StudentDemoBooking } from "src/data/studentDemoBookings";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import StudentRateInstructorsPanel from "src/components/dashboard/StudentRateInstructorsPanel";
import { useMemo, useState } from "react";
import { cn } from "src/lib/utils";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import { SimulatedAcbaPosDialog } from "src/components/booking/SimulatedAcbaPosDialog";
import { BookingCancellationPolicyCallout } from "src/components/booking/BookingCancellationPolicyCallout";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";

type StudentPracticalCancelResponse =
  | { outcome: "pending_admin"; cancellationRequestedAt: string }
  | { outcome: "immediate"; status: string; refundIssued: boolean };

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

function fullDateLabel(dateIso: string, locale: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTimeRange(time: string, endTime: string | null | undefined) {
  if (endTime == null || endTime === "") return time;
  return `${time}–${endTime}`;
}

function statusLabel(booking: StudentDemoBooking, t: (k: TranslationKey) => string) {
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

function statusExplainKey(booking: StudentDemoBooking): TranslationKey {
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

function statusBadgeClass(booking: StudentDemoBooking) {
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

/** Upcoming rows where the student may cancel or (if applicable) complete payment — matches backend `cancelPracticalStudentBooking` lesson types. */
function studentUpcomingRowShowsActions(b: StudentDemoBooking, todayIso: string): boolean {
  return (b.status === "pending" || b.status === "pending_payment" || b.status === "confirmed") && b.dateIso >= todayIso;
}

function isPracticalLesson(b: StudentDemoBooking): boolean {
  return b.lessonTypeKey === "lessonTypePractical";
}

export function DashboardBookingsListTab() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const { bookings, loading, refresh } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const { refreshEntitlements } = useStudentEntitlements();
  const locale = localeFromLang(lang);
  const { upcoming, past } = useMemo(() => partitionStudentBookings(bookings), [bookings]);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StudentDemoBooking | null>(null);
  const [payPosTarget, setPayPosTarget] = useState<StudentDemoBooking | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    const b = cancelTarget;
    setBusyId(b.id);
    try {
      const data = await vivaApiJson<StudentPracticalCancelResponse>(
        `/bookings/${encodeURIComponent(String(b.id))}/cancel-student`,
        { method: "POST" },
      );
      if (data.outcome === "pending_admin") {
        showToast(t("bookingsCancelRequestSuccessToast"), "success");
      } else {
        showToast(t("bookingsCancelImmediateSuccessToast"), "success");
      }
      setCancelTarget(null);
      await refresh();
      await refreshEntitlements();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const completePaymentFor = async (b: StudentDemoBooking): Promise<boolean> => {
    setBusyId(b.id);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(b.id))}/complete-payment`, { method: "POST" });
      showToast(t("bookingPaymentCompletedToast"), "success");
      await refresh();
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const onStartPayment = async (b: StudentDemoBooking) => {
    setBusyId(b.id);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(b.id))}/start-payment-window`, { method: "POST" });
      showToast(t("bookingPaymentWindowStartedToast"), "success");
      await refresh();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const onExtendHold = async (b: StudentDemoBooking) => {
    setBusyId(b.id);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(b.id))}/extend-payment-hold`, { method: "POST" });
      showToast(t("bookingPaymentExtendedToast"), "success");
      await refresh();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const holdActive =
    (b: StudentDemoBooking) =>
      typeof b.holdExpiresAt === "string" &&
      b.holdExpiresAt.length > 0 &&
      new Date(b.holdExpiresAt).getTime() > Date.now();

  const colSpan = 7;

  return (
    <>
      <SimulatedAcbaPosDialog
        open={payPosTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPayPosTarget(null);
        }}
        amountAmd={payPosTarget?.totalPriceAmd ?? null}
        locale={locale}
        busy={payPosTarget != null && busyId === payPosTarget.id}
        onApprove={async () => {
          if (!payPosTarget) return false;
          return completePaymentFor(payPosTarget);
        }}
      />
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent
          showCloseButton
          className={cn(
            "gap-0 overflow-hidden p-0 sm:max-w-md",
            "w-[min(100%,calc(100vw-1.5rem))] max-h-[min(90dvh,40rem)]",
            "border-border bg-card text-card-foreground shadow-xl",
            "rounded-xl",
          )}
        >
          <div
            className={cn(
              "border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent",
              "px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6",
            )}
          >
            <DialogHeader className="space-y-0 text-left sm:text-left">
              <DialogTitle className="text-balance pr-10 text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {t("bookingsCancelDialogTitle")}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription asChild>
              <div className="mt-4 space-y-4 text-left text-sm leading-relaxed">
                {cancelTarget?.cancelRefundEligible ? (
                  <p className="text-muted-foreground">{t("bookingsCancelAdminPathConfirm")}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="inline-flex w-fit max-w-full items-center rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                      {t("bookingsCancelLateWarningTitle")}
                    </p>
                    <p className="text-muted-foreground">{t("bookingsCancelLateWarningBody")}</p>
                  </div>
                )}
                {cancelTarget ? (
                  <div className="rounded-lg border border-border bg-background/80 p-3 shadow-inner sm:p-4 dark:bg-background/40">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("bookingsTableColDate")} · {t("bookingsTableColTime")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      {fullDateLabel(cancelTarget.dateIso, locale)}
                      <span className="text-muted-foreground"> · </span>
                      {formatTimeRange(cancelTarget.time, cancelTarget.endTime)}
                    </p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("bookingsTableColInstructor")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{cancelTarget.instructor}</p>
                    {typeof cancelTarget.hoursUntilLesson === "number" && cancelTarget.hoursUntilLesson >= 0 ? (
                      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground tabular-nums">
                        {t("bookingsCancelHoursUntilLesson")}: {cancelTarget.hoursUntilLesson.toFixed(1)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2 px-4 py-4 sm:px-6 sm:py-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 h-auto w-full border-border bg-background/80 py-2 whitespace-normal break-words text-center"
              onClick={() => setCancelTarget(null)}
            >
              {t("bookingsCancelDialogDismiss")}
            </Button>
            <Button
              type="button"
              variant={cancelTarget?.cancelRefundEligible ? "default" : "destructive"}
              className={cn(
                "min-h-10 h-auto w-full py-2 shadow-sm whitespace-normal break-words text-center",
                !cancelTarget?.cancelRefundEligible &&
                  "dark:bg-destructive dark:text-white dark:hover:bg-destructive/90 dark:focus-visible:ring-destructive/30",
              )}
              disabled={cancelTarget != null && busyId === cancelTarget.id}
              onClick={() => void confirmCancelBooking()}
            >
              {cancelTarget != null && busyId === cancelTarget.id
                ? t("loading")
                : cancelTarget?.cancelRefundEligible
                  ? t("bookingsCancelDialogConfirmRequest")
                  : t("bookingsCancelDialogConfirmLate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Reveal delay={0.05}>
        <h2 className="text-base font-semibold text-foreground mb-3">{t("bookingsMyBookingsTitle")}</h2>
        <div className="mb-4">
          <BookingCancellationPolicyCallout />
        </div>
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                    {t("bookingsTableColDate")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                    {t("bookingsTableColTime")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                    {t("bookingsTableColType")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[8rem]">
                    {t("bookingsTableColInstructor")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[10rem]">
                    {t("bookingsTableColStatus")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap text-right">
                    {t("bookingsTableColPrice")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap text-right">
                    {t("bookingsTableColActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="py-10 px-4 text-center text-muted-foreground">
                      {t("loading")}
                    </td>
                  </tr>
                ) : null}
                {!loading && upcoming.length === 0 && past.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="py-10 px-4 text-center text-muted-foreground">
                      {t("bookingsTableEmpty")}
                    </td>
                  </tr>
                ) : null}
                {!loading && upcoming.length > 0 ? (
                  <>
                    <tr className="bg-muted/50">
                      <td colSpan={colSpan} className="py-2 px-4 text-xs font-semibold text-foreground tracking-wide">
                        {t("bookingsSectionUpcoming")}
                      </td>
                    </tr>
                    {upcoming.map((b) => (
                      <tr key={String(b.id)} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                        <td className="py-3 px-4 text-foreground whitespace-nowrap">{fullDateLabel(b.dateIso, locale)}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatTimeRange(b.time, b.endTime)}
                        </td>
                        <td className="py-3 px-4 text-foreground">{t(b.lessonTypeKey)}</td>
                        <td className="py-3 px-4 text-foreground max-w-[14rem] truncate" title={b.instructor}>
                          {b.instructor}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-1 max-w-[14rem]">
                            <Badge className={cn("text-xs font-normal w-fit", statusBadgeClass(b))}>
                              {statusLabel(b, t)}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground leading-snug">{t(statusExplainKey(b))}</p>
                            {(b.status === "pending" || b.status === "pending_payment") && holdActive(b) ? (
                              <p className="text-[11px] text-amber-700 dark:text-amber-500 tabular-nums">
                                {t("bookingPaymentRemainingLabel")}:{" "}
                                {new Date(b.holdExpiresAt!).toLocaleString(locale, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground tabular-nums whitespace-nowrap align-top">
                          {b.totalPriceAmd != null && Number.isFinite(b.totalPriceAmd)
                            ? `${b.totalPriceAmd.toLocaleString(locale)} ֏`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                          {studentUpcomingRowShowsActions(b, todayIso) ? (
                            <div className="flex flex-col items-end gap-1.5">
                              {(b.status === "pending" || b.status === "pending_payment") && holdActive(b) ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8 text-xs"
                                  disabled={busyId === b.id}
                                  onClick={() => setPayPosTarget(b)}
                                >
                                  {t("bookingCompletePaymentCta")}
                                </Button>
                              ) : null}
                              {isPracticalLesson(b) &&
                              (b.status === "pending" || b.status === "pending_payment") &&
                              holdActive(b) &&
                              typeof b.holdExpiresAt === "string" &&
                              new Date(b.holdExpiresAt).getTime() - Date.now() > 0 &&
                              new Date(b.holdExpiresAt).getTime() - Date.now() <= 60_000 &&
                              (b.holdExtensionCount ?? 0) < (b.maxHoldExtensions ?? 2) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  disabled={busyId === b.id}
                                  onClick={() => void onExtendHold(b)}
                                >
                                  {busyId === b.id ? t("loading") : t("bookingAddFiveMinutesCta")}
                                </Button>
                              ) : null}
                              {isPracticalLesson(b) &&
                              (b.status === "pending" || b.status === "pending_payment") &&
                              !holdActive(b) ? (
                                <Button
                                  size="sm"
                                  variant={b.paymentRequiredNow ? "default" : "outline"}
                                  className="h-8 text-xs max-w-[11rem]"
                                  disabled={busyId === b.id}
                                  title={t("bookingStartPaymentWindowHint")}
                                  onClick={() => void onStartPayment(b)}
                                >
                                  {busyId === b.id ? t("loading") : t("bookingStartPaymentWindowCtaShort")}
                                </Button>
                              ) : null}
                              {b.cancellationRequestedAt ? (
                                <span className="text-[11px] text-amber-800 dark:text-amber-400 text-right max-w-[11rem] leading-snug whitespace-normal break-words inline-block">
                                  {t("bookingsAwaitingOfficeCancellation")}
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-destructive hover:text-destructive"
                                  disabled={busyId === b.id}
                                  onClick={() => setCancelTarget(b)}
                                >
                                  {t("bookingsCancelCta")}
                                </Button>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : null}
                {!loading && past.length > 0 ? (
                  <>
                    <tr className="bg-muted/50">
                      <td colSpan={colSpan} className="py-2 px-4 text-xs font-semibold text-foreground tracking-wide">
                        {t("bookingsSectionPast")}
                      </td>
                    </tr>
                    {past.map((b) => (
                      <tr key={String(b.id)} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                        <td className="py-3 px-4 text-foreground whitespace-nowrap">{fullDateLabel(b.dateIso, locale)}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatTimeRange(b.time, b.endTime)}
                        </td>
                        <td className="py-3 px-4 text-foreground">{t(b.lessonTypeKey)}</td>
                        <td className="py-3 px-4 text-foreground max-w-[14rem] truncate" title={b.instructor}>
                          {b.instructor}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-1 max-w-[14rem]">
                            <Badge className={cn("text-xs font-normal w-fit", statusBadgeClass(b))}>
                              {statusLabel(b, t)}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground leading-snug">{t(statusExplainKey(b))}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                          {b.totalPriceAmd != null && Number.isFinite(b.totalPriceAmd)
                            ? `${b.totalPriceAmd.toLocaleString(locale)} ֏`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">—</td>
                      </tr>
                    ))}
                  </>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.09}>
        <div className="mt-8">
          <StudentRateInstructorsPanel studentUserId={user?.accountType === "student" ? user.id : undefined} />
        </div>
      </Reveal>
    </>
  );
}
