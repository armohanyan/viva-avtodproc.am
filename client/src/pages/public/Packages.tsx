"use client";

import { useMemo } from "react";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { CheckCircle2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { CountUpText, Reveal } from "src/lib/motion";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { usePackages } from "src/modules/packages/usePackages";

export default function Packages() {
  const { t } = useLang();
  const { panelHref } = useAppNavigation();
  const { packages, loading } = usePackages();
  const sorted = useMemo(() => [...packages].sort((a, b) => a.lessons - b.lessons), [packages]);

  const faqs = [
    {
      q: t("packagesFaqUpgradeQ"),
      a: t("packagesFaqUpgradeA"),
    },
    {
      q: t("packagesFaqLessonsExpireQ"),
      a: t("packagesFaqLessonsExpireA"),
    },
    {
      q: t("packagesFaqFailExamQ"),
      a: t("packagesFaqFailExamA"),
    },
    {
      q: t("packagesFaqInstallmentsQ"),
      a: t("packagesFaqInstallmentsA"),
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("packagesEyebrow")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("packagesTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("packagesSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">{t("loading")}</p>
          ) : sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t("packagesSub")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {sorted.map((pkg, i) => {
                const popular = pkg.id === "PKG-002";
                return (
                  <Reveal
                    key={pkg.id}
                    className={`relative rounded-2xl border-2 ${popular ? "border-primary shadow-xl" : "border-border shadow-sm"} p-6 sm:p-8 flex flex-col h-full`}
                    delay={i * 0.06}
                  >
                    {popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-4 py-1">{t("mostPopular")}</Badge>
                      </div>
                    )}
                    {pkg.imageUrl ? (
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-border bg-muted mb-5 -mt-1">
                        <img src={pkg.imageUrl} alt={pkg.name} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    ) : null}
                    <h3 className="font-bold text-xl text-foreground mb-2">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-foreground">
                        <CountUpText value={pkg.price} />
                      </span>
                      <span className="text-muted-foreground">֏</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-7">
                      {pkg.lessons} {t("lessons")}
                    </p>
                    <ul className="space-y-3 mb-8">
                      {pkg.features.map((feat, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-foreground">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <a href={panelHref("/register")}>
                        <Button
                          className={`w-full ${
                            popular
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : "bg-accent hover:bg-accent/80 text-foreground"
                          }`}
                        >
                          {t("choosePackage")}
                        </Button>
                      </a>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-accent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 sm:mb-12 text-center">
            {t("packagesFaqTitle")}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.06} className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h4 className="font-semibold text-foreground mb-2">{faq.q}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
