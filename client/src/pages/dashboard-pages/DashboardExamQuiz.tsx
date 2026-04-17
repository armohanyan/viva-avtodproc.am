import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Redirect, useLocation, useRoute } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import {
  getQuestionInLang,
  selectQuestionsForMode,
  type ExamQuizMode,
} from "src/data/examSampleQuestions";
import { CheckCircle2, CircleHelp, Scroll, SquareStack, XCircle } from "lucide-react";
import { CountUpText, Reveal } from "src/lib/motion";
import { useFullExamCountdown } from "src/lib/useFullExamCountdown";
import { useExamQuestionPool } from "src/modules/exam/useExamQuestionPool";
import ExamQuestionFigure from "src/components/ExamQuestionFigure";

const VALID_MODES: ExamQuizMode[] = ["full", "topics", "signs"];

type QuizLayoutMode = "step" | "scroll";

function isExamMode(s: string): s is ExamQuizMode {
  return VALID_MODES.includes(s as ExamQuizMode);
}

export default function DashboardExamQuiz() {
  const { t, lang } = useLang();
  const [, setLocation] = useLocation();
  const [learnMatch, learnParams] = useRoute("/dashboard/learn/exam-tests/quiz/:mode");
  const [legacyMatch, legacyParams] = useRoute("/dashboard/exam-tests/quiz/:mode");
  const match = learnMatch || legacyMatch;
  const params = learnMatch ? learnParams : legacyParams;
  const modeParam = params?.mode ?? "";
  const mode: ExamQuizMode | null = isExamMode(modeParam) ? modeParam : null;
  const backHref = learnMatch ? "/dashboard/learn/exam-tests" : "/dashboard/exam-tests";
  const timedExam = mode === "full";

  const topicParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("topic") : null;
  const thematicTopicId = mode === "topics" && topicParam ? topicParam : undefined;

  const pool = useExamQuestionPool();

  const [round, setRound] = useState(0);
  const [endedByTimeout, setEndedByTimeout] = useState(false);
  const questions = useMemo(() => {
    if (!mode) return [];
    return selectQuestionsForMode(mode, pool, {
      thematicTopicId: thematicTopicId ?? null,
    });
  }, [mode, round, thematicTopicId, pool]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => []);
  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});
  const [layoutMode, setLayoutMode] = useState<QuizLayoutMode>("step");

  const finished = Boolean(mode && questions.length > 0 && index >= questions.length);

  const allAnswered = useMemo(() => {
    if (questions.length === 0) return false;
    if (answers.length < questions.length) return false;
    return questions.every((_, i) => answers[i] !== null && answers[i] !== undefined);
  }, [questions, answers]);

  const liveRef = useRef({ index, selected, answers, questions, layoutMode });
  useLayoutEffect(() => {
    liveRef.current = { index, selected, answers, questions, layoutMode };
  }, [index, selected, answers, questions, layoutMode]);

  const handleTimeExpired = useCallback(() => {
    setEndedByTimeout(true);
    const { index: i, selected: sel, answers: ans, questions: qs, layoutMode: lm } = liveRef.current;
    const next: (number | null)[] = qs.map((_, idx) => (idx < ans.length ? ans[idx] ?? null : null));
    if (lm === "step" && sel !== null && i < qs.length) next[i] = sel;
    setAnswers(next);
    setIndex(qs.length);
  }, []);

  const countdownActive = Boolean(mode && timedExam && !finished && questions.length > 0);
  const { formatted: countdownFormatted, isCritical, isWarning } = useFullExamCountdown({
    active: countdownActive,
    resetKey: round,
    onExpire: handleTimeExpired,
  });

  const correctCount = useMemo(() => {
    if (!finished) return 0;
    return questions.reduce((acc, question, i) => {
      const a = answers[i];
      if (a === null || a === undefined) return acc;
      return acc + (a === question.correctIndex ? 1 : 0);
    }, 0);
  }, [finished, questions, answers]);

  useEffect(() => {
    setEndedByTimeout(false);
  }, [round, mode]);

  useEffect(() => {
    if (questions.length === 0) return;
    setAnswers((prev) => {
      if (prev.length === questions.length) return prev;
      return questions.map((_, i) => (i < prev.length ? prev[i] ?? null : null));
    });
  }, [questions]);

  useEffect(() => {
    if (finished || layoutMode !== "step") return;
    setSelected(answers[index] ?? null);
  }, [index, answers, finished, layoutMode]);

  const setLayoutModeAndSyncIndex = (nextMode: QuizLayoutMode) => {
    setLayoutMode(nextMode);
    if (nextMode !== "step") return;
    const firstUnanswered = answers.findIndex((a) => a === null || a === undefined);
    setIndex(firstUnanswered === -1 ? Math.max(0, questions.length - 1) : firstUnanswered);
  };

  const setAnswerAt = (qIdx: number, optionIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      while (next.length < questions.length) next.push(null);
      next[qIdx] = optionIdx;
      return next;
    });
  };

  const finishScrollMode = () => {
    if (!allAnswered) return;
    setIndex(questions.length);
  };

  const isLast = questions.length > 0 && index === questions.length - 1;

  const goNext = () => {
    if (selected === null || questions[index] == null) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = selected;
    setAnswers(nextAnswers);
    if (isLast) {
      setIndex(questions.length);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (index === 0 || questions[index] == null) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = selected;
    setAnswers(nextAnswers);
    setIndex((i) => Math.max(0, i - 1));
  };

  const restart = () => {
    setEndedByTimeout(false);
    setRound((r) => r + 1);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setOpenExplanations({});
  };

  const requestExit = () => {
    if (timedExam && !finished) {
      if (!window.confirm(t("examQuizExitConfirm"))) return;
    }
    setLocation(backHref);
  };

  if (!match || !mode) {
    return <Redirect to="/dashboard/learn/exam-tests" />;
  }

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">{t("examQuizNoQuestions")}</p>
          <Link href={backHref}>
            <Button variant="outline">{t("examQuizBackToList")}</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (finished) {
    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto">
          <Reveal delay={0.06}>
            <Card className="p-8 border-border text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("examQuizResultsTitle")}</h2>
              {endedByTimeout ? (
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">{t("examQuizAutoSubmitted")}</p>
              ) : null}
              <p className="text-muted-foreground mb-6">{t("examQuizScoreLabel")}</p>
              <p className="text-5xl font-bold text-primary mb-2">
                <CountUpText value={correctCount} />/{total}
              </p>
              <p className="text-sm text-muted-foreground mb-8">{pct}%</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={restart} variant="outline" className="w-full sm:w-auto">
                  {t("examQuizRetake")}
                </Button>
                <Link href={backHref}>
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">{t("examQuizBackToList")}</Button>
                </Link>
              </div>
            </Card>
          </Reveal>

          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold text-foreground px-1">{t("examQuizReview")}</h3>
            {questions.map((question, i) => {
              const userAns = answers[i];
              const ok = userAns === question.correctIndex;
              const loc = getQuestionInLang(question, lang);
              return (
                <Reveal key={`${question.id}-${i}`} delay={i * 0.04}>
                  <Card className="p-4 border-border text-left">
                    <div className="flex gap-2 items-start mb-2">
                      {ok ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm text-foreground font-medium">{loc.text}</p>
                    </div>
                    {question.imageUrl ? (
                      <div className="mb-3">
                        <ExamQuestionFigure url={question.imageUrl} alt={t("examQuizQuestionImageAlt")} />
                      </div>
                    ) : null}
                    <div className="ml-7 mt-3 space-y-2">
                      {loc.options.map((opt, optionIndex) => {
                        const isSelectedOption = userAns === optionIndex;
                        const explanation = loc.optionExplanations[optionIndex];
                        const explanationKey = `${question.id}-${optionIndex}`;
                        const isOpen = Boolean(openExplanations[explanationKey]);
                        return (
                          <div
                            key={explanationKey}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              isSelectedOption
                                ? ok
                                  ? "border-emerald-600 text-foreground"
                                  : "border-red-600 text-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{opt}</span>
                              {explanation ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenExplanations((prev) => ({
                                      ...prev,
                                      [explanationKey]: !prev[explanationKey],
                                    }))
                                  }
                                  className="inline-flex items-center text-primary hover:text-primary/90"
                                  aria-label={t("examQuizShowExplanation")}
                                >
                                  <CircleHelp className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                            {explanation && isOpen ? <p className="mt-2 text-muted-foreground">{explanation}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const q = questions[index];
  if (!q) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">{t("examQuizNoQuestions")}</p>
          <Link href={backHref}>
            <Button variant="outline">{t("examQuizBackToList")}</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const current = getQuestionInLang(q, lang);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <p className="text-sm text-muted-foreground">
            {layoutMode === "step" ? (
              <>
                {t("examQuizQuestion")} {index + 1} {t("examQuizOf")} {questions.length}
              </>
            ) : (
              <>
                {t("examQuizScrollViewSubtitle")} ({questions.length})
              </>
            )}
          </p>
          {countdownActive ? (
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums lg:order-3 ${
                isCritical
                  ? "border-red-600/60 bg-red-500/10 text-red-800 dark:text-red-300"
                  : isWarning
                    ? "border-amber-600/50 bg-amber-500/10 text-amber-950 dark:text-amber-200"
                    : "border-border bg-muted/50 text-foreground"
              }`}
              role="timer"
              aria-live="polite"
              aria-label={countdownFormatted}
            >
              <span>{countdownFormatted}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={requestExit}>
              {t("examQuizBackToList")}
            </Button>
            <div
              role="group"
              aria-label={t("examQuizLayoutModeLabel")}
              className="inline-flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5"
            >
              <button
                type="button"
                onClick={() => setLayoutModeAndSyncIndex("step")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  layoutMode === "step"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SquareStack className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                {t("examQuizLayoutOneByOne")}
              </button>
              <button
                type="button"
                onClick={() => setLayoutModeAndSyncIndex("scroll")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  layoutMode === "scroll"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Scroll className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                {t("examQuizLayoutScroll")}
              </button>
            </div>
          </div>
        </div>

        {layoutMode === "step" ? (
          <Reveal delay={0.06}>
            <Card className="p-8 border-border">
              {q.imageUrl ? <ExamQuestionFigure url={q.imageUrl} alt={t("examQuizQuestionImageAlt")} /> : null}
              <h2 className="text-lg font-semibold text-foreground mb-6 leading-snug">{current.text}</h2>
              <div className="space-y-2">
                {current.options.map((opt, i) => {
                  const hideImmediateFeedback = timedExam;
                  return (
                    <div key={i} className="rounded-xl border border-transparent">
                      <button
                        type="button"
                        onClick={() => setSelected(i)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                          hideImmediateFeedback
                            ? selected === i
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border hover:border-primary/40 text-foreground"
                            : selected === null
                              ? selected === i
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border hover:border-primary/40 text-foreground"
                              : i === q.correctIndex
                                ? "border-emerald-600 text-foreground"
                                : selected === i
                                  ? "border-red-600 text-foreground"
                                  : "border-border text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                      {!hideImmediateFeedback && selected !== null && current.optionExplanations[i] ? (
                        <div className="mt-1 ml-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/90"
                            onClick={() =>
                              setOpenExplanations((prev) => ({
                                ...prev,
                                [`q-${index}-${i}`]: !prev[`q-${index}-${i}`],
                              }))
                            }
                            aria-label={t("examQuizShowExplanation")}
                          >
                            <CircleHelp className="w-3.5 h-3.5" />
                            <span>{t("examQuizShowExplanation")}</span>
                          </button>
                          {openExplanations[`q-${index}-${i}`] ? (
                            <p className="mt-1 text-xs text-muted-foreground">{current.optionExplanations[i]}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={goBack} disabled={index === 0} variant="outline" className="w-full sm:w-auto">
                  {t("examQuizPrevious")}
                </Button>
                <Button
                  onClick={goNext}
                  disabled={selected === null}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground sm:w-auto sm:min-w-[120px]"
                >
                  {isLast ? t("examQuizFinish") : t("examQuizNext")}
                </Button>
              </div>
            </Card>
          </Reveal>
        ) : (
          <>
            <div className="space-y-6">
              {questions.map((question, qIdx) => {
                const loc = getQuestionInLang(question, lang);
                const sel = answers[qIdx] ?? null;
                const hideImmediateFeedback = timedExam;
                return (
                  <Reveal key={question.id} delay={Math.min(qIdx, 10) * 0.03}>
                    <Card className="p-6 sm:p-8 border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-3">
                        {t("examQuizQuestion")} {qIdx + 1} {t("examQuizOf")} {questions.length}
                      </p>
                      {question.imageUrl ? (
                        <ExamQuestionFigure url={question.imageUrl} alt={t("examQuizQuestionImageAlt")} />
                      ) : null}
                      <h2 className="text-lg font-semibold text-foreground mb-6 leading-snug">{loc.text}</h2>
                      <div className="space-y-2">
                        {loc.options.map((opt, optIdx) => (
                          <div key={optIdx} className="rounded-xl border border-transparent">
                            <button
                              type="button"
                              onClick={() => setAnswerAt(qIdx, optIdx)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                                hideImmediateFeedback
                                  ? sel === optIdx
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border hover:border-primary/40 text-foreground"
                                  : sel === null
                                    ? sel === optIdx
                                      ? "border-primary bg-primary/10 text-foreground"
                                      : "border-border hover:border-primary/40 text-foreground"
                                    : optIdx === question.correctIndex
                                      ? "border-emerald-600 text-foreground"
                                      : sel === optIdx
                                        ? "border-red-600 text-foreground"
                                        : "border-border text-foreground"
                              }`}
                            >
                              {opt}
                            </button>
                            {!hideImmediateFeedback && sel !== null && loc.optionExplanations[optIdx] ? (
                              <div className="mt-1 ml-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/90"
                                  onClick={() =>
                                    setOpenExplanations((prev) => ({
                                      ...prev,
                                      [`q-${qIdx}-${optIdx}`]: !prev[`q-${qIdx}-${optIdx}`],
                                    }))
                                  }
                                  aria-label={t("examQuizShowExplanation")}
                                >
                                  <CircleHelp className="w-3.5 h-3.5" />
                                  <span>{t("examQuizShowExplanation")}</span>
                                </button>
                                {openExplanations[`q-${qIdx}-${optIdx}`] ? (
                                  <p className="mt-1 text-xs text-muted-foreground">{loc.optionExplanations[optIdx]}</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={finishScrollMode}
                disabled={!allAnswered}
                title={!allAnswered ? t("examQuizScrollAnswerAllHint") : undefined}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground sm:w-auto sm:min-w-[140px]"
              >
                {t("examQuizFinish")}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
