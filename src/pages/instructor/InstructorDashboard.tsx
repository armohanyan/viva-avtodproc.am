import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Calendar, Clock, User, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { CountUpText } from "src/lib/motion";

const upcoming = [
  { date: "Apr 4", time: "10:00", student: "Ani Karapetyan", typeKey: "lessonTypePractical" as const, status: "confirmed" as const },
  { date: "Apr 5", time: "14:00", student: "Tigran Mkhitaryan", typeKey: "lessonTypeTheory" as const, status: "confirmed" as const },
  { date: "Apr 6", time: "09:00", student: "Nare Harutyunyan", typeKey: "lessonTypePractical" as const, status: "pending" as const },
];

export default function InstructorDashboard() {
  const { t } = useLang();

  return (
    <InstructorPanelLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">{t("instructorDashboardTitle")}</h2>
        <p className="text-muted-foreground mt-1">{t("instructorKpiNextDays")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("instructorKpiUpcomingTitle")}</p>
              <p className="text-3xl font-bold text-foreground">
                <CountUpText value={upcoming.length} />
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("instructorNavStudents")}</p>
              <p className="text-3xl font-bold text-foreground">
                <CountUpText value={12} />
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("bookings")}</p>
              <p className="text-3xl font-bold text-foreground">
                <CountUpText value={28} />
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-border">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold text-foreground">{t("instructorKpiUpcomingTitle")}</h3>
          <Link
            href="/instructor/bookings"
            className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:underline"
          >
            {t("bookings")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {upcoming.map((row, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-border last:border-0"
            >
              <div>
                <p className="font-medium text-foreground">{row.student}</p>
                <p className="text-sm text-muted-foreground">
                  {row.date} · {row.time} · {t(row.typeKey)}
                </p>
              </div>
              <Badge
                className={
                  row.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                }
              >
                {t(row.status)}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </InstructorPanelLayout>
  );
}
