import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Link } from "wouter";
import { Calendar, BookOpen, CheckCircle2, Clock, ArrowRight, LayoutDashboard } from "lucide-react";
import { CountUpText } from "src/lib/motion";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";

type LessonRow = {
  date: string;
  time: string;
  instructor: string;
  lessonTypeKey: "lessonTypePractical" | "lessonTypeTheory";
  status: "confirmed" | "pending";
};

const upcoming: LessonRow[] = [
  { date: "Mar 28", time: "10:00", instructor: "Armen Petrosyan", lessonTypeKey: "lessonTypePractical", status: "confirmed" },
  { date: "Mar 30", time: "14:00", instructor: "Narine H.", lessonTypeKey: "lessonTypeTheory", status: "confirmed" },
  { date: "Apr 2", time: "09:00", instructor: "Armen Petrosyan", lessonTypeKey: "lessonTypePractical", status: "pending" },
];

export default function Dashboard() {
  const { t } = useLang();
  const {
    upcomingBookingsCount,
    practicalCreditsRemaining,
    completedPracticalLessons,
    packagePracticalRemaining,
    extraPracticalRemaining,
  } = useStudentEntitlements();

  const stats = [
    { label: t("upcomingLessons"), value: upcomingBookingsCount, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: t("remainingLessons"), value: practicalCreditsRemaining, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { label: t("completedLessons"), value: completedPracticalLessons, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-8"
        icon={LayoutDashboard}
        title={
          <>
            {t("welcomeUser")}, {t("dashboardStudentName")}
          </>
        }
        subtitle={t("dashboardHomeSubtitle")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Link href="/dashboard/bookings">
          <Card className="p-5 h-full border-border hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{t("bookings")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("bookingsCreditsPackagePart")}: {packagePracticalRemaining} · {t("bookingsCreditsExtraPart")}:{" "}
                  {extraPracticalRemaining}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/learn">
          <Card className="p-5 h-full border-border hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{t("learn")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t("examTestsHubSub")}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </div>
          </Card>
        </Link>
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
        {upcoming.map((lesson, i) => (
          <Card key={`${lesson.date}-${lesson.time}-${i}`} className="p-4 border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{lesson.date.split(" ")[0]}</span>
                  <span className="text-sm font-bold text-primary">{lesson.date.split(" ")[1]}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{lesson.instructor}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">{lesson.time}</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0 bg-accent text-foreground">
                      {t(lesson.lessonTypeKey)}
                    </Badge>
                  </div>
                </div>
              </div>
              <Badge
                className={`text-xs shrink-0 ${
                  lesson.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
                }`}
              >
                {lesson.status === "confirmed" ? t("confirmed") : t("pending")}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/dashboard/bookings">
          <Button className="w-full sm:w-auto">{t("bookNow")}</Button>
        </Link>
      </div>
    </DashboardLayout>
  );
}
