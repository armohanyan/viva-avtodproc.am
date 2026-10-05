"use client";

import { useSearch } from "wouter";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import RoadSignsStudy from "src/components/exam/RoadSignsStudy";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { normalizeSignSlot } from "src/lib/roadSignCopy";

export default function RoadSignsStudyPage() {
  const { t } = useLang();
  const { MarketingLink, panelHref } = useAppNavigation();
  const search = (useSearch() ?? "").replace(/^\?/, "");
  const slotId = normalizeSignSlot(new URLSearchParams(search).get("topic"));
  const lockedHref = panelHref("/login?redirect=/road-signs");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <MarketingLink href="/road-signs" className="mb-4 inline-flex text-sm font-medium text-primary">
            {t("dashboardRoadSignsTopicBack")}
          </MarketingLink>
          <h1 className="mb-5 text-2xl font-bold text-foreground">{t("dashboardLearnRoadSigns")}</h1>
          <RoadSignsStudy
            slotId={slotId}
            locked={slotId !== "1"}
            categoryHref={(slot) => (slot === "1" ? "/road-signs/quiz/topics?topic=1" : lockedHref)}
            LinkComponent={MarketingLink}
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
