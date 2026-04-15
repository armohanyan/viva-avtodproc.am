import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import DashboardBookingsSubnav from "src/components/dashboard/DashboardBookingsSubnav";
import StudentDemoBookingRow from "src/components/dashboard/StudentDemoBookingRow";
import { useLang } from "src/lib/i18n";
import { partitionStudentBookings } from "src/data/studentDemoBookings";
import { CalendarDays, CalendarClock, ShoppingBag, ArrowRight } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Link } from "wouter";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import StudentRateInstructorsPanel from "src/components/dashboard/StudentRateInstructorsPanel";

export default function DashboardBookings() {
  const { t } = useLang();
  const { user } = useAccount();
  const { bookings } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const { practicalCreditsRemaining, packagePracticalRemaining, extraPracticalRemaining } = useStudentEntitlements();
  const { upcoming, past } = partitionStudentBookings(bookings);

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader
          icon={CalendarDays}
          title={t("bookings")}
          subtitle={t("bookingsOverviewSubtitle")}
          actions={
            <Link href="/dashboard/purchases">
              <Button type="button" variant="outline" size="sm" className="border-input">
                {t("bookingsViewMyServices")}
              </Button>
            </Link>
          }
        />
      </Reveal>

      <Reveal delay={0.04}>
        <DashboardBookingsSubnav active="overview" />
      </Reveal>

      <Reveal delay={0.06}>
        <Card className="p-4 sm:p-5 border-border mb-6">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("bookingsCreditsSummary")}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{practicalCreditsRemaining}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("bookingsCreditsPackagePart")}: {packagePracticalRemaining} · {t("bookingsCreditsExtraPart")}: {extraPracticalRemaining}
          </p>
        </Card>
      </Reveal>

      <Reveal delay={0.07}>
        <StudentRateInstructorsPanel studentUserId={user?.accountType === "student" ? user.id : undefined} />
      </Reveal>

      <Reveal delay={0.08}>
        <h2 className="text-sm font-semibold text-foreground mb-3">{t("bookingsQuickActionsTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Link href="/dashboard/bookings/practical">
            <Card className="p-4 h-full border-border hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarClock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{t("bookingsActionPracticalTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("bookingsActionPracticalSub")}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-primary shrink-0 opacity-70 group-hover:opacity-100" />
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/bookings/package">
            <Card className="p-4 h-full border-border hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{t("bookingsActionPackageTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("bookingsActionPackageSub")}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-primary shrink-0 opacity-70 group-hover:opacity-100" />
              </div>
            </Card>
          </Link>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <h2 className="text-base font-semibold text-foreground mb-4">{t("bookingsMyBookingsTitle")}</h2>
        <div className="space-y-8">
          <section aria-labelledby="bookings-upcoming-heading">
            <h3 id="bookings-upcoming-heading" className="text-sm font-medium text-muted-foreground mb-3">
              {t("bookingsSectionUpcoming")}
            </h3>
            {upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <StudentDemoBookingRow key={b.id} booking={b} variant="bookings" />
                ))}
              </div>
            ) : (
              <Card className="p-5 border-border text-sm text-muted-foreground">{t("noUpcoming")}</Card>
            )}
          </section>

          {past.length > 0 ? (
            <section className="pt-2 border-t border-border" aria-labelledby="bookings-past-heading">
              <h3 id="bookings-past-heading" className="text-sm font-medium text-muted-foreground mb-3">
                {t("bookingsSectionPast")}
              </h3>
              <div className="space-y-3">
                {past.map((b) => (
                  <StudentDemoBookingRow key={b.id} booking={b} variant="bookings" />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </Reveal>
    </DashboardLayout>
  );
}
