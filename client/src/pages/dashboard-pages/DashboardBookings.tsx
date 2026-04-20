import { useLang, type TranslationKey } from "src/lib/i18n";
import { partitionStudentBookings, type StudentDemoBooking, type StudentDemoBookingStatus } from "src/data/studentDemoBookings";
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
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";

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

function statusExplainKey(status: StudentDemoBookingStatus): TranslationKey {
  switch (status) {
    case "confirmed":
      return "bookingStatusExplainConfirmed";
    case "pending":
      return "bookingStatusExplainPending";
    case "cancelled":
      return "bookingStatusExplainCancelled";
    case "refunded":
      return "bookingStatusExplainRefunded";
  }
}

function statusBadgeClass(status: StudentDemoBookingStatus) {
  if (status === "confirmed") return "bg-primary/10 text-primary";
  if (status === "pending") return "bg-accent text-muted-foreground";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "refunded") return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return "bg-accent text-muted-foreground";
}

function practicalUpcomingActions(b: StudentDemoBooking): boolean {
  return b.lessonTypeKey === "lessonTypePractical" && (b.status === "pending" || b.status === "confirmed");
}

export function DashboardBookingsListTab() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const { bookings, loading, refresh } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const locale = localeFromLang(lang);
  const { upcoming, past } = useMemo(() => partitionStudentBookings(bookings), [bookings]);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StudentDemoBooking | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    const b = cancelTarget;
    setBusyId(b.id);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(b.id))}/cancel-student`, { method: "POST" });
      showToast(t("bookingsCancelSuccessToast"), "success");
      setCancelTarget(null);
      await refresh();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const onCompletePayment = async (b: StudentDemoBooking) => {
    setBusyId(b.id);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(b.id))}/complete-payment`, { method: "POST" });
      showToast(t("bookingPaymentCompletedToast"), "success");
      await refresh();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
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
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("bookingsCancelDialogTitle")}</DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-1">
              <span className="block">{t("bookingsCancelConfirmBody")}</span>
              {cancelTarget ? (
                <span className="block text-foreground text-sm font-medium">
                  {fullDateLabel(cancelTarget.dateIso, locale)} · {formatTimeRange(cancelTarget.time, cancelTarget.endTime)}{" "}
                  · {cancelTarget.instructor}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              {t("bookingsCancelDialogDismiss")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelTarget != null && busyId === cancelTarget.id}
              onClick={() => void confirmCancelBooking()}
            >
              {cancelTarget != null && busyId === cancelTarget.id ? t("loading") : t("bookingsCancelDialogConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Reveal delay={0.05}>
        <h2 className="text-base font-semibold text-foreground mb-3">{t("bookingsMyBookingsTitle")}</h2>
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
                            <Badge className={cn("text-xs font-normal w-fit", statusBadgeClass(b.status))}>
                              {statusLabel(b, t)}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground leading-snug">{t(statusExplainKey(b.status))}</p>
                            {b.status === "pending" && b.lessonTypeKey === "lessonTypePractical" && holdActive(b) ? (
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
                          {practicalUpcomingActions(b) && b.dateIso >= todayIso ? (
                            <div className="flex flex-col items-end gap-1.5">
                              {b.status === "pending" && holdActive(b) ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8 text-xs"
                                  disabled={busyId === b.id}
                                  onClick={() => void onCompletePayment(b)}
                                >
                                  {busyId === b.id ? t("loading") : t("bookingCompletePaymentCta")}
                                </Button>
                              ) : null}
                              {b.status === "pending" && holdActive(b) &&
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
                              {b.status === "pending" && !holdActive(b) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs max-w-[11rem]"
                                  disabled={busyId === b.id}
                                  title={t("bookingStartPaymentWindowHint")}
                                  onClick={() => void onStartPayment(b)}
                                >
                                  {busyId === b.id ? t("loading") : t("bookingStartPaymentWindowCtaShort")}
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive hover:text-destructive"
                                disabled={busyId === b.id}
                                onClick={() => setCancelTarget(b)}
                              >
                                {t("bookingsCancelCta")}
                              </Button>
                              <Link
                                href="/dashboard/bookings/practical"
                                className="text-[11px] text-primary hover:underline text-right"
                                title={t("bookingsActionsOpenPracticalCalendar")}
                              >
                                {t("bookingsActionsOpenPracticalCalendar")}
                              </Link>
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
                            <Badge className={cn("text-xs font-normal w-fit", statusBadgeClass(b.status))}>
                              {statusLabel(b, t)}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground leading-snug">{t(statusExplainKey(b.status))}</p>
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
