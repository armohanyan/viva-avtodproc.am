import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Link } from "wouter";
import { Calendar, BookOpen, CheckCircle2, Video, Bell, Clock, ArrowRight, TrendingUp, ClipboardCheck } from "lucide-react";

const upcoming = [
  { date: "Mar 28", time: "10:00", instructor: "Armen Petrosyan", type: "Practical", status: "confirmed" },
  { date: "Mar 30", time: "14:00", instructor: "Narine H.", type: "Theory", status: "confirmed" },
  { date: "Apr 2", time: "09:00", instructor: "Armen Petrosyan", type: "Practical", status: "pending" },
];

const notifications = [
  { text: "Your booking on Mar 28 is confirmed", time: "2h ago", type: "success" },
  { text: "Theory session starts in 2 days", time: "1d ago", type: "info" },
  { text: "Payment received for Standard Package", time: "3d ago", type: "success" },
];

export default function Dashboard() {
  const { t } = useLang();

  const stats = [
    { label: t("upcomingLessons"), value: 3, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { label: t("remainingLessons"), value: 14, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { label: t("completedLessons"), value: 4, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">{t("welcomeUser")}, Armen! 👋</h2>
        <p className="text-slate-500 mt-1">Here's your learning overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-6 border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
              </div>
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Link href="/dashboard/exam-tests">
        <Card className="p-5 mb-8 border-blue-100 bg-gradient-to-r from-blue-50 to-white hover:border-blue-200 transition-colors cursor-pointer">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{t("examTests")}</p>
                <p className="text-sm text-slate-500">{t("examTestsHubSub")}</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 shrink-0" />
          </div>
        </Card>
      </Link>

      {/* Progress Bar */}
      <Card className="p-6 mb-8 border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-slate-900">{t("myProgress")}</h3>
          </div>
          <span className="text-sm text-slate-500">4 / 18 {t("lessons")}</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: "22%" }} />
        </div>
        <p className="text-xs text-slate-400 mt-2">22% completed — Standard Package</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Lessons */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{t("upcomingLessons")}</h3>
            <Link href="/dashboard/bookings">
              <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                {t("viewAll")} <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcoming.map((lesson, i) => (
              <Card key={i} className="p-4 border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">{lesson.date.split(" ")[0]}</span>
                      <span className="text-sm font-bold text-blue-800">{lesson.date.split(" ")[1]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{lesson.instructor}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{lesson.time}</span>
                        <Badge variant="secondary" className="text-xs px-2 py-0 bg-slate-100">
                          {lesson.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Badge className={`text-xs ${lesson.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {lesson.status === "confirmed" ? t("confirmed") : t("pending")}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {/* Join Online Class CTA */}
          <Card className="mt-4 p-5 bg-blue-600 border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Theory Class — Today 16:00</p>
                  <p className="text-blue-200 text-xs">Online • Google Meet</p>
                </div>
              </div>
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 shrink-0">
                {t("joinOnlineClass")}
              </Button>
            </div>
          </Card>

          <div className="mt-4">
            <Link href="/dashboard/bookings">
              <Button variant="outline" className="w-full border-dashed border-slate-200 text-slate-500">
                + {t("bookNow")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-900">{t("notifications")}</h3>
          </div>
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <Card key={i} className="p-4 border-slate-100">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <div>
                    <p className="text-sm text-slate-700 leading-snug">{n.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{n.time}</p>
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
