import { useEffect, useMemo, useState } from "react";
import { Link, Redirect, useRoute } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { fetchTopicProgressSnapshot, type TopicProgressSnapshot, resetTopicProgress } from "src/lib/examStats";
import { useExamQuizQuestionPool } from "src/modules/exam/useExamQuestionPacks";
import { getQuestionInLang } from "src/data/examSampleQuestions";

type TopicQuestionFilter = "unanswered" | "correct" | "wrong";

export default function DashboardThematicTopicProgress() {
  const { t, lang } = useLang();
  const [match, params] = useRoute("/dashboard/learn/thematic-tests/topic/:topicId");
  const topicId = params?.topicId?.trim() ?? "";
  const [activeFilter, setActiveFilter] = useState<TopicQuestionFilter | null>(null);

  const { pool, loading } = useExamQuizQuestionPool({
    mode: "topics",
    thematicTopicId: topicId || undefined,
    examTicketActive: false,
    examTicketMetaPending: false,
    examTicketQuestionIds: [],
  });

  const questionIds = useMemo(() => pool.map((q) => q.id), [pool]);
  const [progress, setProgress] = useState<TopicProgressSnapshot>({
    topicId,
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
    void fetchTopicProgressSnapshot(topicId, questionIds).then((snapshot) => {
      if (mounted) setProgress(snapshot);
    });
    return () => {
      mounted = false;
    };
  }, [topicId, questionIds]);
  const progressPct = progress.totalQuestions > 0 ? Math.round((progress.correctCount / progress.totalQuestions) * 100) : 0;
  const filteredQuestions = useMemo(() => {
    if (!activeFilter) return [];
    return pool.filter((question) => {
      const answered = progress.answeredQuestions[question.id];
      const hasAnswer = answered?.selectedAnswerId !== null && answered?.selectedAnswerId !== undefined;
      if (activeFilter === "unanswered") {
        return !hasAnswer;
      }
      if (activeFilter === "correct") {
        return hasAnswer && Boolean(answered?.isCorrect);
      }
      return hasAnswer && !answered?.isCorrect;
    });
  }, [activeFilter, pool, progress.answeredQuestions]);

  if (!match || !topicId) return <Redirect to="/dashboard/learn/thematic-tests" />;

  const startHref = `/dashboard/learn/exam-tests/quiz/topics?topic=${encodeURIComponent(topicId)}`;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <PanelPageHeader title={t("dashboardLearnThematicTests")} subtitle="Թեմայի առաջընթաց" className="mb-4" />

        <Card className="rounded-xl border border-border p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Բեռնվում է թեմայի առաջընթացը…</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">Ընդամենը հարցեր: {progress.totalQuestions}</p>
              <div className="space-y-2 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveFilter("unanswered")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-left hover:bg-muted"
                >
                  <span>Չլրացված հարցեր</span>
                  <span>{progress.unansweredCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("correct")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-left hover:bg-muted"
                >
                  <span>Ճիշտ պատասխաններ</span>
                  <span>{progress.correctCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("wrong")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-left hover:bg-muted"
                >
                  <span>Սխալ պատասխաններ</span>
                  <span>{progress.wrongCount}</span>
                </button>
              </div>

              <div className="h-1.5 w-full rounded-full bg-accent mb-2">
                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mb-5">{progressPct}%</p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link href={startHref} className="flex-1">
                  <Button className="w-full">{progress.unansweredCount === progress.totalQuestions ? "Սկսել" : "Շարունակել"}</Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    resetTopicProgress(topicId);
                    window.location.href = startHref;
                  }}
                >
                  Սկսել նորից
                </Button>
              </div>

              {activeFilter ? (
                <div className="mt-5 rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {activeFilter === "unanswered"
                        ? "Չլրացված հարցերի ցանկ"
                        : activeFilter === "correct"
                          ? "Ճիշտ պատասխանված հարցերի ցանկ"
                          : "Սխալ պատասխանված հարցերի ցանկ"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setActiveFilter(null)}>
                      Փակել
                    </Button>
                  </div>
                  {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Այս ցուցակում հարցեր չկան։</p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                      {filteredQuestions.map((question, idx) => (
                        <Link key={question.id} href={`/dashboard/learn/thematic-tests/question/${question.id}`}>
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

