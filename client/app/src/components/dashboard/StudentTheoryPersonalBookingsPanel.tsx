import { useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { cn } from "src/lib/utils";
import { partitionStudentBookings } from "src/data/studentDemoBookings";
import type { StudentDemoBooking } from "src/data/studentDemoBookings";
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
import { StudentBookingCancelDialog } from "src/components/dashboard/StudentBookingCancelDialog";

export default function StudentTheoryPersonalBookingsPanel() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const { bookings, loading, refresh } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const { refreshEntitlements } = useStudentEntitlements();
  const locale = localeFromLang(lang);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StudentDemoBooking | null>(null);

  const theoryUpcoming = useMemo(() => {
    const { upcoming } = partitionStudentBookings(bookings);
    return upcoming.filter((b) => b.lessonTypeKey === "lessonTypeTheoryPersonal");
  }, [bookings]);

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

  if (!loading && theoryUpcoming.length === 0) {
    return null;
  }

  return (
    <Reveal delay={0.03}>
      <StudentBookingCancelDialog
        booking={cancelTarget}
        locale={locale}
        busy={cancelTarget != null && busyId === cancelTarget.id}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={() => void confirmCancelBooking()}
      />

      <h2 className="text-base font-semibold text-foreground mb-1">{t("bookingsTheoryPersonalLessonsTitle")}</h2>
      <p className="text-sm text-muted-foreground mb-3">{t("bookingsTheoryPersonalLessonsHint")}</p>

      <Card className="border-border overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                  {t("bookingsTableColDate")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                  {t("bookingsTableColTime")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[8rem]">
                  {t("bookingsTableColInstructor")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[10rem]">
                  {t("bookingsTableColStatus")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground text-right whitespace-nowrap">
                  {t("bookingsTableColActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : (
                theoryUpcoming.map((b) => (
                  <tr key={String(b.id)} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    <td className="py-3 px-4 text-foreground whitespace-nowrap">{fullDateLabel(b.dateIso, locale)}</td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatTimeRange(b.time, b.endTime)}
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">{b.instructor}</td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex flex-col gap-1 max-w-[14rem]">
                        <Badge className={cn("text-xs font-normal w-fit", statusBadgeClass(b))}>
                          {statusLabel(b, t)}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground leading-snug">{t(statusExplainKey(b))}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                      {studentUpcomingRowShowsActions(b, todayIso) ? (
                        b.cancellationRequestedAt ? (
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
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Reveal>
  );
}
