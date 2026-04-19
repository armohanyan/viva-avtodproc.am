import type { ReactNode } from "react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { CalendarDays } from "lucide-react";
import { Reveal } from "src/lib/motion";

export type BookingsShellActive = "home" | "package" | "practical";

type Props = {
  active: BookingsShellActive;
  children: ReactNode;
};

function pageTitle(active: BookingsShellActive, t: (k: TranslationKey) => string) {
  if (active === "package") return t("bookingsSubnavPackage");
  if (active === "practical") return t("bookingsSubnavPractical");
  return t("bookings");
}

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
        <PanelPageHeader icon={CalendarDays} title={pageTitle(active, t)} subtitle={subtitle} />
      </Reveal>

      {children}
    </DashboardLayout>
  );
}
