import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { LineChart } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { getExamStats, subscribeExamStatsChanged, type ExamStats } from "src/lib/examStats";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { useExamQuestionPool } from "src/modules/exam/useExamQuestionPool";

const EMPTY_STATS: ExamStats = {
  answered: 0,
  correct: 0,
  wrong: 0,
  attempts: 0,
  bestPct: 0,
  lastPct: 0,
  questionResults: {},
  topicStats: {},
  activeSession: null,
};

export default function DashboardProgress() {
  const { t } = useLang();
  const {
    completedPracticalLessons,
    practicalCreditsRemaining,
    primaryTheoryTotal,
    primaryTheoryUsed,
    hasTheoryFromPackage,
    ownedPackages,
  } = useStudentEntitlements();
  const pool = useExamQuestionPool();

  const [examStats, setExamStats] = useState<ExamStats>(EMPTY_STATS);

  useEffect(() => {
    setExamStats(getExamStats());
    return subscribeExamStatsChanged(() => setExamStats(getExamStats()));
  }, []);

  const totalQuestions = pool.length;
  const examProgressPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Number(((examStats.answered / totalQuestions) * 100).toFixed(1)));
  }, [examStats.answered, totalQuestions]);

  const pkgUsed = ownedPackages.reduce((a, p) => a + p.practicalUsed, 0);
  const pkgTotal = ownedPackages.reduce((a, p) => a + p.practicalTotal, 0);

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-6"
        icon={LineChart}
        title={t("dashboardProgressTitle")}
        subtitle={t("dashboardProgressSubtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mb-8">
        <Card className="p-5 border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t("dashboardProgressPracticalHeading")}</h2>
          <dl className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>{t("dashboardProgressPracticalUsed")}</dt>
              <dd className="text-foreground font-medium tabular-nums">{completedPracticalLessons}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("dashboardProgressPracticalRemaining")}</dt>
              <dd className="text-foreground font-medium tabular-nums">{practicalCreditsRemaining}</dd>
            </div>
            {pkgTotal > 0 ? (
              <div className="flex justify-between gap-2 pt-1 border-t border-border/80 text-xs">
                <dt>{t("bookingsCreditsPackagePart")}</dt>
                <dd className="tabular-nums">
                  {pkgUsed}/{pkgTotal}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="p-5 border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t("dashboardProgressTheoryHeading")}</h2>
          {hasTheoryFromPackage ? (
            <dl className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>{t("dashboardProgressTheoryCompleted")}</dt>
                <dd className="text-foreground font-medium tabular-nums">
                  {primaryTheoryUsed}/{primaryTheoryTotal}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{t("dashboardProgressTheoryRemaining")}</dt>
                <dd className="text-foreground font-medium tabular-nums">
                  {Math.max(0, primaryTheoryTotal - primaryTheoryUsed)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboardProgressTheoryEmpty")}</p>
          )}
        </Card>
      </div>

      <div className="max-w-4xl space-y-6">
        <Card className="p-5 sm:p-6 border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t("dashboardProgressExamHeading")}</h2>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/dashboard/learn/exam-tests">{t("dashboardProgressOpenExamTests")}</Link>
            </Button>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("examTestsMyProgress")}</span>
              <span>{examProgressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-accent">
              <div className="h-1.5 rounded-full bg-amber-400 transition-all" style={{ width: `${examProgressPct}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-accent/40 p-3">
              <dt className="text-muted-foreground">{t("dashboardProgressExamAttempts")}</dt>
              <dd className="text-lg font-semibold text-foreground tabular-nums">{examStats.attempts}</dd>
            </div>
            <div className="rounded-lg bg-accent/40 p-3">
              <dt className="text-muted-foreground">{t("dashboardProgressExamSeen")}</dt>
              <dd className="text-lg font-semibold text-foreground tabular-nums">{examStats.answered}</dd>
            </div>
            <div className="rounded-lg bg-accent/40 p-3 col-span-2 sm:col-span-1">
              <dt className="text-muted-foreground">{t("dashboardProgressExamBest")}</dt>
              <dd className="text-lg font-semibold text-foreground tabular-nums">{examStats.bestPct}%</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5 border-border max-w-4xl">
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("dashboardProgressPastLessons")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("dashboardProgressLessonsScheduleHint")}</p>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/lessons">{t("dashboardNavLessons")}</Link>
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
