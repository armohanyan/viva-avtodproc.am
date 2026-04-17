import { useLang, type TranslationKey } from "src/lib/i18n";
import { partitionStudentBookings, type StudentDemoBooking, type StudentDemoBookingStatus } from "src/data/studentDemoBookings";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import StudentRateInstructorsPanel from "src/components/dashboard/StudentRateInstructorsPanel";
import { useMemo } from "react";
import { cn } from "src/lib/utils";

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

function statusBadgeClass(status: StudentDemoBookingStatus) {
  if (status === "confirmed") return "bg-primary/10 text-primary";
  if (status === "pending") return "bg-accent text-muted-foreground";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "refunded") return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return "bg-accent text-muted-foreground";
}

export function DashboardBookingsListTab() {
  const { t, lang } = useLang();
  const { user } = useAccount();
  const { bookings, loading } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const locale = localeFromLang(lang);
  const { upcoming, past } = useMemo(() => partitionStudentBookings(bookings), [bookings]);

  return (
    <>
      <Reveal delay={0.05}>
        <h2 className="text-base font-semibold text-foreground mb-3">{t("bookingsMyBookingsTitle")}</h2>
        <Card className="border-border overflow-hidden">
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
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                    {t("bookingsTableColType")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[8rem]">
                    {t("bookingsTableColInstructor")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                    {t("bookingsTableColStatus")}
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap text-right">
                    {t("bookingsTableColPrice")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-muted-foreground">
                      {t("loading")}
                    </td>
                  </tr>
                ) : null}
                {!loading && upcoming.length === 0 && past.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-muted-foreground">
                      {t("bookingsTableEmpty")}
                    </td>
                  </tr>
                ) : null}
                {!loading && upcoming.length > 0 ? (
                  <>
                    <tr className="bg-muted/50">
                      <td colSpan={6} className="py-2 px-4 text-xs font-semibold text-foreground tracking-wide">
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
                        <td className="py-3 px-4">
                          <Badge className={cn("text-xs font-normal", statusBadgeClass(b.status))}>{statusLabel(b, t)}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                          {b.totalPriceAmd != null && Number.isFinite(b.totalPriceAmd)
                            ? `${b.totalPriceAmd.toLocaleString(locale)} ֏`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : null}
                {!loading && past.length > 0 ? (
                  <>
                    <tr className="bg-muted/50">
                      <td colSpan={6} className="py-2 px-4 text-xs font-semibold text-foreground tracking-wide">
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
                        <td className="py-3 px-4">
                          <Badge className={cn("text-xs font-normal", statusBadgeClass(b.status))}>{statusLabel(b, t)}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                          {b.totalPriceAmd != null && Number.isFinite(b.totalPriceAmd)
                            ? `${b.totalPriceAmd.toLocaleString(locale)} ֏`
                            : "—"}
                        </td>
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
