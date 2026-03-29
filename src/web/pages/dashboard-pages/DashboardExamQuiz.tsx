import { useMemo, useState } from "react";
import { Link, Redirect, useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getQuestionInLang,
  selectQuestionsForMode,
  type ExamQuizMode,
} from "@/data/examSampleQuestions";
import { CheckCircle2, XCircle } from "lucide-react";

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
    setSelected(null);
    if (isLast) {
      setIndex(questions.length);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
  };

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <p className="text-slate-600 mb-4">{t("examQuizNoQuestions")}</p>
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
          <Card className="p-8 border-slate-100 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("examQuizResultsTitle")}</h2>
            <p className="text-slate-500 mb-6">{t("examQuizScoreLabel")}</p>
            <p className="text-5xl font-bold text-blue-600 mb-2">
              {correctCount}/{total}
            </p>
            <p className="text-sm text-slate-400 mb-8">{pct}%</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={restart} variant="outline" className="w-full sm:w-auto">
                {t("examQuizRetake")}
              </Button>
              <Link href="/dashboard/exam-tests">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">{t("examQuizBackToList")}</Button>
              </Link>
            </div>
          </Card>

          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 px-1">{t("examQuizReview")}</h3>
            {questions.map((question, i) => {
              const userAns = answers[i];
              const ok = userAns === question.correctIndex;
              const loc = getQuestionInLang(question, lang);
              return (
                <Card key={`${question.id}-${i}`} className="p-4 border-slate-100 text-left">
                  <div className="flex gap-2 items-start mb-2">
                    {ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-slate-800 font-medium">{loc.text}</p>
                  </div>
                  <p className="text-xs text-slate-500 ml-7">
                    {t("examQuizYourAnswer")}: {userAns !== null && userAns !== undefined ? loc.options[userAns] : "—"}
                  </p>
                  {!ok && (
                    <p className="text-xs text-emerald-700 ml-7 mt-1">
                      {t("examQuizCorrectAnswer")}: {loc.options[question.correctIndex]}
                    </p>
                  )}
                </Card>
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
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">
            {t("examQuizQuestion")} {index + 1} {t("examQuizOf")} {questions.length}
          </p>
          <Link href="/dashboard/exam-tests">
            <Button variant="ghost" size="sm" className="text-slate-500">
              {t("examQuizBackToList")}
            </Button>
          </Link>
        </div>

        <Card className="p-8 border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 leading-snug">{current.text}</h2>
          <div className="space-y-2">
            {current.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  selected === i
                    ? "border-blue-600 bg-blue-50 text-slate-900"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <Button
              onClick={goNext}
              disabled={selected === null}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {isLast ? t("examQuizFinish") : t("examQuizNext")}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
