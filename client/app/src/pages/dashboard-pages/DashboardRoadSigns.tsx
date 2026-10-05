import { useSearch, Link } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import PanelPageHeader from "src/components/PanelPageHeader";
import RoadSignsStudy from "src/components/exam/RoadSignsStudy";
import { useLang } from "src/lib/i18n";
import { normalizeSignSlot } from "src/lib/roadSignCopy";

export default function DashboardRoadSigns() {
  const { t } = useLang();
  const search = (useSearch() ?? "").replace(/^\?/, "");
  const slotId = normalizeSignSlot(new URLSearchParams(search).get("topic"));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <PanelPageHeader
          className="mb-4 sm:mb-6"
          title={t("dashboardLearnRoadSigns")}
          subtitle={t("dashboardLearnRoadSignsSubtitle")}
        />
        <DashboardLearnSubnav active="road-signs" />
        <RoadSignsStudy
          slotId={slotId}
          categoryHref={(id) => `/dashboard/learn/road-signs?topic=${id}`}
          LinkComponent={Link}
        />
      </div>
    </DashboardLayout>
  );
}
