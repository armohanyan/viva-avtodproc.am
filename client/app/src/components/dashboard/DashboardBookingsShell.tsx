import type { ReactNode } from "react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { CalendarDays } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLocation } from "wouter";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { absWouterHref } from "src/lib/wouterFullPath";
import { STUDENT_SELF_SERVICE_BOOKING_ENABLED } from "src/constants/booking.constants";
import { VposTestModeBanner } from "src/components/payments/VposTestModeBanner";

export type BookingsShellActive = "home" | "package" | "practical" | "theory-personal" | "theory-group";

type Props = {
  active: BookingsShellActive;
  children: ReactNode;
};

function pageTitle(active: BookingsShellActive, t: (k: TranslationKey) => string) {
  if (active === "package") return t("bookingsSubnavPackage");
  if (active === "practical") return t("bookingsSubnavPractical");
  if (active === "theory-personal") return t("bookingsSubnavTheoryPersonal");
  if (active === "theory-group") return t("bookingsSubnavTheoryGroup");
  return t("bookings");
}

function pageSubtitle(active: BookingsShellActive, t: (k: TranslationKey) => string) {
  if (active === "practical") return t("bookingsPracticalPageSubtitle");
  if (active === "theory-personal") return t("bookingsTheoryPersonalPageSubtitle");
  if (active === "theory-group") return t("bookingsTheoryGroupPageSubtitle");
  return undefined;
}

export default function DashboardBookingsShell({ active, children }: Props) {
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const subtitle = pageSubtitle(active, t);
  const { packagePracticalRemaining, theoryLessonsRemaining } = useStudentEntitlements();
  const hasRemaining = packagePracticalRemaining > 0 || theoryLessonsRemaining > 0;
  const hasPracticalRemaining = packagePracticalRemaining > 0;
  const hasTheoryRemaining = theoryLessonsRemaining > 0;

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader icon={CalendarDays} title={pageTitle(active, t)} subtitle={subtitle} />
      </Reveal>
      {STUDENT_SELF_SERVICE_BOOKING_ENABLED && hasRemaining ? (
        <Reveal delay={0.03}>
          <Card className="mb-4 border-border p-3 sm:p-4 bg-amber-50/60 dark:bg-amber-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="font-medium text-foreground">Դեռ ունեք ընտրելու ժամեր փաթեթից</p>
                <p className="text-muted-foreground">
                  Գործնական: {packagePracticalRemaining} · Տեսական անհատական: {theoryLessonsRemaining}
                </p>
              </div>
              <div className="flex gap-2">
                {hasPracticalRemaining ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(absWouterHref("/dashboard/bookings/practical"))}
                  >
                    {t("dashboardLessonsBookPractical")}
                  </Button>
                ) : null}
                {hasTheoryRemaining ? (
                  <Button size="sm" onClick={() => setLocation(absWouterHref("/dashboard/bookings/theory-personal"))}>
                    {t("bookingsSubnavTheoryPersonal")}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </Reveal>
      ) : null}

      <VposTestModeBanner className="mb-4" />

      {children}
    </DashboardLayout>
  );
}
