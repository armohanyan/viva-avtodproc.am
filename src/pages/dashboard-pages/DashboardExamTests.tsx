import { Link } from "wouter";
import { Reveal } from "src/lib/motion";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { ClipboardCheck, Layers, Signpost, ArrowRight } from "lucide-react";

export default function DashboardExamTests() {
  const { t } = useLang();

  const modes = [
    {
      href: "/dashboard/exam-tests/quiz/full",
      icon: ClipboardCheck,
      title: t("examTestsFullTitle"),
      desc: t("examTestsFullDesc"),
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-border",
    },
    {
      href: "/dashboard/exam-tests/quiz/topics",
      icon: Layers,
      title: t("examTestsTopicsTitle"),
      desc: t("examTestsTopicsDesc"),
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-border",
    },
    {
      href: "/dashboard/exam-tests/quiz/signs",
      icon: Signpost,
      title: t("examTestsSignsTitle"),
      desc: t("examTestsSignsDesc"),
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-border",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <PanelPageHeader className="mb-8" icon={ClipboardCheck} title={t("examTests")} subtitle={t("examTestsHubSub")} />

        <Reveal delay={0.06}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <Card className="p-5 border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("examTestsStatAttempts")}</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
            </Card>
            <Card className="p-5 border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("examTestsStatBest")}</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
            </Card>
            <Card className="p-5 border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("examTestsStatLast")}</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
            </Card>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((m, i) => (
            <Reveal key={m.href} delay={i * 0.06}>
              <Card className={`p-6 border ${m.border} shadow-sm flex flex-col`}>
                <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <m.icon className={`w-6 h-6 ${m.color}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">{m.desc}</p>
                <Link href={m.href}>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    {t("examTestsStart")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.18}>
          <p className="text-xs text-muted-foreground mt-8 text-center">{t("examTestsHubNote")}</p>
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
