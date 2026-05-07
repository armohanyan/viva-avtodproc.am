import { useMemo } from "react";
import { Link } from "wouter";
import { CalendarDays } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { partitionStudentBookings } from "src/data/studentDemoBookings";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import StudentDemoBookingRow from "src/components/dashboard/StudentDemoBookingRow";

export default function DashboardLessons() {
  const { t } = useLang();
  const { user } = useAccount();
  const studentId = user?.accountType === "student" ? user.id : undefined;
  const { bookings, loading } = useStudentBookings(studentId);
  const {
    practicalCreditsRemaining,
    theoryLessonsRemaining,
    hasTheoryFromPackage,
    entitlementsLoading,
    entitlementsError,
  } = useStudentEntitlements();

  const { upcoming, past } = useMemo(() => partitionStudentBookings(bookings), [bookings]);

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-6"
        icon={CalendarDays}
        title={t("dashboardLessonsTitle")}
        subtitle={t("dashboardLessonsSubtitle")}
      />

      {entitlementsError ? (
        <p className="text-sm text-destructive mb-4" role="alert">
          {entitlementsError}
        </p>
      ) : null}

      <Card className="p-4 sm:p-5 border-border max-w-4xl mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">{t("dashboardLessonsCreditsSummary")}</h2>
        {entitlementsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
            <div className="rounded-lg bg-accent/40 p-3">
              <dt>{t("dashboardLessonsPracticalCredits")}</dt>
              <dd className="text-lg font-semibold text-foreground tabular-nums mt-1">{practicalCreditsRemaining}</dd>
            </div>
            <div className="rounded-lg bg-accent/40 p-3">
              <dt>{t("dashboardLessonsTheoryCredits")}</dt>
              <dd className="text-lg font-semibold text-foreground tabular-nums mt-1">
                {hasTheoryFromPackage ? theoryLessonsRemaining : "—"}
              </dd>
            </div>
          </dl>
        )}
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/bookings/practical">{t("dashboardLessonsBookPractical")}</Link>
          </Button>
        </div>
      </Card>

      <div className="max-w-4xl space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("dashboardLessonsUpcoming")}</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : upcoming.length === 0 ? (
            <Card className="p-4 border-border text-sm text-muted-foreground">{t("dashboardLessonsNoUpcoming")}</Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map((b) => (
                <StudentDemoBookingRow key={b.id} booking={b} variant="dashboard" />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("dashboardLessonsPast")}</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : past.length === 0 ? (
            <Card className="p-4 border-border text-sm text-muted-foreground">{t("dashboardLessonsNoPast")}</Card>
          ) : (
            <div className="space-y-2">
              {past.map((b) => (
                <StudentDemoBookingRow key={b.id} booking={b} variant="dashboard" />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
