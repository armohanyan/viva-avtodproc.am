"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import RoadSignsStudy from "src/components/exam/RoadSignsStudy";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { normalizeSignSlot } from "src/lib/roadSignCopy";

function RoadSignsStudySlot({ slotId }: { slotId: string }) {
  const { MarketingLink, panelHref } = useAppNavigation();
  const lockedHref = panelHref("/login?redirect=/road-signs");

  return (
    <RoadSignsStudy
      slotId={slotId}
      locked={slotId !== "1"}
      categoryHref={(slot) => (slot === "1" ? "/road-signs?topic=1" : lockedHref)}
      LinkComponent={MarketingLink}
    />
  );
}

/** Reads `?topic=` only. Must sit under Suspense so the rest of the page still renders for crawlers. */
function RoadSignsStudyFromQuery() {
  const params = useSearchParams();
  return <RoadSignsStudySlot slotId={normalizeSignSlot(params.get("topic"))} />;
}

export default function RoadSignsStudyPage() {
  const { t } = useLang();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">{t("dashboardLearnRoadSigns")}</h1>
          <p className="mb-6 text-sm text-muted-foreground sm:text-base">{t("roadSignsSub")}</p>
          <Suspense fallback={<RoadSignsStudySlot slotId="1" />}>
            <RoadSignsStudyFromQuery />
          </Suspense>
        </div>
      </section>
      <Footer />
    </div>
  );
}
