import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { useLang } from "src/lib/i18n";
import { Reveal } from "src/lib/motion";
import { getExamStats, type ExamStats } from "src/lib/examStats";

export default function DashboardThematicTests() {
  const { t } = useLang();
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

  const topics = [
    { iconSrc: "/topic-icons/varir-theme-5.svg", title: t("examTestsTopic1Title"), total: 147, topicId: "5" },
    { iconSrc: "/topic-icons/varir-theme-3.svg", title: t("examTestsTopic2Title"), total: 72, topicId: "3" },
    { iconSrc: "/topic-icons/varir-theme-2.svg", title: t("examTestsTopic3Title"), total: 78, topicId: "2" },
    { iconSrc: "/topic-icons/varir-theme-6.svg", title: t("examTestsTopic4Title"), total: 176, topicId: "6" },
    { iconSrc: "/topic-icons/varir-theme-8.svg", title: t("examTestsTopic5Title"), total: 135, topicId: "8" },
    { iconSrc: "/topic-icons/varir-theme-7.svg", title: t("examTestsTopic6Title"), total: 95, topicId: "7" },
    { iconSrc: "/topic-icons/varir-theme-10.svg", title: t("examTestsTopic7Title"), total: 134, topicId: "10" },
    { iconSrc: "/topic-icons/varir-theme-4.svg", title: t("examTestsTopic8Title"), total: 80, topicId: "4" },
    { iconSrc: "/topic-icons/varir-theme-9.svg", title: t("examTestsTopic9Title"), total: 126, topicId: "9" },
    { iconSrc: "/topic-icons/varir-theme-1.svg", title: t("examTestsTopic10Title"), total: 51, topicId: "1" },
  ];

  useEffect(() => {
    setStats(getExamStats());
  }, []);

  const totalQuestions = 1094;
  const progressPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Number(((stats.answered / totalQuestions) * 100).toFixed(1)));
  }, [stats.answered]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <PanelPageHeader className="mb-6" title="Թեմատիկ թեստեր" subtitle="Հանրային էջի նույն թեմատիկ քարտերը՝ բոլորն ամբողջությամբ բաց։" />

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/dashboard/learn/exam-tests"
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            Քննական թեստեր
          </Link>
          <Link
            href="/dashboard/learn/thematic-tests"
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
          >
            Թեմատիկ թեստեր
          </Link>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">{t("examTestsTopicsHeading")}</h2>
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
        </Card>

        <div className="flex justify-end mb-3">
          <p className="text-xs text-muted-foreground">{t("examTestsExamResultsLabel")}</p>
        </div>

        <div className="space-y-4">
          {topics.map((topic, i) => {
            const topicStats = stats.topicStats[topic.topicId] ?? { answered: 0 };
            const topicPct = topic.total > 0 ? Math.min(100, Math.round((topicStats.answered / topic.total) * 100)) : 0;
            const href = `/thematic-questions/quiz/topics?topic=${topic.topicId}`;

            return (
              <Reveal key={`${topic.topicId}-${i}`} delay={i * 0.05}>
                <Card className="group rounded-2xl border border-primary/30 bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <Link href={href} className="block p-3.5 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-amber-50 border-amber-200">
                        <img src={topic.iconSrc} alt={topic.title} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm sm:text-[15px] text-foreground leading-snug">{topic.title}</p>
                          <div className="text-xs font-medium text-muted-foreground shrink-0">
                            {topicStats.answered}/{topic.total}
                          </div>
                        </div>

                        <div className="mt-2.5 h-1.5 w-full rounded-full bg-accent overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500 bg-amber-400/90" style={{ width: `${topicPct}%` }} />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                            Բաց է
                          </span>

                          <div className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <span>{t("examTestsStartNow")}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
