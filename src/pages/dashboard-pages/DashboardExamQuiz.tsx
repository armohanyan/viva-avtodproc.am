import { useEffect, useMemo, useState } from "react";
import { Link, Redirect, useRoute } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import {
  getQuestionInLang,
  selectQuestionsForMode,
  type ExamQuizMode,
} from "src/data/examSampleQuestions";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { CountUpText, Reveal } from "src/lib/motion";

const VALID_MODES: ExamQuizMode[] = ["full", "topics", "signs"];

function isExamMode(s: string): s is ExamQuizMode {
  return VALID_MODES.includes(s as ExamQuizMode);
}

export default function DashboardExamQuiz() {
  const { t, lang } = useLang();
  const [match, params] = useRoute("/dashboard/exam-tests/quiz/:mode");
  const modeParam = params?.mode ?? "";
  const mode: ExamQuizMode | null = isExamMode(modeParam) ? modeParam : null;

  const [round, setRound] = useState(0);
  const questions = useMemo(() => {
    if (!mode) return [];
    return selectQuestionsForMode(mode);
  }, [mode, round]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => []);
  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});

  const finished = Boolean(mode && questions.length > 0 && index >= questions.length);

  const correctCount = useMemo(() => {
    if (!finished) return 0;
    return questions.reduce((acc, question, i) => {
      const a = answers[i];
      if (a === null || a === undefined) return acc;
      return acc + (a === question.correctIndex ? 1 : 0);
    }, 0);
  }, [finished, questions, answers]);

  if (!match || !mode) {
    return <Redirect to="/dashboard/exam-tests" />;
  }

  const q = questions[index];
  const isLast = questions.length > 0 && index === questions.length - 1;

  const goNext = () => {
    if (selected === null || !q) return;
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
    if (index === 0 || !q) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = selected;
    setAnswers(nextAnswers);
    setIndex((i) => Math.max(0, i - 1));
  };

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setOpenExplanations({});
  };

  useEffect(() => {
    if (finished) return;
    setSelected(answers[index] ?? null);
  }, [index, answers, finished]);

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">{t("examQuizNoQuestions")}</p>
          <Link href="/dashboard/exam-tests">
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
              <p className="text-muted-foreground mb-6">{t("examQuizScoreLabel")}</p>
              <p className="text-5xl font-bold text-primary mb-2">
                <CountUpText value={correctCount} />/{total}
              </p>
              <p className="text-sm text-muted-foreground mb-8">{pct}%</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={restart} variant="outline" className="w-full sm:w-auto">
                  {t("examQuizRetake")}
                </Button>
                <Link href="/dashboard/exam-tests">
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

  const current = getQuestionInLang(q, lang);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t("examQuizQuestion")} {index + 1} {t("examQuizOf")} {questions.length}
          </p>
          <Link href="/dashboard/exam-tests">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              {t("examQuizBackToList")}
            </Button>
          </Link>
        </div>

        <Reveal delay={0.06}>
          <Card className="p-8 border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6 leading-snug">{current.text}</h2>
            <div className="space-y-2">
              {current.options.map((opt, i) => (
                <div key={i} className="rounded-xl border border-transparent">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                      selected === null
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
                  {selected !== null && current.optionExplanations[i] ? (
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
              ))}
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
      </div>
    </DashboardLayout>
  );
}
