import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { ShoppingBag, CheckCircle2, Car } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Link } from "wouter";
import { getApiErrorMessage } from "src/lib/vivaApi";
import {
  EXTRA_PRACTICAL_BLOCK,
  STUDENT_PACKAGE_CATALOG,
  useStudentEntitlements,
  type PackageTierId,
} from "src/modules/dashboard/studentEntitlements";

export function DashboardBookingsPackageTab() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { practicalCreditsRemaining, packagePracticalRemaining, extraPracticalRemaining, purchasePackage, purchaseExtraPracticalBlock } =
    useStudentEntitlements();

  const buyPackage = async (tier: PackageTierId) => {
    try {
      await purchasePackage(tier);
      showToast(t("bookingsPackageSimulatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const buyExtra = async () => {
    try {
      await purchaseExtraPracticalBlock();
      showToast(t("bookingsExtraSimulatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  return (
    <Reveal delay={0.06}>
        <Card className="p-5 border-border mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                {t("bookingsShopTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">{t("bookingsShopSub")}</p>
            </div>
            <div className="rounded-xl border border-border bg-accent/40 px-4 py-3 text-sm shrink-0">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("bookingsCreditsSummary")}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{practicalCreditsRemaining}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("bookingsCreditsPackagePart")}: {packagePracticalRemaining} · {t("bookingsCreditsExtraPart")}: {extraPracticalRemaining}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {STUDENT_PACKAGE_CATALOG.map((pkg) => (
              <Card key={pkg.id} className="p-4 border-border flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-foreground">{t(pkg.nameKey)}</h4>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {pkg.priceDisplay}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground flex-1">
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      {pkg.practicalLessons} {t("lessons")} · {t("lessonTypePractical").toLowerCase()}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      {pkg.theorySessions} {t("packageFeatTheorySessions")}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{t("packageFeatDigitalPrep")}</span>
                  </li>
                </ul>
                <Button type="button" className="w-full mt-4" size="sm" onClick={() => buyPackage(pkg.id)}>
                  {t("bookingsBuyPackageCta")} · {t(pkg.nameKey)}
                </Button>
              </Card>
            ))}
          </div>

          <Card className="p-4 border-dashed border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{t(EXTRA_PRACTICAL_BLOCK.nameKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {EXTRA_PRACTICAL_BLOCK.lessons} {t("lessons")} · {EXTRA_PRACTICAL_BLOCK.priceDisplay}
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={buyExtra}>
                {t("bookingsBuyExtraCta")}
              </Button>
            </div>
          </Card>

          <p className="text-sm text-muted-foreground mt-5">
            {t("bookingsPackageToPracticalHint")}{" "}
            <Link href="/practical" className="text-primary font-medium hover:underline">
              {t("bookingsSubnavPractical")}
            </Link>
          </p>
        </Card>
      </Reveal>
  );
}
