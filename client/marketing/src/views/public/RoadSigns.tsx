"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "src/lib/i18n";
import { SIGNS_CARD_COUNT } from "src/data/signCategories";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { ArrowUpRight, Lock, Signpost } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";

export default function RoadSigns() {
  const { t } = useLang();
  const { MarketingLink, panelHref } = useAppNavigation();
  const lockedCategoryHref = panelHref("/login?redirect=/road-signs");
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

          <div className="space-y-4">
            {categories.map((category, i) => (
              <Reveal key={`${category.slotId}-${i}`} delay={i * 0.05}>
                <Card className="group rounded-2xl border border-primary/30 bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  <MarketingLink href={category.href} className="block p-3.5 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-primary/10 border-primary/30 text-foreground">
                        <Signpost className="w-5 h-5" aria-hidden />
                      </div>

                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm sm:text-[15px] text-foreground leading-snug">{category.title}</p>
                          <div className="text-xs font-medium text-muted-foreground shrink-0">
                            {category.total} {t("roadSignCountLabel")}
                          </div>
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
                            <span>{t("roadSignBrowse")}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </MarketingLink>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
