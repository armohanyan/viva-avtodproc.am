"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { CheckCircle2, Target, Eye, Heart } from "lucide-react";
import { CountUpText, Reveal } from "src/lib/motion";

export default function About() {
  const { t } = useLang();

  const values = [
    { icon: Target, title: t("aboutValueSafetyTitle"), desc: t("aboutValueSafetyDesc") },
    { icon: Eye, title: t("aboutValueTransparencyTitle"), desc: t("aboutValueTransparencyDesc") },
    { icon: Heart, title: t("aboutValueStudentTitle"), desc: t("aboutValueStudentDesc") },
  ];

  const milestones = [
    { year: "2022", event: t("aboutMilestone2022") },
    { year: "2023", event: t("aboutMilestone2023") },
    { year: "2024", event: t("aboutMilestone2024") },
    { year: "2025", event: t("aboutMilestone2025") },
    { year: "2026", event: t("aboutMilestone2026") },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-hero text-hero-foreground py-20">
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
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">{t("aboutOurStoryTitle")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t("aboutText")}</p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {t("aboutStoryParagraph2")}
              </p>
              <ul className="space-y-3">
                {[t("aboutChecklistCertified"), t("aboutChecklistVehicles"), t("aboutChecklistScheduling"), t("aboutChecklistPortal")].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary to-primary/60 rounded-2xl p-6 sm:p-8 md:p-10 text-primary-foreground">
              <h3 className="text-2xl font-bold mb-4">{t("ourMission")}</h3>
              <p className="text-primary-foreground/80 leading-relaxed text-lg">{t("missionText")}</p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { v: "3,200+", l: t("aboutStatGraduates") },
                  { v: "94%", l: t("aboutStatPassRate") },
                  { v: "18", l: t("aboutStatInstructors") },
                  { v: "14", l: t("aboutStatYearsActive") },
                ].map((s, i) => (
                  <Reveal key={i} delay={i * 0.06}>
                    <div className="text-3xl font-bold">
                      <CountUpText value={s.v} />
                    </div>
                    <div className="text-primary-foreground/80 text-sm">{s.l}</div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-accent">
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

      {/* Timeline */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t("aboutOurJourneyTitle")}</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <Reveal key={i} delay={i * 0.05} className="flex gap-6 items-start">
                  <div className="relative z-10 w-16 h-16 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">{m.year}</span>
                  </div>
                  <div className="bg-accent rounded-xl p-4 flex-1 mt-3">
                    <p className="text-muted-foreground font-medium">{m.event}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
