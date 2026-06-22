import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { useActivePackages } from "src/modules/packages/useActivePackages";
import { useLocation } from "wouter";
import { SimulatedAcbaPosDialog } from "src/components/booking/SimulatedAcbaPosDialog";
import { useVposCheckout } from "src/modules/payments/useVposCheckout";
import { useAccount } from "src/modules/accounts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import { absWouterHref } from "src/lib/wouterFullPath";
import { STUDENT_SELF_SERVICE_BOOKING_ENABLED } from "src/constants/booking.constants";
import { StudentBookingPausedCallout } from "src/components/booking/StudentBookingPausedCallout";

export function DashboardBookingsPackageTab() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { packagePracticalRemaining, theoryLessonsRemaining, refreshEntitlements } = useStudentEntitlements();
  const { user } = useAccount();
  const {
    config: vposConfig,
    initiateCheckout,
    completePackagePurchaseSimulated,
  } = useVposCheckout();
  const { packages, loading, error } = useActivePackages();
  const [, setLocation] = useLocation();
  const [pendingPackageId, setPendingPackageId] = useState<number | null>(null);
  const [posBusy, setPosBusy] = useState(false);
  const [slotPromptOpen, setSlotPromptOpen] = useState(false);

  const locale = useMemo(() => {
    if (lang === "am") return "hy-AM";
    if (lang === "ru") return "ru-RU";
    return "en-US";
  }, [lang]);

  const pendingPackage = useMemo(
    () => (pendingPackageId != null ? packages.find((p) => p.id === pendingPackageId) ?? null : null),
    [packages, pendingPackageId],
  );

  const [posDialogOpen, setPosDialogOpen] = useState(false);

  const buyPackage = async (packageId: number) => {
    setPendingPackageId(packageId);
    setPosBusy(true);
    try {
      const result = await initiateCheckout({ kind: "package", packageId });
      if (result.mode === "simulated") {
        setPosDialogOpen(true);
      }
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      setPendingPackageId(null);
    } finally {
      setPosBusy(false);
    }
  };

  const approvePackagePayment = async (): Promise<boolean> => {
    if (pendingPackageId == null || !user?.id || user.accountType !== "student") return false;
    setPosBusy(true);
    try {
      await completePackagePurchaseSimulated(user.id, pendingPackageId);
      await refreshEntitlements();
      showToast(t("bookingsPackageSimulatedToast"), "success");
      setPendingPackageId(null);
      setPosDialogOpen(false);
      setSlotPromptOpen(true);
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      return false;
    } finally {
      setPosBusy(false);
    }
  };

  return (
    <Reveal delay={0.06}>
      {!STUDENT_SELF_SERVICE_BOOKING_ENABLED ? <StudentBookingPausedCallout className="mb-4" /> : null}
      <SimulatedAcbaPosDialog
        open={posDialogOpen && pendingPackageId !== null}
        onOpenChange={(open) => {
          setPosDialogOpen(open);
          if (!open && !posBusy) setPendingPackageId(null);
        }}
        amountAmd={pendingPackage?.priceAmd ?? null}
        locale={locale}
        busy={posBusy}
        onApprove={approvePackagePayment}
        variant={vposConfig?.simulated === false ? "live" : "simulated"}
      />
      <Dialog open={slotPromptOpen} onOpenChange={setSlotPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ընտրեք դասերի ժամերը</DialogTitle>
            <DialogDescription className="text-left">
              Փաթեթը ակտիվ է։ Կարող եք ընտրել ժամերը հիմա կամ ավելի ուշ։
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Գործնական դասեր մնացել է: <span className="font-semibold text-foreground">{packagePracticalRemaining}</span>
            </p>
            <p className="text-muted-foreground">
              Տեսական անհատական դասեր մնացել է:{" "}
              <span className="font-semibold text-foreground">{theoryLessonsRemaining}</span>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSlotPromptOpen(false)}>
              Ավելի ուշ
            </Button>
            {packagePracticalRemaining > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSlotPromptOpen(false);
                  setLocation(absWouterHref("/dashboard/bookings/practical"));
                }}
              >
                Գործնական դաս
              </Button>
            ) : null}
            {theoryLessonsRemaining > 0 ? (
              <Button
                onClick={() => {
                  setSlotPromptOpen(false);
                  setLocation(absWouterHref("/dashboard/bookings/theory-personal"));
                }}
              >
                {t("bookingsSubnavTheoryPersonal")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <Button
                type="button"
                className="w-full mt-4"
                size="sm"
                disabled={!STUDENT_SELF_SERVICE_BOOKING_ENABLED}
                onClick={() => buyPackage(pkg.id)}
              >
                {t("bookingsBuyPackageCta")} · {pkg.name}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                size="sm"
                disabled={!STUDENT_SELF_SERVICE_BOOKING_ENABLED}
                onClick={() => setLocation(absWouterHref("/dashboard/bookings/practical"))}
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
