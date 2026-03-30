import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { ShoppingBag, CheckCircle2, Clock, BookOpen, Video } from "lucide-react";
import { Link } from "wouter";
import { CountUpText, Reveal } from "src/lib/motion";
import { useToast } from "src/lib/toast";

const purchases = [
  {
    id: "PKG-001", name: "Standard Package", date: "2026-03-01", price: "55,000 ֏",
    status: "active", lessonsTotal: 18, lessonsUsed: 4, type: "package"
  },
];

const theoryPurchases = [
  { id: "TH-001", name: "Theory Course — Cohort 12", date: "2026-03-10", price: "8,000 ֏", status: "active", type: "theory" },
];

export default function DashboardPurchases() {
  const { t } = useLang();
  const { showToast } = useToast();

  return (
    <DashboardLayout>
      <Reveal>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("purchases")}</h2>
      </Reveal>

      {/* Active Package */}
      <div className="mb-8">
        <h3 className="font-semibold text-slate-700 mb-3">Active Package</h3>
        {purchases.map((p, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <Card className="p-6 border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{p.name}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">Purchased {p.date} · {p.price}</p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-slate-500 mb-1">Lessons used</p>
                  <p className="text-2xl font-bold text-slate-900">
                    <CountUpText value={p.lessonsUsed} /> <span className="text-slate-400 text-base font-normal">/ {p.lessonsTotal}</span>
                  </p>
                </div>
              </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Progress</span>
                <span>{Math.round((p.lessonsUsed / p.lessonsTotal) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${(p.lessonsUsed / p.lessonsTotal) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Link href="/dashboard/bookings">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {t("bookNow")}
                </Button>
              </Link>
              <Link href="/dashboard/payments">
                <Button size="sm" variant="outline" className="border-slate-200">
                  View Details
                </Button>
              </Link>
            </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Theory */}
      <div className="mb-8">
        <h3 className="font-semibold text-slate-700 mb-3">Theory Courses</h3>
        {theoryPurchases.map((p, i) => (
          <Reveal key={i} delay={i * 0.06 + 0.08}>
            <Card className="p-6 border-slate-100">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{p.name}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">Enrolled {p.date} · {p.price}</p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                    onClick={() => {
                      window.open("https://meet.google.com", "_blank", "noopener,noreferrer");
                      showToast("Opening meeting link...", "info");
                    }}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {t("meetLink")}
                  </Button>
                  <Link href="/dashboard/bookings">
                    <Button size="sm" variant="outline" className="border-slate-200">
                      {t("viewSchedule")}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Upgrade CTA */}
      <Reveal delay={0.10}>
        <Card className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-lg">Upgrade to Premium</h3>
              <p className="text-blue-200 text-sm mt-1">Get 28 lessons, priority booking, and more.</p>
            </div>
            <Link href="/packages">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 shrink-0">
                View Packages
              </Button>
            </Link>
          </div>
        </Card>
      </Reveal>
    </DashboardLayout>
  );
}
