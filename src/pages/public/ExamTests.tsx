import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { CheckCircle2, Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "src/components/ui/button";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";

export default function ExamTests() {
  const { t } = useLang();

  const signInRedirectHref = "/login?redirect=/exam-tests";

  const topics = [
    {
      iconSrc: "/topic-icons/varir-theme-5.svg",
      title: "Маневрирование, расположение транспортных средств на проезжей части, преимущество при движении",
      done: 0,
      total: 147,
      isFree: true,
      href: "/exam-tests/quiz/topics",
    },
    {
      iconSrc: "/topic-icons/varir-theme-3.svg",
      title: "Закон РА „Об обеспечении безопасности дорожного движения\"",
      done: 0,
      total: 72,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-2.svg",
      title: "Эксплуатация ТС",
      done: 0,
      total: 78,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-6.svg",
      title: "Дорожные знаки и дорожная разметка",
      done: 0,
      total: 176,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-8.svg",
      title: "Перекресток (со знаками, без знаков)",
      done: 0,
      total: 135,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-7.svg",
      title: "Перекресток (регулируемый, со светофором )",
      done: 0,
      total: 95,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-10.svg",
      title: "Дорожная разметка, остановка, парковка",
      done: 0,
      total: 134,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-4.svg",
      title: "Скорость, буксировка, перевозка людей и грузов",
      done: 0,
      total: 80,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-9.svg",
      title: "Предупреждающие знаки, специальные знаки, обгон",
      done: 0,
      total: 126,
      isFree: false,
      href: signInRedirectHref,
    },
    {
      iconSrc: "/topic-icons/varir-theme-1.svg",
      title: "Первая медицинская помощь",
      done: 0,
      total: 51,
      isFree: false,
      href: signInRedirectHref,
    },
  ];

  const steps = [
    t("examTestsStep1"),
    t("examTestsStep2"),
    t("examTestsStep3"),
  ];

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
            <h2 className="text-2xl font-bold text-foreground">Թեմաներ</h2>
          </div>

          <Card className="rounded-xl border border-border p-4 sm:p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Իմ պրոգրեսը</p>
              <p className="text-xs text-muted-foreground">0%</p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-accent mb-3">
              <div className="h-1.5 w-[2%] rounded-full bg-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-accent/40 p-3">
                <p className="text-emerald-600 font-semibold text-sm">0 / 1094</p>
                <p className="text-xs text-muted-foreground">Դրական արդյունք</p>
              </div>
              <div className="rounded-lg bg-accent/40 p-3">
                <p className="text-rose-500 font-semibold text-sm">0 / 1094</p>
                <p className="text-xs text-muted-foreground">Բացասական արդյունք</p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end mb-3">
            <p className="text-xs text-muted-foreground">Քննության արդյունքը:</p>
          </div>

          <div className="space-y-3">
            {topics.map((topic, i) => (
              <Reveal key={`${topic.title}-${i}`} delay={i * 0.05}>
                <Card className="rounded-xl border border-border bg-card/90">
                  <Link href={topic.href} className="block p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                        <img src={topic.iconSrc} alt={topic.title} className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{topic.title}</p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {topic.done}/{topic.total}
                      </div>
                    </div>
                    <div className="mt-3 h-1 w-full rounded-full bg-accent" />
                    {!topic.isFree && (
                      <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sign in to continue</span>
                      </div>
                    )}
                  </Link>
                </Card>
              </Reveal>
            ))}
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
              <Link href="/login?redirect=/dashboard/exam-tests">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                  {t("examTestsSignInToPractice")}
                </Button>
              </Link>
              <Link href="/packages">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent px-8">
                  {t("packages")}
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
