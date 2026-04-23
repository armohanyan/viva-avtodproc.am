import { useMemo } from "react";
import { Link } from "wouter";
import { Briefcase, CheckCircle2 } from "lucide-react";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useStudentEntitlements, type PackageTierId } from "src/modules/dashboard/studentEntitlements";
import { useActivePackages } from "src/modules/packages/useActivePackages";

function tierLabel(t: (key: TranslationKey) => string, tier: PackageTierId): string {
  if (tier === "premium") return t("packageTierPremium");
  if (tier === "standard") return t("packageTierStandard");
  return t("packageTierBasic");
}

export default function DashboardServices() {
  const { t } = useLang();
  const {
    ownedPackages,
    extraPracticalBlocks,
    entitlementsLoading,
    entitlementsError,
    primaryTheoryTotal,
    primaryTheoryUsed,
    hasTheoryFromPackage,
  } = useStudentEntitlements();
  const { packages: catalog, loading: catalogLoading, error: catalogError } = useActivePackages();

  const catalogById = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const hasAnyService = ownedPackages.length > 0 || extraPracticalBlocks.length > 0;

  return (
    <DashboardLayout>
      <PanelPageHeader
        className="mb-6"
        icon={Briefcase}
        title={t("dashboardServicesTitle")}
        subtitle={t("dashboardServicesSubtitle")}
      />

      {entitlementsError ? (
        <p className="text-sm text-destructive mb-4" role="alert">
          {entitlementsError}
        </p>
      ) : null}
      {catalogError ? (
        <p className="text-sm text-destructive mb-4" role="alert">
          {catalogError}
        </p>
      ) : null}

      {entitlementsLoading || catalogLoading ? (
        <p className="text-sm text-muted-foreground py-6">{t("loading")}</p>
      ) : !hasAnyService ? (
        <Card className="p-6 border-border">
          <p className="text-sm text-muted-foreground mb-4">{t("dashboardServicesEmpty")}</p>
          <Button type="button" asChild size="sm">
            <Link href="/dashboard/bookings/package">{t("dashboardServicesViewPackages")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {ownedPackages.map((owned, pkgIdx) => {
            const cat = catalogById.get(owned.purchaseId);
            const name = cat?.name ?? t("dashboardServicesUnknownPackage");
            const remaining = Math.max(0, owned.practicalTotal - owned.practicalUsed);
            return (
              <Card key={`pkg-${owned.purchaseId}`} className="p-5 sm:p-6 border-border">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{name}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboardServicesPurchasedLabel")}: {owned.purchasedAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{tierLabel(t, owned.tier)}</Badge>
                    {cat ? <Badge variant="outline">{cat.price}</Badge> : null}
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      {t("dashboardServicesPracticalLabel")}: {owned.practicalUsed}/{owned.practicalTotal} ·{" "}
                      <span className="text-foreground font-medium">{remaining}</span> {t("lessons").toLowerCase()}{" "}
                      {t("bookingsCreditsPackagePart").toLowerCase()}
                    </span>
                  </li>
                  {hasTheoryFromPackage && pkgIdx === 0 ? (
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        {t("dashboardServicesTheoryLabel")}: {primaryTheoryUsed}/{primaryTheoryTotal}
                      </span>
                    </li>
                  ) : null}
                </ul>

                {cat && cat.features.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {t("dashboardServicesFeaturesHeading")}
                    </h3>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {cat.features.map((feat, i) => (
                        <li key={`${owned.purchaseId}-f-${i}`} className="flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            );
          })}

          {extraPracticalBlocks.map((block) => {
            const rem = Math.max(0, block.practicalTotal - block.practicalUsed);
            return (
              <Card key={`ex-${block.id}`} className="p-5 sm:p-6 border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-foreground">{t("dashboardServicesExtraTitle")}</h2>
                  <Badge variant="outline">{block.priceDisplay}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("dashboardServicesPurchasedLabel")}: {block.purchasedAt} · {t("dashboardServicesPracticalLabel")}:{" "}
                  {block.practicalUsed}/{block.practicalTotal} ·{" "}
                  <span className="text-foreground font-medium">{rem}</span> {t("lessons").toLowerCase()}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
