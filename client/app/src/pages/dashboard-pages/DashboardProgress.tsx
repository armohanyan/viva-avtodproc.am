import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { LineChart } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonProgressBar from "src/components/LessonProgressBar";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { getExamStats, subscribeExamStatsChanged, type ExamStats } from "src/lib/examStats";
import { useStudentProgress, type ProgressLessonSnapshot } from "src/modules/dashboard/useStudentProgress";
import { loadExamQuestionMeta } from "src/lib/examQuestionMeta";

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

function formatLessonWhen(snapshot: ProgressLessonSnapshot, lang: string): string {
  const date = formatShortDateFromIso(snapshot.dateIso, lang);
  const end = snapshot.endTime ? `–${snapshot.endTime}` : "";
  return `${date} · ${snapshot.time}${end}`;
}

export default function DashboardProgress() {
  const { t, lang } = useLang();
  const { progress, loading: progressLoading, error: progressError } = useStudentProgress({ self: true });
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    let mounted = true;
    void loadExamQuestionMeta().then((meta) => {
      if (mounted) setTotalQuestions(meta.totalQuestions);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [examStats, setExamStats] = useState<ExamStats>(EMPTY_STATS);

  useEffect(() => {
    setExamStats(getExamStats());
    return subscribeExamStatsChanged(() => setExamStats(getExamStats()));
  }, []);

  const examProgressPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Number(((examStats.answered / totalQuestions) * 100).toFixed(1)));
  }, [examStats.answered, totalQuestions]);

  const overall = progress?.overall;

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-6"
        icon={LineChart}
        title={t("dashboardProgressTitle")}
        subtitle={t("dashboardProgressLearningSubtitle")}
      />

      <div className="max-w-4xl space-y-6 mb-8">
        <Card className="p-5 sm:p-6 border-border">
          <h2 className="text-lg font-semibold text-foreground mb-1">{t("dashboardProgressOverallHeading")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {progressLoading
              ? t("loading")
              : progressError
                ? progressError
                : overall && overall.totalLessons > 0
                  ? `${overall.completedLessons} / ${overall.totalLessons} ${t("dashboardProgressOverallCount")} · ${overall.progressPercent}%`
                  : t("dashboardProgressOverallEmpty")}
          </p>
          {overall && overall.totalLessons > 0 ? (
            <LessonProgressBar
              label={t("dashboardProgressAllLessons")}
              completed={overall.completedLessons}
              total={overall.totalLessons}
              percent={overall.progressPercent}
              remainingLabel={`${overall.remainingLessons} ${t("dashboardProgressRemainingCount")}`}
              upcomingLabel={
                overall.upcomingLessons > 0
                  ? `${overall.upcomingLessons} ${t("dashboardProgressUpcomingCount")}`
                  : undefined
              }
            />
          ) : null}
        </Card>

        {progress ? (
          <div className="grid gap-4">
            <Card className="p-5 border-border">
              <LessonProgressBar
                label={t("dashboardProgressPracticalHeading")}
                completed={progress.practical.completed}
                total={progress.practical.total}
                percent={progress.practical.progressPercent}
                remainingLabel={`${progress.practical.remaining} ${t("dashboardProgressRemainingCount")}`}
                upcomingLabel={
                  progress.practical.upcoming > 0
                    ? `${progress.practical.upcoming} ${t("dashboardProgressUpcomingCount")}`
                    : undefined
                }
              />
            </Card>
            <Card className="p-5 border-border">
              <LessonProgressBar
                label={t("dashboardProgressPersonalTheoryHeading")}
                completed={progress.personalTheory.completed}
                total={progress.personalTheory.total}
                percent={progress.personalTheory.progressPercent}
                remainingLabel={`${progress.personalTheory.remaining} ${t("dashboardProgressRemainingCount")}`}
                upcomingLabel={
                  progress.personalTheory.upcoming > 0
                    ? `${progress.personalTheory.upcoming} ${t("dashboardProgressUpcomingCount")}`
                    : undefined
                }
              />
            </Card>
            <Card className="p-5 border-border">
              <LessonProgressBar
                label={t("dashboardProgressGroupTheoryHeading")}
                completed={progress.groupTheory.completed}
                total={progress.groupTheory.total}
                percent={progress.groupTheory.progressPercent}
                remainingLabel={`${progress.groupTheory.remaining} ${t("dashboardProgressRemainingCount")}`}
                upcomingLabel={
                  progress.groupTheory.upcoming > 0
                    ? `${progress.groupTheory.upcoming} ${t("dashboardProgressUpcomingCount")}`
                    : undefined
                }
              />
            </Card>
          </div>
        ) : null}

        {progress?.lastCompletedLesson || progress?.nextUpcomingLesson ? (
          <Card className="p-5 border-border grid gap-3 sm:grid-cols-2 text-sm">
            {progress.lastCompletedLesson ? (
              <div>
                <p className="text-muted-foreground mb-0.5">{t("dashboardProgressLastCompleted")}</p>
                <p className="font-medium text-foreground">{progress.lastCompletedLesson.label}</p>
                <p className="text-muted-foreground tabular-nums">
                  {formatLessonWhen(progress.lastCompletedLesson, lang)}
                </p>
              </div>
            ) : null}
            {progress.nextUpcomingLesson ? (
              <div>
                <p className="text-muted-foreground mb-0.5">{t("dashboardProgressNextUpcoming")}</p>
                <p className="font-medium text-foreground">{progress.nextUpcomingLesson.label}</p>
                <p className="text-muted-foreground tabular-nums">
                  {formatLessonWhen(progress.nextUpcomingLesson, lang)}
                </p>
              </div>
            ) : null}
          </Card>
        ) : null}
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
