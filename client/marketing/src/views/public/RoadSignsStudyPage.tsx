"use client";

import { useSearchParams } from "next/navigation";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import RoadSignsStudy from "src/components/exam/RoadSignsStudy";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { normalizeSignSlot } from "src/lib/roadSignCopy";

export default function RoadSignsStudyPage() {
  const { t } = useLang();
  const { MarketingLink, panelHref } = useAppNavigation();
  const params = useSearchParams();
  const slotId = normalizeSignSlot(params.get("topic"));
  const lockedHref = panelHref("/login?redirect=/road-signs");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">{t("dashboardLearnRoadSigns")}</h1>
          <p className="mb-6 text-sm text-muted-foreground sm:text-base">{t("roadSignsSub")}</p>
          <RoadSignsStudy
            slotId={slotId}
            locked={slotId !== "1"}
            categoryHref={(slot) => (slot === "1" ? "/road-signs?topic=1" : lockedHref)}
            LinkComponent={MarketingLink}
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
