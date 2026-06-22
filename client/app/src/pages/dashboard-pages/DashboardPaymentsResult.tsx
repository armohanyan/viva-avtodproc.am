import { useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { absWouterHref } from "src/lib/wouterFullPath";
import { CheckCircle2, XCircle } from "lucide-react";
import { AcbaPaymentTrustStrip } from "src/components/payments/AcbaPaymentTrustStrip";

function readQueryParam(search: string, key: string): string {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(key)?.trim() ?? "";
}

export default function DashboardPaymentsResult() {
  const { t } = useLang();
  const params = useMemo(() => {
    if (typeof window === "undefined") return { status: "", kind: "", reason: "" };
    return {
      status: readQueryParam(window.location.search, "status"),
      kind: readQueryParam(window.location.search, "kind"),
      reason: readQueryParam(window.location.search, "reason"),
    };
  }, []);

  const success = params.status === "success";

  const primaryHref =
    params.kind === "package"
      ? absWouterHref("/dashboard/bookings/package")
      : params.kind === "extra_practical"
        ? absWouterHref("/dashboard/bookings/practical")
        : absWouterHref("/dashboard/bookings");

  return (
    <DashboardLayout>
      <PanelPageHeader className="mb-6" title={t("vposResultPageTitle")} subtitle={t("vposResultPageSubtitle")} />
      <Card className="max-w-lg p-6 border-border">
        <div className="flex items-start gap-3">
          {success ? (
            <CheckCircle2 className="w-8 h-8 text-primary shrink-0" aria-hidden />
          ) : (
            <XCircle className="w-8 h-8 text-destructive shrink-0" aria-hidden />
          )}
          <div className="space-y-2 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {success ? t("vposPaymentResultSuccess") : t("vposPaymentResultFailed")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {success ? t("vposPaymentResultSuccessBody") : t("vposPaymentResultFailedBody")}
            </p>
            {!success && params.reason === "cancelled" ? (
              <p className="text-xs text-muted-foreground">{t("vposPaymentResultCancelledHint")}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" asChild>
            <Link href={primaryHref}>{t("vposResultBackCta")}</Link>
          </Button>
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
