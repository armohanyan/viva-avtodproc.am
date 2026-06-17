"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "src/lib/i18n";
import { SIGNS_CARD_COUNT } from "src/data/signCategories";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { ArrowUpRight, Lock, Signpost } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import {
  getExamStats,
  getScopedExamProgress,
  isRoadSignsScopeTopicKey,
  progressPercentPassed,
  subscribeExamStatsChanged,
  type ExamStats,
} from "src/lib/examStats";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";

export default function RoadSigns() {
  const { t } = useLang();
  const { MarketingLink, panelHref } = useAppNavigation();
  const lockedCategoryHref = panelHref("/login?redirect=/road-signs");
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
  const [signsCardTitles, setSignsCardTitles] = useState<string[]>(() => defaultExamQuestionMeta().signsCardTitles);
  const [signsCardQuestionIds, setSignsCardQuestionIds] = useState<string[][]>(
    () => defaultExamQuestionMeta().signsCardQuestionIds,
  );

  const categories = useMemo(
    () =>
      Array.from({ length: SIGNS_CARD_COUNT }, (_, i) => {
        const slotId = String(i + 1);
        const titleFromMeta = signsCardTitles[i]?.trim() ?? "";
        const isFree = slotId === "1";
        return {
          title: titleFromMeta || `${t("dashboardLearnRoadSigns")} ${slotId}`,
          slotId,
          total: (signsCardQuestionIds[i] ?? []).length,
          isFree,
          href: isFree ? `/road-signs/quiz/topics?topic=${slotId}` : lockedCategoryHref,
        };
      }),
    [t, lockedCategoryHref, signsCardQuestionIds, signsCardTitles],
  );

  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.slotId, c])), [categories]);

  useEffect(() => {
    setStats(getExamStats());
    return subscribeExamStatsChanged(() => setStats(getExamStats()));
  }, []);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const meta = await loadExamQuestionMeta();
      if (mounted) {
        setSignsCardTitles(meta.signsCardTitles);
        setSignsCardQuestionIds(meta.signsCardQuestionIds);
      }
    };
    void sync();
    const off = subscribeExamQuestionMetaUpdated(() => void sync());
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const totalQuestions = useMemo(() => categories.reduce((sum, c) => sum + c.total, 0), [categories]);
  const scoped = useMemo(() => getScopedExamProgress(stats, "road-signs"), [stats]);
  const progressPct = useMemo(
    () => progressPercentPassed(scoped.passed, totalQuestions),
    [scoped.passed, totalQuestions],
  );

  const activeSession = useMemo(() => {
    const s = stats.activeSession;
    if (!s || !isRoadSignsScopeTopicKey(s.topicId)) return null;
    return s;
  }, [stats.activeSession]);

  const activeCategory = useMemo(() => {
    if (!activeSession) return undefined;
    const m = /^road-signs-(\d+)$/.exec(activeSession.topicId);
    if (!m) return undefined;
    return categoryById[m[1]];
  }, [activeSession, categoryById]);

  const activeContinueHref = useMemo(() => {
    if (!activeSession) return null;
    const m = /^road-signs-(\d+)$/.exec(activeSession.topicId);
    if (m) return `/road-signs/quiz/topics?topic=${encodeURIComponent(m[1])}`;
    if (activeSession.topicId === "road-signs-full") return "/road-signs/quiz/full";
    return null;
  }, [activeSession]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">{t("roadSignsEyebrow")}</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("dashboardLearnRoadSigns")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("roadSignsSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-14 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">{t("roadSignsCategoriesHeading")}</h2>
          </div>

          {activeSession && activeContinueHref && (
            <Card className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold">{t("examTestsActiveSession")}</p>
                  <p className="text-sm text-foreground truncate">{activeCategory?.title ?? t("dashboardLearnRoadSigns")}</p>
                </div>
                <MarketingLink href={activeContinueHref}>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("examTestsContinueSession")}
                  </Button>
                </MarketingLink>
              </div>
            </Card>
          )}

          <Card className="rounded-xl border border-border p-4 sm:p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t("examTestsMyProgress")}</p>
              <p className="text-xs text-muted-foreground">{progressPct}%</p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-accent mb-3">
              <div className="h-1.5 rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
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

          <div className="space-y-4">
            {categories.map((category, i) => {
              const topicKey = `road-signs-${category.slotId}`;
              const topicStats = stats.topicStats[topicKey] ?? { answered: 0 };
              const topicPct = category.total > 0 ? Math.min(100, Math.round((topicStats.answered / category.total) * 100)) : 0;

              return (
                <Reveal key={`${category.slotId}-${i}`} delay={i * 0.05}>
                  <Card className="group rounded-2xl border border-primary/30 bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                    <MarketingLink href={category.href} className="block p-3.5 sm:p-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-200 text-blue-700">
                          <Signpost className="w-5 h-5" aria-hidden />
                        </div>

                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm sm:text-[15px] text-foreground leading-snug">{category.title}</p>
                            <div className="text-xs font-medium text-muted-foreground shrink-0">
                              {topicStats.answered}/{category.total}
                            </div>
                          </div>

                          <div className="mt-2.5 h-1.5 w-full rounded-full bg-accent overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500 bg-blue-400/90" style={{ width: `${topicPct}%` }} />
                          </div>

                          <div className="mt-2.5 flex items-center justify-between">
                            {category.isFree ? (
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                                {t("examTestsFreeTopic")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-accent px-2.5 py-1 rounded-full">
                                <Lock className="w-3 h-3" aria-hidden />
                                {t("examTestsViewTopic")}
                              </span>
                            )}

                            <div className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                              <span>{t("examTestsStartNow")}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </MarketingLink>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
