import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { absWouterHref } from "src/lib/wouterFullPath";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AcbaPaymentTrustStrip } from "src/components/payments/AcbaPaymentTrustStrip";
import { VposTestModeBanner } from "src/components/payments/VposTestModeBanner";
import { useVposCheckout } from "src/modules/payments/useVposCheckout";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import { formatAmd } from "src/utils/currency.utils";

function readQueryParam(search: string, key: string): string {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(key)?.trim() ?? "";
}

export default function DashboardPaymentsResult() {
  const { t } = useLang();
  const { syncPaymentSession } = useVposCheckout();
  const { refreshEntitlements } = useStudentEntitlements();
  const { user } = useAccount();
  const { refresh: refreshBookings } = useStudentBookings(
    user?.accountType === "student" ? user.id : undefined,
  );

  const initialParams = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        status: "",
        kind: "",
        reason: "",
        sessionId: "",
        orderNumber: "",
        amountAmd: "",
      };
    }
    const search = window.location.search;
    return {
      status: readQueryParam(search, "status"),
      kind: readQueryParam(search, "kind"),
      reason: readQueryParam(search, "reason"),
      sessionId: readQueryParam(search, "sessionId"),
      orderNumber: readQueryParam(search, "orderNumber"),
      amountAmd: readQueryParam(search, "amountAmd"),
    };
  }, []);

  const [status, setStatus] = useState(initialParams.status);
  const [syncing, setSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);

  const success = status === "success";
  const amountLabel =
    initialParams.amountAmd && Number.isFinite(Number(initialParams.amountAmd))
      ? formatAmd(Number(initialParams.amountAmd))
      : null;

  const primaryHref =
    initialParams.kind === "package"
      ? absWouterHref("/dashboard/bookings/package")
      : initialParams.kind === "extra_practical"
        ? absWouterHref("/dashboard/bookings/practical")
        : absWouterHref("/dashboard/bookings");

  useEffect(() => {
    if (success) {
      void refreshEntitlements();
      void refreshBookings();
      return;
    }

    const sessionId = Number(initialParams.sessionId);
    if (!Number.isFinite(sessionId) || sessionId <= 0 || syncAttempted) return;

    setSyncAttempted(true);
    setSyncing(true);
    void syncPaymentSession(sessionId)
      .then((result) => {
        if (result.status === "paid") {
          setStatus("success");
          void refreshEntitlements();
          void refreshBookings();
        }
      })
      .finally(() => setSyncing(false));
  }, [
    success,
    initialParams.sessionId,
    syncAttempted,
    syncPaymentSession,
    refreshEntitlements,
    refreshBookings,
  ]);

  return (
    <DashboardLayout>
      <VposTestModeBanner className="mb-4 max-w-lg" />
      <PanelPageHeader className="mb-6" title={t("vposResultPageTitle")} subtitle={t("vposResultPageSubtitle")} />
      <Card className="max-w-lg p-6 border-border">
        <div className="flex items-start gap-3">
          {syncing ? (
            <Loader2 className="w-8 h-8 text-primary shrink-0 animate-spin" aria-hidden />
          ) : success ? (
            <CheckCircle2 className="w-8 h-8 text-primary shrink-0" aria-hidden />
          ) : (
            <XCircle className="w-8 h-8 text-destructive shrink-0" aria-hidden />
          )}
          <div className="space-y-2 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {syncing
                ? t("vposPaymentResultSyncing")
                : success
                  ? t("vposPaymentResultSuccess")
                  : t("vposPaymentResultFailed")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {syncing
                ? t("vposPaymentResultSyncingBody")
                : success
                  ? t("vposPaymentResultSuccessBody")
                  : t("vposPaymentResultFailedBody")}
            </p>
            {success && amountLabel ? (
              <p className="text-sm text-foreground">
                {t("vposPaymentResultAmountLabel")}: <span className="font-semibold">{amountLabel}</span>
              </p>
            ) : null}
            {success && initialParams.orderNumber ? (
              <p className="text-xs text-muted-foreground">
                {t("vposPaymentResultReferenceLabel")}: {initialParams.orderNumber}
              </p>
            ) : null}
            {!success && !syncing && initialParams.reason === "cancelled" ? (
              <p className="text-xs text-muted-foreground">{t("vposPaymentResultCancelledHint")}</p>
            ) : null}
            {!success && !syncing && syncAttempted ? (
              <p className="text-xs text-muted-foreground">{t("vposPaymentResultRetryHint")}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {!success && !syncing ? (
            <Button type="button" asChild>
              <Link href={primaryHref}>{t("vposResultTryAgainCta")}</Link>
            </Button>
          ) : null}
          {(success || syncing) && (
            <Button type="button" asChild>
              <Link href={primaryHref}>{t("vposResultBackCta")}</Link>
            </Button>
          )}
          <Button type="button" variant="outline" asChild>
            <Link href={absWouterHref("/dashboard/payments")}>{t("payments")}</Link>
          </Button>
        </div>
        <div className="mt-6 pt-4 border-t border-border">
          <AcbaPaymentTrustStrip compact />
        </div>
      </Card>
    </DashboardLayout>
  );
}
