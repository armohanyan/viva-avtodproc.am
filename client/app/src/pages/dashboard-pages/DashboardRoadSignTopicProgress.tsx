import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, Redirect, useRoute } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { fetchTopicProgressSnapshot, type TopicProgressSnapshot, resetTopicProgress } from "src/lib/examStats";
import { useExamQuizQuestionPool } from "src/modules/exam/useExamQuestionPacks";
import { getQuestionInLang } from "src/data/examSampleQuestions";
import { roadSignsTopicKeyFromSlot } from "src/data/signCategories";
import { defaultExamQuestionMeta, loadExamQuestionMeta } from "src/lib/examQuestionMeta";

type TopicQuestionFilter = "unanswered" | "correct" | "wrong";

export default function DashboardRoadSignTopicProgress() {
  const { t, lang } = useLang();
  const [match, params] = useRoute("/dashboard/learn/road-signs/category/:topicId");
  const topicId = params?.topicId?.trim() ?? "";
  const [activeFilter, setActiveFilter] = useState<TopicQuestionFilter | null>(null);
  const [categoryTitle, setCategoryTitle] = useState("");

  const { pool, loading } = useExamQuizQuestionPool({
    mode: "topics",
    thematicTopicId: undefined,
    signCategoryTopicId: topicId || undefined,
    examTicketActive: false,
    examTicketMetaPending: false,
    examTicketQuestionIds: [],
  });

  useEffect(() => {
    let mounted = true;
    void loadExamQuestionMeta().then((meta) => {
      if (!mounted) return;
      const slot = Number.parseInt(topicId, 10);
      if (Number.isInteger(slot) && slot >= 1 && slot <= meta.signsCardTitles.length) {
        setCategoryTitle(meta.signsCardTitles[slot - 1]?.trim() ?? "");
      }
    });
    return () => {
      mounted = false;
    };
  }, [topicId]);

  const questionIds = useMemo(() => pool.map((q) => q.id), [pool]);
  const progressTopicId = roadSignsTopicKeyFromSlot(topicId);
  const [progress, setProgress] = useState<TopicProgressSnapshot>({
    topicId: progressTopicId,
    totalQuestions: 0,
    currentQuestionIndex: 0,
    answeredQuestions: {},
    correctCount: 0,
    wrongCount: 0,
    unansweredCount: 0,
    completedAt: null,
    updatedAt: Date.now(),
  });

  useEffect(() => {
    let mounted = true;
    void fetchTopicProgressSnapshot(progressTopicId, questionIds).then((snapshot) => {
      if (mounted) setProgress(snapshot);
    });
    return () => {
      mounted = false;
    };
  }, [progressTopicId, questionIds]);

  const totalQuestions = progress.totalQuestions > 0 ? progress.totalQuestions : pool.length;
  const progressPct = totalQuestions > 0 ? Math.round((progress.correctCount / totalQuestions) * 100) : 0;
  const filteredQuestions = useMemo(() => {
    if (!activeFilter) return [];
    return pool.filter((question) => {
      const answered = progress.answeredQuestions[question.id];
      const hasAnswer = answered?.selectedAnswerId !== null && answered?.selectedAnswerId !== undefined;
      if (activeFilter === "unanswered") return !hasAnswer;
      if (activeFilter === "correct") return hasAnswer && Boolean(answered?.isCorrect);
      return hasAnswer && !answered?.isCorrect;
    });
  }, [activeFilter, pool, progress.answeredQuestions]);

  if (!match || !topicId) return <Redirect to="/dashboard/learn/road-signs" />;

  const startHref = `/dashboard/learn/road-signs/quiz/topics?topic=${encodeURIComponent(topicId)}`;
  const listHref = "/dashboard/learn/road-signs";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-3">
          <Link href={listHref}>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("dashboardRoadSignsTopicBack")}
              title={t("dashboardRoadSignsTopicBack")}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </Button>
          </Link>
        </div>
        <PanelPageHeader
          title={categoryTitle || t("dashboardLearnRoadSigns")}
          subtitle={t("dashboardRoadSignsTopicSubtitle")}
          className="mb-4"
        />

        <Card className="rounded-xl border border-border p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("dashboardThematicTopicLoading")}</p>
          ) : pool.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("examQuizNoQuestions")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                {t("dashboardThematicTopicTotalQuestions")}: {totalQuestions}
              </p>
              <div className="space-y-2 mb-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveFilter("unanswered")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-normal h-auto"
                >
                  <span>{t("dashboardThematicTopicUnansweredQuestions")}</span>
                  <span>{progress.unansweredCount}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveFilter("correct")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-normal h-auto"
                >
                  <span>{t("dashboardThematicTopicCorrectAnswers")}</span>
                  <span>{progress.correctCount}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveFilter("wrong")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-normal h-auto"
                >
                  <span>{t("dashboardThematicTopicWrongAnswers")}</span>
                  <span>{progress.wrongCount}</span>
                </Button>
              </div>

              <div className="h-1.5 w-full rounded-full bg-accent mb-2">
                <div
                  className="h-1.5 rounded-full bg-blue-400 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-5">{progressPct}%</p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link href={startHref} className="flex-1">
                  <Button className="w-full">
                    {progress.unansweredCount === totalQuestions
                      ? t("dashboardThematicTopicStart")
                      : t("dashboardThematicTopicContinue")}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    resetTopicProgress(progressTopicId);
                    window.location.href = startHref;
                  }}
                >
                  {t("dashboardThematicTopicStartOver")}
                </Button>
              </div>

              {activeFilter ? (
                <div className="mt-5 rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {activeFilter === "unanswered"
                        ? t("dashboardThematicTopicUnansweredList")
                        : activeFilter === "correct"
                          ? t("dashboardThematicTopicCorrectList")
                          : t("dashboardThematicTopicWrongList")}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setActiveFilter(null)}>
                      {t("dashboardThematicTopicCloseList")}
                    </Button>
                  </div>
                  {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboardThematicTopicNoQuestions")}</p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                      {filteredQuestions.map((question, idx) => (
                        <Link key={question.id} href={`/dashboard/learn/road-signs/question/${question.id}`}>
                          <button
                            type="button"
                            className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            {idx + 1}. {getQuestionInLang(question, lang).text}
                          </button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
