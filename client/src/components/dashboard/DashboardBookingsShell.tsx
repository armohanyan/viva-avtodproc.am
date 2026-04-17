import type { ReactNode } from "react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { CalendarDays } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { Button } from "src/components/ui/button";
import { Link } from "wouter";
import { absWouterHref } from "src/lib/wouterFullPath";

export type BookingsShellActive = "home" | "package" | "practical";

type Props = {
  active: BookingsShellActive;
  children: ReactNode;
};

function pageSubtitle(active: BookingsShellActive, t: (k: TranslationKey) => string) {
  if (active === "practical") return t("bookingsPracticalPageSubtitle");
  return undefined;
}

export default function DashboardBookingsShell({ active, children }: Props) {
  const { t } = useLang();
  const subtitle = pageSubtitle(active, t);

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader
          icon={CalendarDays}
          title={t("bookings")}
          subtitle={subtitle}
          actions={
            <Link href={absWouterHref("/dashboard/purchases")}>
              <Button type="button" variant="outline" size="sm" className="border-input">
                {t("bookingsViewMyServices")}
              </Button>
            </Link>
          }
        />
      </Reveal>

      {children}
    </DashboardLayout>
  );
}
