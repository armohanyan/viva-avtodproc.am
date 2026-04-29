import { useCallback, useEffect, useState } from "react";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { SimulatedAcbaPosDialog } from "src/components/booking/SimulatedAcbaPosDialog";

type TheoryCohortRow = {
  id: number;
  name: string;
  instructorName: string;
  startDateIso: string;
  endDateIso: string;
  seats: number;
  enrolled: number;
  status: string;
  priceAmd: number | null;
};

type CreateResponse = {
  id: number;
  totalPriceAmd: number;
};

export function DashboardBookingsTheoryGroupTab() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TheoryCohortRow[]>([]);
  const [payBusy, setPayBusy] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<CreateResponse | null>(null);

  const locale = lang === "ru" ? "ru-RU" : lang === "am" ? "hy-AM" : "en-US";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<TheoryCohortRow[]>("/theory-cohorts");
      setRows(
        (Array.isArray(data) ? data : []).filter(
          (x) => x.status !== "archived" && x.status !== "completed" && x.enrolled < x.seats,
        ),
      );
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onStartBooking = async (cohortId: number) => {
    try {
      const res = await vivaApiJson<CreateResponse>(`/bookings/theory-groups/${encodeURIComponent(String(cohortId))}/book`, {
        method: "POST",
      });
      setPendingBooking(res);
      setPayDialogOpen(true);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const onApprove = async (): Promise<boolean> => {
    if (!pendingBooking) return false;
    setPayBusy(true);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(pendingBooking.id))}/complete-payment`, { method: "POST" });
      showToast(t("bookingPaymentCompletedToast"), "success");
      setPayDialogOpen(false);
      setPendingBooking(null);
      await refresh();
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      return false;
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <>
      <SimulatedAcbaPosDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        amountAmd={pendingBooking?.totalPriceAmd ?? null}
        locale={locale}
        busy={payBusy}
        onApprove={onApprove}
      />
      {loading ? (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("loading")}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("tableNoMatches")}</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((row) => (
            <Card key={row.id} className="p-5 border-border space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{row.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {row.enrolled}/{row.seats}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{row.instructorName}</p>
              <p className="text-xs text-muted-foreground">
                {row.startDateIso} - {row.endDateIso}
              </p>
              <p className="text-sm font-medium text-foreground">
                {(row.priceAmd ?? 0).toLocaleString(locale)} ֏
              </p>
              <Button className="w-full" onClick={() => void onStartBooking(row.id)}>
                {t("confirmBooking")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
