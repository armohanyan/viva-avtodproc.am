import { CalendarDays } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import StudentLessonsCalendar from "src/components/lessonsSchedule/StudentLessonsCalendar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";

export default function DashboardLessons() {
  const { t } = useLang();

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-6"
        icon={CalendarDays}
        title={t("dashboardLessonsTitle")}
        subtitle={t("dashboardLessonsSubtitle")}
      />

      <StudentLessonsCalendar />
    </DashboardLayout>
  );
}
