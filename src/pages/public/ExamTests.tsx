"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "src/lib/i18n";
import { ArrowUpRight, CheckCircle2, Lock } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { getExamStats, type ExamStats } from "src/lib/examStats";

export default function ExamTests() {
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

  const signInRedirectHref = "/login?redirect=/thematic-questions";

  const topics = [
    {
      iconSrc: "/topic-icons/varir-theme-5.svg",
      title: t("examTestsTopic1Title"),
      done: 0,
      total: 147,
      isFree: true,
      topicId: "5",
      href: "/thematic-questions/quiz/topics?topic=5",
    },
    {
      iconSrc: "/topic-icons/varir-theme-3.svg",
      title: t("examTestsTopic2Title"),
      done: 0,
      total: 72,
      isFree: false,
      topicId: "3",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-2.svg",
      title: t("examTestsTopic3Title"),
      done: 0,
      total: 78,
      isFree: false,
      topicId: "2",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-6.svg",
      title: t("examTestsTopic4Title"),
      done: 0,
      total: 176,
      isFree: false,
      topicId: "6",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-8.svg",
      title: t("examTestsTopic5Title"),
      done: 0,
      total: 135,
      isFree: false,
      topicId: "8",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-7.svg",
      title: t("examTestsTopic6Title"),
      done: 0,
      total: 95,
      isFree: false,
      topicId: "7",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-10.svg",
      title: t("examTestsTopic7Title"),
      done: 0,
      total: 134,
      isFree: false,
      topicId: "10",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-4.svg",
      title: t("examTestsTopic8Title"),
      done: 0,
      total: 80,
      isFree: false,
      topicId: "4",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-9.svg",
      title: t("examTestsTopic9Title"),
      done: 0,
      total: 126,
      isFree: false,
      topicId: "9",
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-1.svg",
      title: t("examTestsTopic10Title"),
      done: 0,
      total: 51,
      isFree: false,
      topicId: "1",
      href: signInRedirectHref,
    },
  ];

  const steps = [
    t("examTestsStep1"),
    t("examTestsStep2"),
    t("examTestsStep3"),
  ];

  useEffect(() => {
    setStats(getExamStats());
  }, []);

  const totalQuestions = 1094;
  const topicById = useMemo(() => Object.fromEntries(topics.map((topic) => [topic.topicId, topic])), [topics]);
  const progressPct = useMemo(() => {
    if (totalQuestions <= 0) return 0;
    return Math.min(100, Number(((stats.answered / totalQuestions) * 100).toFixed(1)));
  }, [stats.answered]);
  const activeTopic = stats.activeSession ? topicById[stats.activeSession.topicId] : undefined;

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

          {stats.activeSession && activeTopic && (
            <Card className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                    {t("examTestsActiveSession")}
                  </p>
                  <p className="text-sm text-foreground truncate">{activeTopic.title}</p>
                </div>
                <a href={`/thematic-questions/quiz/topics?topic=${activeTopic.topicId}`}>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("examTestsContinueSession")}
                  </Button>
                </a>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-background/80 p-2">
                  <p className="text-[11px] text-muted-foreground">{t("examQuizQuestion")}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {stats.activeSession.answered}/{activeTopic.total}
                  </p>
                </div>
                <div className="rounded-lg bg-background/80 p-2">
                  <p className="text-[11px] text-muted-foreground">{t("examTestsPositiveResult")}</p>
                  <p className="text-sm font-semibold text-emerald-600">{stats.activeSession.correct}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-2">
                  <p className="text-[11px] text-muted-foreground">{t("examTestsNegativeResult")}</p>
                  <p className="text-sm font-semibold text-rose-500">{stats.activeSession.wrong}</p>
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
                  <a href={topic.href} className="block p-3.5 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                          topic.isFree ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border"
                        }`}
                      >
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
                  </a>
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
              <a href="/login?redirect=/thematic-questions">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                  {t("examTestsSignInToPractice")}
                </Button>
              </a>
              <a href="/packages">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent px-8">
                  {t("packages")}
                </Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
