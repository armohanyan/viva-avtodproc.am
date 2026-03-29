import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Layers, Signpost, ArrowRight } from "lucide-react";

export default function DashboardExamTests() {
  const { t } = useLang();

  const modes = [
    {
      href: "/dashboard/exam-tests/quiz/full",
      icon: ClipboardCheck,
      title: t("examTestsFullTitle"),
      desc: t("examTestsFullDesc"),
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      href: "/dashboard/exam-tests/quiz/topics",
      icon: Layers,
      title: t("examTestsTopicsTitle"),
      desc: t("examTestsTopicsDesc"),
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      href: "/dashboard/exam-tests/quiz/signs",
      icon: Signpost,
      title: t("examTestsSignsTitle"),
      desc: t("examTestsSignsDesc"),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{t("examTests")}</h2>
          <p className="text-slate-500 mt-1">{t("examTestsHubSub")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card className="p-5 border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("examTestsStatAttempts")}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
          </Card>
          <Card className="p-5 border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("examTestsStatBest")}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
          </Card>
          <Card className="p-5 border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("examTestsStatLast")}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((m) => (
            <Card key={m.href} className={`p-6 border ${m.border} shadow-sm flex flex-col`}>
              <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center mb-4`}>
                <m.icon className={`w-6 h-6 ${m.color}`} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{m.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-6">{m.desc}</p>
              <Link href={m.href}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {t("examTestsStart")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-8 text-center">{t("examTestsHubNote")}</p>
      </div>
    </DashboardLayout>
  );
}
