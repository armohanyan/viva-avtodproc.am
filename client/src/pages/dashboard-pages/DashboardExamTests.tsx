import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { getExamStats, subscribeExamStatsChanged, type ExamStats } from "src/lib/examStats";
import type { ExamQuizMode } from "src/data/examSampleQuestions";
import { countQuestionsForExamMode } from "src/lib/examQuestions";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { useExamQuestionPool } from "src/modules/exam/useExamQuestionPool";

export default function DashboardExamTests() {
  const { t } = useLang();
  const [location] = useLocation();
  const basePath = location.startsWith("/dashboard/learn/exam-tests")
    ? "/dashboard/learn/exam-tests"
    : "/dashboard/exam-tests";

  const [stats, setStats] = useState<ExamStats>({
    answered: 0,
    correct: 0,
    wrong: 0,
    attempts: 0,
    bestPct: 0,
    lastPct: 0,
    questionResults: {},
    topicStats: {},
    activeSession: null,
  });
  const [examCardTitles, setExamCardTitles] = useState<string[]>(() => defaultExamQuestionMeta().examCardTitles);

  useEffect(() => {
    setStats(getExamStats());
    return subscribeExamStatsChanged(() => setStats(getExamStats()));
  }, []);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const meta = await loadExamQuestionMeta();
      if (mounted) setExamCardTitles(meta.examCardTitles);
    };
    void sync();
    const off = subscribeExamQuestionMetaUpdated(() => void sync());
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const pool = useExamQuestionPool();

  const poolTotalForMode = (mode: ExamQuizMode) => countQuestionsForExamMode(pool, mode);

  const totalQuestions = pool.length;
  const progressPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Number(((stats.answered / totalQuestions) * 100).toFixed(1)));
  }, [stats.answered, totalQuestions]);

  const activeTopicStats = stats.activeSession ? stats.topicStats[stats.activeSession.topicId] : undefined;

  const modes: Array<{ href: string; total: number }> = [
    { href: `${basePath}/quiz/full`, total: poolTotalForMode("full") },
    { href: `${basePath}/quiz/topics`, total: poolTotalForMode("topics") },
    { href: `${basePath}/quiz/signs`, total: poolTotalForMode("signs") },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <PanelPageHeader
          className="mb-4 sm:mb-6"
          title={t("dashboardLearnExamTests")}
          subtitle={t("dashboardLearnExamSubtitle")}
        />

        <DashboardLearnSubnav active="exam" />

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">{t("examTestsModesHeading")}</h2>
        </div>

        <Card className="rounded-xl border border-border p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{t("examTestsMyProgress")}</p>
            <p className="text-xs text-muted-foreground">{progressPct}%</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-accent mb-3">
            <div className="h-1.5 rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-accent/40 p-3">
              <p className="text-emerald-600 font-semibold text-sm">
                {stats.correct} / {totalQuestions}
              </p>
              <p className="text-xs text-muted-foreground">{t("examTestsPositiveResult")}</p>
            </div>
            <div className="rounded-lg bg-accent/40 p-3">
              <p className="text-rose-500 font-semibold text-sm">
                {stats.wrong} / {totalQuestions}
              </p>
              <p className="text-xs text-muted-foreground">{t("examTestsNegativeResult")}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">{t("examTestsStatAttempts")}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{stats.attempts}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">{t("examTestsStatBest")}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{stats.bestPct}%</p>
              {stats.activeSession && activeTopicStats && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeTopicStats.bestCorrect ?? 0}/{activeTopicStats.bestAnswered ?? 0}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">{t("examTestsStatLast")}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{stats.lastPct}%</p>
              {stats.activeSession && activeTopicStats && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeTopicStats.lastCorrect ?? 0}/{activeTopicStats.lastAnswered ?? 0}
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="flex justify-end mb-3">
          <span className="text-sm text-muted-foreground">{t("examTestsRestoreResultsCaption")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {modes.map((m, index) => {
            const answeredInMode = 0;
            const testLabel = examCardTitles[index] || `${t("examTestsNumberedTitle")} ${index + 1}`;

            return (
              <Link key={m.href} href={m.href} className="block">
                <Card className="rounded-xl sm:rounded-2xl border border-neutral-200/90 dark:border-border bg-card shadow-none transition-colors hover:bg-muted/30">
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
                    <p className="text-sm sm:text-[15px] font-medium text-neutral-800 dark:text-foreground leading-snug min-w-0">
                      {testLabel}
                    </p>
                    <p className="text-sm text-muted-foreground tabular-nums shrink-0">
                      {answeredInMode} / {m.total}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
