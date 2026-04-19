import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Link } from "wouter";
import { Calendar, CheckCircle2, ArrowRight, LayoutDashboard } from "lucide-react";
import { CountUpText } from "src/lib/motion";
import { partitionStudentBookings } from "src/data/studentDemoBookings";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import StudentDemoBookingRow from "src/components/dashboard/StudentDemoBookingRow";
import StudentRateInstructorsPanel from "src/components/dashboard/StudentRateInstructorsPanel";

export default function Dashboard() {
  const { t } = useLang();
  const { user } = useAccount();
  const { bookings } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const { upcomingBookingsCount, completedPracticalLessons } = useStudentEntitlements();

  const { upcoming: upcomingBookings } = partitionStudentBookings(bookings);
  const upcomingPreview = upcomingBookings.slice(0, 3);

  const stats = [
    { label: t("upcomingLessons"), value: upcomingBookingsCount, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: t("completedLessons"), value: completedPracticalLessons, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-8"
        icon={LayoutDashboard}
        title={
          <>
            {t("welcomeUser")},{" "}
            {user?.name?.trim() || user?.email?.split("@")[0] || t("dashboardStudentName")}
          </>
        }
      />

      <StudentRateInstructorsPanel studentUserId={user?.accountType === "student" ? user.id : undefined} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-foreground">
                  <CountUpText value={s.value} />
                </p>
              </div>
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{t("upcomingLessons")}</h3>
        <Link href="/dashboard/bookings">
          <button type="button" className="text-sm text-primary hover:underline flex items-center gap-1">
            {t("viewAll")} <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
      <div className="space-y-3">
        {upcomingPreview.length === 0 ? (
          <Card className="p-4 border-border text-sm text-muted-foreground">{t("noUpcoming")}</Card>
        ) : (
          upcomingPreview.map((b) => <StudentDemoBookingRow key={b.id} booking={b} variant="dashboard" />)
        )}
      </div>
    </DashboardLayout>
  );
}
