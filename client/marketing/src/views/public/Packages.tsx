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
import PackagePromoImage from "src/components/PackagePromoImage";

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

      <section className="bg-hero text-hero-foreground py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("packagesTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("packagesSub")}</p>
          </div>
        </div>
      </section>

      {(loading || sorted.length > 0) && (
        <section className="py-14 sm:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">{t("loading")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {sorted.map((pkg, i) => {
                  const popular = pkg.id === "PKG-002";
                  return (
                    <Reveal
                      key={pkg.id}
                      className={`relative rounded-xl border ${popular ? "border-primary shadow-lg" : "border-border shadow-sm"} bg-card overflow-visible p-0 flex flex-col h-full`}
                      delay={i * 0.04}
                    >
                      {popular && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">{t("mostPopular")}</Badge>
                        </div>
                      )}
                      <PackagePromoImage src={pkg.imageUrl} alt={pkg.name} className="rounded-t-xl" compact />
                      <div className="p-4 flex flex-col flex-1 min-h-0">
                        <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 mb-1.5" title={pkg.name}>
                          {pkg.name}
                        </h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-foreground">
                            <CountUpText value={pkg.price} />
                          </span>
                          <span className="text-sm text-muted-foreground">֏</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                          {pkg.lessons} {t("lessonTypePractical").toLowerCase()} · {pkg.theoryLessons}{" "}
                          {t("lessonTypeTheory").toLowerCase()}
                        </p>
                        {pkg.features.length > 0 ? (
                          <ul className="space-y-1.5 mb-4">
                            {pkg.features.map((feat, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-px text-primary shrink-0" />
                                <span className="text-foreground">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-auto">
                          <a href={panelHref("/register")}>
                            <Button
                              size="sm"
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
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="py-14 sm:py-20 bg-accent">
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
