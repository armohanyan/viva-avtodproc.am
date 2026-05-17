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
import { SimulatedAcbaPosDialog } from "src/components/booking/SimulatedAcbaPosDialog";
import { BookingCancellationPolicyCallout } from "src/components/booking/BookingCancellationPolicyCallout";
import { StudentBookingCancelDialog } from "src/components/dashboard/StudentBookingCancelDialog";
import {
  formatTimeRange,
  fullDateLabel,
  localeFromLang,
  statusBadgeClass,
  statusExplainKey,
  statusLabel,
  studentUpcomingRowShowsActions,
  type StudentBookingCancelResponse,
} from "src/components/dashboard/studentBookingDisplay";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";

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
      const data = await vivaApiJson<StudentBookingCancelResponse>(
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
      <StudentBookingCancelDialog
        booking={cancelTarget}
        locale={locale}
        busy={cancelTarget != null && busyId === cancelTarget.id}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={() => void confirmCancelBooking()}
      />

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
