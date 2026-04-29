import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { CheckCircle2 } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { useActivePackages } from "src/modules/packages/useActivePackages";
import { useLocation } from "wouter";

export function DashboardBookingsPackageTab() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { completePackagePurchase } = useStudentEntitlements();
  const { packages, loading, error } = useActivePackages();
  const [, setLocation] = useLocation();

  const buyPackage = async (packageId: number) => {
    try {
      await completePackagePurchase(packageId);
      showToast(t("bookingsPackageSimulatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  return (
    <Reveal delay={0.06}>
      {error ? (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground py-6">{t("loading")}</p>
      ) : packages.length === 0 ? (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("tableNoMatches")}</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="p-4 border-border flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">{pkg.name}</h4>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {pkg.price}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground flex-1">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    {pkg.lessons} {t("lessonTypePractical").toLowerCase()} · {pkg.theoryLessons}{" "}
                    {t("lessonTypeTheory").toLowerCase()}
                  </span>
                </li>
                {pkg.features.slice(0, 4).map((feat, i) => (
                  <li key={`${pkg.id}-feat-${i}`} className="flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Button type="button" className="w-full mt-4" size="sm" onClick={() => buyPackage(pkg.id)}>
                {t("bookingsBuyPackageCta")} · {pkg.name}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                size="sm"
                onClick={() => setLocation("/dashboard/bookings/practical")}
              >
                {t("dashboardLessonsBookPractical")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Reveal>
  );
}
