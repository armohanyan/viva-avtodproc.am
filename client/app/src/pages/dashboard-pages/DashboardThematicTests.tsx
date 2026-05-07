import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { useLang, type TranslationKey } from "src/lib/i18n";
import {
  THEMATIC_TOPIC_ICON,
  THEMATIC_TOPIC_IDS,
  THEMATIC_TOPIC_TITLE_KEYS,
} from "src/data/thematicTopics";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { useExamQuestionPool } from "src/modules/exam/useExamQuestionPool";
import { Reveal } from "src/lib/motion";
import { getExamStats, subscribeExamStatsChanged, type ExamStats } from "src/lib/examStats";

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
  const [thematicCardTitles, setThematicCardTitles] = useState<string[]>(() => defaultExamQuestionMeta().thematicCardTitles);
  const [thematicCardQuestionIds, setThematicCardQuestionIds] = useState<string[][]>(
    () => defaultExamQuestionMeta().thematicCardQuestionIds,
  );

  const pool = useExamQuestionPool();

  const topics = useMemo(
    () => {
      const validIds = new Set(pool.map((q) => q.id));
      return (
      THEMATIC_TOPIC_IDS.map((topicId, i) => ({
        iconSrc: THEMATIC_TOPIC_ICON[topicId],
        title: thematicCardTitles[i] || t(THEMATIC_TOPIC_TITLE_KEYS[i] as TranslationKey),
        total: (thematicCardQuestionIds[i] ?? []).filter((id) => validIds.has(id)).length,
        topicId,
      }))
    );
    },
    [pool, t, thematicCardQuestionIds, thematicCardTitles],
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
        setThematicCardTitles(meta.thematicCardTitles);
        setThematicCardQuestionIds(meta.thematicCardQuestionIds);
      }
    };
    void sync();
    const off = subscribeExamQuestionMetaUpdated(() => void sync());
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const topicById = useMemo(() => Object.fromEntries(topics.map((topic) => [topic.topicId, topic])), [topics]);
  const activeTopic = stats.activeSession ? topicById[stats.activeSession.topicId] : undefined;

  const totalQuestions = useMemo(
    () => pool.filter((q) => q.category === "rules" || q.category === "safety").length,
    [pool],
  );
  const progressPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Number(((stats.answered / totalQuestions) * 100).toFixed(1)));
  }, [stats.answered]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <PanelPageHeader
          className="mb-4 sm:mb-6"
          title={t("dashboardLearnThematicTests")}
          subtitle={t("dashboardLearnThematicSubtitle")}
        />

        <DashboardLearnSubnav active="thematic" />

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

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">{t("examTestsStatAttempts")}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{stats.attempts}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">{t("examTestsStatBest")}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{stats.bestPct}%</p>
              {stats.activeSession && activeTopic && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stats.topicStats[activeTopic.topicId]?.bestCorrect ?? 0}/{stats.topicStats[activeTopic.topicId]?.bestAnswered ?? 0}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">{t("examTestsStatLast")}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{stats.lastPct}%</p>
              {stats.activeSession && activeTopic && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stats.topicStats[activeTopic.topicId]?.lastCorrect ?? 0}/{stats.topicStats[activeTopic.topicId]?.lastAnswered ?? 0}
                </p>
              )}
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
            const href = `/dashboard/learn/exam-tests/quiz/topics?topic=${topic.topicId}`;

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
                            {t("dashboardThematicTopicUnlocked")}
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
