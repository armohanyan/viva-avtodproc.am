import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import DataTableToolbar from "src/components/DataTableToolbar";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Link } from "wouter";
import { useToast } from "src/lib/toast";
import { useMemo, useState } from "react";
import { Calendar, BookOpen, CheckCircle2, Video, Bell, Clock, ArrowRight, TrendingUp, ClipboardCheck, LayoutDashboard } from "lucide-react";
import { CountUpText } from "src/lib/motion";

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

const notificationKeys: { textKey: TranslationKey; timeKey: TranslationKey }[] = [
  { textKey: "dashboardNotif1Text", timeKey: "dashboardNotif1Time" },
  { textKey: "dashboardNotif2Text", timeKey: "dashboardNotif2Time" },
  { textKey: "dashboardNotif3Text", timeKey: "dashboardNotif3Time" },
];

export default function Dashboard() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonStatus, setLessonStatus] = useState<"all" | "confirmed" | "pending">("all");

  const filteredUpcoming = useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    return upcoming.filter((lesson) => {
      const hay = [lesson.date, lesson.time, lesson.instructor, lesson.lessonTypeKey, lesson.status].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchSt = lessonStatus === "all" || lesson.status === lessonStatus;
      return matchSearch && matchSt;
    });
  }, [lessonSearch, lessonStatus]);

  const stats = [
    { label: t("upcomingLessons"), value: 3, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: t("remainingLessons"), value: 14, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { label: t("completedLessons"), value: 4, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-8"
        icon={LayoutDashboard}
        title={
          <>
            {t("welcomeUser")}, {t("dashboardDemoFirstName")}! 👋
          </>
        }
        subtitle={t("dashboardLearningOverview")}
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

      <Link href="/dashboard/exam-tests">
        <Card className="p-5 mb-8 border-border bg-gradient-to-r from-primary/10 to-card hover:border-primary/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("examTests")}</p>
                <p className="text-sm text-muted-foreground">{t("examTestsHubSub")}</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0" />
          </div>
        </Card>
      </Link>

      <Card className="p-6 mb-8 border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">{t("myProgress")}</h3>
          </div>
          <span className="text-sm text-muted-foreground">4 / 18 {t("lessons")}</span>
        </div>
        <div className="h-2.5 bg-accent rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "22%" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{t("dashboardProgressSummary")}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t("upcomingLessons")}</h3>
            <Link href="/dashboard/bookings">
              <button type="button" className="text-sm text-primary hover:underline flex items-center gap-1">
                {t("viewAll")} <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <DataTableToolbar value={lessonSearch} onChange={setLessonSearch} placeholder={`${t("search")}…`} className="rounded-lg border border-border bg-card mb-3">
            <div className="flex flex-wrap gap-2">
              {(["all", "confirmed", "pending"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setLessonStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    lessonStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s === "all" ? t("filterOptionAll") : t(s)}
                </button>
              ))}
            </div>
          </DataTableToolbar>
          <div className="space-y-3">
            {filteredUpcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("tableNoMatches")}</p>
            ) : null}
            {filteredUpcoming.map((lesson, i) => (
              <Card key={`${lesson.date}-${lesson.time}-${i}`} className="p-4 border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{lesson.date.split(" ")[0]}</span>
                      <span className="text-sm font-bold text-primary">{lesson.date.split(" ")[1]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{lesson.instructor}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{lesson.time}</span>
                        <Badge variant="secondary" className="text-xs px-2 py-0 bg-accent text-foreground">
                          {t(lesson.lessonTypeKey)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs ${
                      lesson.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
                    }`}
                  >
                    {lesson.status === "confirmed" ? t("confirmed") : t("pending")}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4 p-5 bg-primary border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-hero-foreground/20 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-hero-foreground" />
                </div>
                <div>
                  <p className="text-hero-foreground font-medium text-sm">{t("dashboardTheoryClassTitle")}</p>
                  <p className="text-hero-foreground/80 text-xs">{t("dashboardTheoryClassSub")}</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-background text-primary hover:bg-accent shrink-0"
                onClick={() => {
                  window.open("https://meet.google.com", "_blank", "noopener,noreferrer");
                  showToast(t("openingMeetingLinkToast"), "info");
                }}
              >
                {t("joinOnlineClass")}
              </Button>
            </div>
          </Card>

          <div className="mt-4">
            <Link href="/dashboard/bookings">
              <Button variant="outline" className="w-full border-dashed border-border/60 text-muted-foreground">
                + {t("bookNow")}
              </Button>
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{t("notifications")}</h3>
          </div>
          <div className="space-y-3">
            {notificationKeys.map((n, i) => (
              <Card key={i} className="p-4 border-border">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      i !== 1 ? "bg-emerald-500" : "bg-primary"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-foreground leading-snug">{t(n.textKey)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t(n.timeKey)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
