import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import {
  getExamStats,
  getScopedExamProgress,
  progressPercentPassed,
  subscribeExamStatsChanged,
  type ExamStats,
} from "src/lib/examStats";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";

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
  const [examCardQuestionIds, setExamCardQuestionIds] = useState<string[][]>(
    () => defaultExamQuestionMeta().examCardQuestionIds,
  );

  useEffect(() => {
    setStats(getExamStats());
    return subscribeExamStatsChanged(() => setStats(getExamStats()));
  }, []);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const meta = await loadExamQuestionMeta();
      if (mounted) {
        setExamCardTitles(meta.examCardTitles);
        setExamCardQuestionIds(meta.examCardQuestionIds);
      }
    };
    void sync();
    const off = subscribeExamQuestionMetaUpdated(() => void sync());
    return () => {
      mounted = false;
      off();
    };
  }, []);

  // Exam-only total: sum of question counts across the 60 exam ticket cards.
  const totalQuestions = useMemo(
    () => examCardQuestionIds.reduce((sum, row) => sum + row.length, 0),
    [examCardQuestionIds],
  );
  const scoped = useMemo(() => getScopedExamProgress(stats, "exam"), [stats]);
  const progressPct = useMemo(
    () => progressPercentPassed(scoped.passed, totalQuestions),
    [scoped.passed, totalQuestions],
  );

  const examCards = useMemo(() => {
    const n = Math.max(examCardTitles.length, examCardQuestionIds.length);
    return Array.from({ length: n }, (_, i) => {
      const title = examCardTitles[i]?.trim() || `${t("examTestsNumberedTitle")} ${i + 1}`;
      const ids = examCardQuestionIds[i] ?? [];
      const total = ids.length;
      return { title, total, index: i };
    });
  }, [examCardTitles, examCardQuestionIds, t]);

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
                {scoped.passed} / {totalQuestions}
              </p>
              <p className="text-xs text-muted-foreground">{t("examTestsPositiveResult")}</p>
            </div>
            <div className="rounded-lg bg-accent/40 p-3">
              <p className="text-rose-500 font-semibold text-sm">
                {scoped.failed} / {totalQuestions}
              </p>
              <p className="text-xs text-muted-foreground">{t("examTestsNegativeResult")}</p>
            </div>
          </div>

        </Card>

        <div className="flex justify-end mb-3">
          <span className="text-sm text-muted-foreground">{t("examTestsRestoreResultsCaption")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {examCards.map((card) => {
            const topicKey = `exam-ticket-${card.index}`;
            const answeredInMode = stats.topicStats[topicKey]?.answered ?? 0;
            const href = `${basePath}/quiz/full?ticket=${card.index}`;

            return (
              <Card
                key={card.index}
                className="rounded-xl sm:rounded-2xl border border-neutral-200/90 dark:border-border bg-card shadow-none transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
                  <Link href={href} className="min-w-0 flex-1">
                    <p className="text-sm sm:text-[15px] font-medium text-neutral-800 dark:text-foreground leading-snug min-w-0">
                      {card.title}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {answeredInMode} / {card.total}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
