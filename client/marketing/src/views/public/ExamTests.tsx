"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useLang, type TranslationKey } from "src/lib/i18n";
import {
  THEMATIC_TOPIC_ICON,
  THEMATIC_TOPIC_IDS,
  THEMATIC_TOPIC_TITLE_KEYS,
} from "src/data/thematicTopics";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { ArrowUpRight, CheckCircle2, Lock } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import {
  getExamStats,
  getScopedExamProgress,
  isExamScopeTopicKey,
  isThematicScopeTopicKey,
  progressPercentPassed,
  subscribeExamStatsChanged,
  type ExamStats,
} from "src/lib/examStats";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { vivaApiJson } from "src/lib/vivaApi";

export default function ExamTests() {
  const { t } = useLang();
  const [location] = useLocation();
  const isExamPage = location.startsWith("/exam-tests");
  const { MarketingLink, panelHref } = useAppNavigation();
  const lockedTopicHref = panelHref("/login?redirect=/thematic-questions");
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
  const [colorTopicCountFallback, setColorTopicCountFallback] = useState<number | null>(null);
  const [examCardTitles, setExamCardTitles] = useState<string[]>(() => defaultExamQuestionMeta().examCardTitles);
  const [examCardQuestionIds, setExamCardQuestionIds] = useState<string[][]>(
    () => defaultExamQuestionMeta().examCardQuestionIds,
  );

  const isGenericTopicTitle = (title: string): boolean => /^(Թեմա|Тема|Theme)\s*\d+$/i.test(title.trim());

  const topics = useMemo(
    () =>
      THEMATIC_TOPIC_IDS.map((topicId, i) => {
        const topicSlotId = String(i + 1);
        const totalFromMeta = (thematicCardQuestionIds[i] ?? []).length;
        const total = topicId === "5" && totalFromMeta === 0 && colorTopicCountFallback != null ? colorTopicCountFallback : totalFromMeta;
        const isFree = topicSlotId === "11";
        const titleFromMeta = thematicCardTitles[i]?.trim() ?? "";
        const fallbackTitle = t(THEMATIC_TOPIC_TITLE_KEYS[i] as TranslationKey);

        return {
          iconSrc: THEMATIC_TOPIC_ICON[topicId],
          title: !titleFromMeta || isGenericTopicTitle(titleFromMeta) ? fallbackTitle : titleFromMeta,
          topicId: topicSlotId,
          total,
          isFree,
          href: isFree ? `/thematic-questions/quiz/topics?topic=${topicSlotId}` : lockedTopicHref,
        };
      }),
    [t, lockedTopicHref, thematicCardQuestionIds, thematicCardTitles, colorTopicCountFallback],
  );

  const steps = [
    t("examTestsStep1"),
    t("examTestsStep2"),
    t("examTestsStep3"),
  ];

  useEffect(() => {
    setStats(getExamStats());
    return subscribeExamStatsChanged(() => setStats(getExamStats()));
  }, []);

  useEffect(() => {
    const colorIndex = THEMATIC_TOPIC_IDS.indexOf("5");
    const colorCount = colorIndex >= 0 ? (thematicCardQuestionIds[colorIndex] ?? []).length : 0;
    if (colorCount > 0) {
      setColorTopicCountFallback(null);
      return;
    }
    let mounted = true;
    void vivaApiJson<Array<{ id: string }>>("/exam-questions/pack/thematic/11")
      .then((rows) => {
        if (mounted) setColorTopicCountFallback(Array.isArray(rows) ? rows.length : 0);
      })
      .catch(() => {
        if (mounted) setColorTopicCountFallback(null);
      });
    return () => {
      mounted = false;
    };
  }, [thematicCardQuestionIds]);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const meta = await loadExamQuestionMeta();
      if (mounted) {
        setThematicCardTitles(meta.thematicCardTitles);
        setThematicCardQuestionIds(meta.thematicCardQuestionIds);
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

  // Exam-only total: sum of question counts across the 60 exam ticket cards
  // (do NOT use meta.totalQuestions — that includes thematic questions too).
  const totalExamQuestions = useMemo(
    () => examCardQuestionIds.reduce((sum, row) => sum + row.length, 0),
    [examCardQuestionIds],
  );

  const totalQuestions = useMemo(() => {
    if (isExamPage) return totalExamQuestions;
    return topics.reduce((sum, topic) => sum + topic.total, 0);
  }, [isExamPage, totalExamQuestions, topics]);

  const topicById = useMemo(() => Object.fromEntries(topics.map((topic) => [topic.topicId, topic])), [topics]);
  const scoped = useMemo(
    () => getScopedExamProgress(stats, isExamPage ? "exam" : "thematic"),
    [stats, isExamPage],
  );
  const progressPct = useMemo(
    () => progressPercentPassed(scoped.passed, totalQuestions),
    [scoped.passed, totalQuestions],
  );

  const activeSession = useMemo(() => {
    const s = stats.activeSession;
    if (!s) return null;
    if (isExamPage && isExamScopeTopicKey(s.topicId)) return s;
    if (!isExamPage && isThematicScopeTopicKey(s.topicId)) return s;
    return null;
  }, [stats.activeSession, isExamPage]);

  const activeTopic = activeSession ? topicById[activeSession.topicId] : undefined;

  const activeExamContinueHref = useMemo(() => {
    if (!activeSession || !isExamPage) return null;
    const m = /^exam-ticket-(\d+)$/.exec(activeSession.topicId);
    if (m) return `/exam-tests/quiz/full?ticket=${encodeURIComponent(m[1])}`;
    if (activeSession.topicId === "exam-full") return "/exam-tests/quiz/full";
    if (activeSession.topicId === "exam-signs") return "/exam-tests/quiz/signs";
    return null;
  }, [activeSession, isExamPage]);

  const activeExamTitle = useMemo(() => {
    if (!activeSession || !isExamPage) return "";
    const m = /^exam-ticket-(\d+)$/.exec(activeSession.topicId);
    if (m) {
      const idx = Number(m[1]);
      const title = examCardTitles[idx]?.trim();
      return title || `${t("examTestsNumberedTitle")} ${idx + 1}`;
    }
    if (activeSession.topicId === "exam-full") return t("examTestsModesHeading");
    if (activeSession.topicId === "exam-signs") return t("examTestsModesHeading");
    return activeSession.topicId;
  }, [activeSession, isExamPage, examCardTitles, t]);

  const activeThematicContinueHref = useMemo(() => {
    if (!activeSession || isExamPage) return null;
    if (activeTopic) return `/thematic-questions/quiz/topics?topic=${encodeURIComponent(activeTopic.topicId)}`;
    if (activeSession.topicId === "thematic-full") return "/thematic-questions/quiz/full";
    if (activeSession.topicId === "thematic-signs") return "/thematic-questions/quiz/signs";
    const slot = activeSession.topicId.trim();
    if (/^\d+$/.test(slot)) return `/thematic-questions/quiz/topics?topic=${encodeURIComponent(slot)}`;
    return null;
  }, [activeSession, isExamPage, activeTopic]);

  const activeThematicTitle = useMemo(() => {
    if (!activeSession || isExamPage) return "";
    if (activeTopic) return activeTopic.title;
    if (activeSession.topicId === "thematic-full") return t("examTestsModesHeading");
    if (activeSession.topicId === "thematic-signs") return t("examTestsModesHeading");
    return activeSession.topicId;
  }, [activeSession, isExamPage, activeTopic, t]);

  const activeSessionQuestionTotal = useMemo(() => {
    if (!activeSession) return 0;
    if (isExamPage) {
      const m = /^exam-ticket-(\d+)$/.exec(activeSession.topicId);
      if (m) return (examCardQuestionIds[Number(m[1])] ?? []).length;
      return totalExamQuestions;
    }
    if (activeTopic) return activeTopic.total;
    if (activeSession.topicId === "thematic-full" || activeSession.topicId === "thematic-signs") return totalQuestions;
    return totalQuestions;
  }, [activeSession, isExamPage, activeTopic, examCardQuestionIds, totalExamQuestions, totalQuestions]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">{t("examTestsEyebrow")}</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("examTestsTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("examTestsSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-14 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">{t("examTestsTopicsHeading")}</h2>
          </div>

          {activeSession && (isExamPage ? activeExamContinueHref : activeThematicContinueHref) && (
            <Card className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                    {t("examTestsActiveSession")}
                  </p>
                  <p className="text-sm text-foreground truncate">
                    {isExamPage ? activeExamTitle : activeThematicTitle}
                  </p>
                </div>
                <MarketingLink
                  href={(isExamPage ? activeExamContinueHref : activeThematicContinueHref) ?? "/thematic-questions"}
                >
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("examTestsContinueSession")}
                  </Button>
                </MarketingLink>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-background/80 p-2">
                  <p className="text-[11px] text-muted-foreground">{t("examQuizQuestion")}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {activeSession.answered}/{Math.max(activeSessionQuestionTotal, activeSession.answered)}
                  </p>
                </div>
                <div className="rounded-lg bg-background/80 p-2">
                  <p className="text-[11px] text-muted-foreground">{t("examTestsPositiveResult")}</p>
                  <p className="text-sm font-semibold text-emerald-600">{activeSession.correct}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-2">
                  <p className="text-[11px] text-muted-foreground">{t("examTestsNegativeResult")}</p>
                  <p className="text-sm font-semibold text-rose-500">{activeSession.wrong}</p>
                </div>
              </div>
            </Card>
          )}

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
            <p className="text-xs text-muted-foreground">{t("examTestsExamResultsLabel")}</p>
          </div>

          <div className="space-y-4">
            {topics.map((topic, i) => {
              const topicStats = stats.topicStats[topic.topicId] ?? {
                answered: 0,
                correct: 0,
                wrong: 0,
                attempts: 0,
                bestPct: 0,
                lastPct: 0,
                bestCorrect: 0,
                bestAnswered: 0,
                lastCorrect: 0,
                lastAnswered: 0,
              };
              const topicPct = topic.total > 0 ? Math.min(100, Math.round((topicStats.answered / topic.total) * 100)) : 0;
              return (
              <Reveal key={`${topic.title}-${i}`} delay={i * 0.05}>
                <Card
                  className={`group rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                    topic.isFree ? "border-primary/30 shadow-primary/5" : "border-border"
                  }`}
                >
                  <MarketingLink href={topic.href} className="block p-3.5 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                          topic.isFree ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border"
                        }`}
                      >
                        {topic.iconSrc ? (
                          <img src={topic.iconSrc} alt="" className="w-5 h-5" />
                        ) : (
                          <span className="sr-only">{topic.title}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm sm:text-[15px] text-foreground leading-snug">{topic.title}</p>
                          <div className="text-xs font-medium text-muted-foreground shrink-0">
                            {topicStats.answered}/{topic.total}
                          </div>
                        </div>

                        <div className="mt-2.5 h-1.5 w-full rounded-full bg-accent overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${topic.isFree ? "bg-amber-400/90" : "bg-muted-foreground/20"}`}
                            style={{ width: `${topicPct}%` }}
                          />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                          {topic.isFree ? (
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                              {t("examTestsFreeTopic")}
                            </span>
                          ) : (
                            <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                              <Lock className="w-3.5 h-3.5" />
                              <span>{t("examTestsSignInContinueShort")}</span>
                            </div>
                          )}

                          <div
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              topic.isFree ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            <span>{topic.isFree ? t("examTestsStartNow") : t("examTestsViewTopic")}</span>
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

      <section className="py-20 bg-accent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 sm:mb-10 text-center">{t("examTestsHowTitle")}</h2>
          <ol className="space-y-6">
            {steps.map((text, i) => (
              <li key={i} className="flex gap-4">
                <Reveal delay={i * 0.06}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                    {i + 1}
                  </div>
                </Reveal>
                <Reveal delay={i * 0.06 + 0.03}>
                  <div className="flex gap-3 pt-1">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">{t("examTestsCtaTitle")}</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">{t("examTestsCtaSub")}</p>
          <Reveal>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={panelHref("/login?redirect=/thematic-questions")}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                  {t("examTestsSignInToPractice")}
                </Button>
              </a>
              <MarketingLink href="/packages">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent px-8">
                  {t("packages")}
                </Button>
              </MarketingLink>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
