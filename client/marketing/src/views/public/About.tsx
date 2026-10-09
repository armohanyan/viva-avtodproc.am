"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Target, Eye, Heart, ShieldCheck, Car, CalendarClock, MonitorPlay } from "lucide-react";
import { CountUpText, Reveal } from "src/lib/motion";
import { useMemo } from "react";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import {
  ABOUT_MARKETING_STAT_LABEL_KEY,
  ABOUT_MARKETING_STATS_ORDER,
} from "src/modules/marketing/statLabels";

export default function About() {
  const { t } = useLang();
  const { data: mkt } = useMarketingPublic();

  const storyStats = useMemo(() => {
    const byKey = Object.fromEntries((mkt?.stats ?? []).map((s) => [s.key, s.value])) as Record<string, string>;
    return ABOUT_MARKETING_STATS_ORDER.filter((key) => byKey[key]).map((key) => ({
      value: byKey[key]!,
      label: t((ABOUT_MARKETING_STAT_LABEL_KEY[key] ?? "aboutStatYearsActive") as TranslationKey),
    }));
  }, [mkt, t]);

  const storyHighlights = [
    { icon: ShieldCheck, label: t("aboutChecklistCertified") },
    { icon: Car, label: t("aboutChecklistVehicles") },
    { icon: CalendarClock, label: t("aboutChecklistScheduling") },
    { icon: MonitorPlay, label: t("aboutChecklistPortal") },
  ];

  const values = [
    { icon: Target, title: t("aboutValueSafetyTitle"), desc: t("aboutValueSafetyDesc") },
    { icon: Eye, title: t("aboutValueTransparencyTitle"), desc: t("aboutValueTransparencyDesc") },
    { icon: Heart, title: t("aboutValueStudentTitle"), desc: t("aboutValueStudentDesc") },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-hero text-hero-foreground py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("aboutEyebrow")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("aboutTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg leading-relaxed">{t("aboutSub")}</p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-bold text-foreground mb-5">{t("aboutOurStoryTitle")}</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>{t("aboutText")}</p>
                <p>{t("aboutStoryParagraph2")}</p>
              </div>
              <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {storyHighlights.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                    <span className="leading-snug">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5">
              <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col justify-center">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{t("ourMission")}</h3>
                <p className="text-foreground/80 text-lg leading-relaxed">{t("missionText")}</p>
              </div>
            </div>
          </div>

          {storyStats.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl border border-border bg-accent/40 overflow-hidden">
              {storyStats.map((s, i) => (
                <Reveal
                  key={i}
                  delay={i * 0.06}
                  className={`px-4 py-6 sm:py-8 text-center ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t lg:border-t-0 border-border" : ""} ${i === 2 ? "lg:border-l" : ""}`}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-primary">
                    <CountUpText value={s.value} />
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Values */}
      <section className="py-14 sm:py-20 bg-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t("aboutOurValuesTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <Reveal key={i} className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center" delay={i * 0.06}>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <v.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-3">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
