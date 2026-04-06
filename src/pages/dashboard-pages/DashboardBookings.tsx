import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import { useLang } from "src/lib/i18n";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { Reveal } from "src/lib/motion";

const instructorNames = ["Armen Petrosyan", "Narine Hovhannisyan", "Vardan Grigoryan"];

export default function DashboardBookings() {
  const { t } = useLang();
  const [instructor, setInstructor] = useState(instructorNames[0] ?? "");

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader icon={CalendarClock} title={t("bookingTitle")} subtitle={t("dashboardBookingsPageSubtitle")} />
      </Reveal>

      <LessonBookingCalendar
        mode="student"
        instructorNames={instructorNames}
        selectedInstructor={instructor}
        onInstructorChange={setInstructor}
      />
    </DashboardLayout>
  );
}
