import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { SimulatedAcbaPosDialog } from "src/components/booking/SimulatedAcbaPosDialog";
import { useAccount } from "src/modules/accounts";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { computeBookingTotalAmd } from "src/modules/admin/booking/useBookingPriceCalculator";
import type { TheoryCohortOption } from "src/modules/admin/booking/types";

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
  sessionStartTime: string | null;
  sessionEndTime: string | null;
};

type CreateResponse = {
  id: number;
  totalPriceAmd: number;
  status: string;
  paymentRequiredNow: boolean;
  coveredByPrepaidCredits?: boolean;
};

function cohortToOption(row: TheoryCohortRow): TheoryCohortOption {
  return {
    id: String(row.id),
    name: row.name,
    startDateIso: row.startDateIso,
    branchId: "",
    instructorName: row.instructorName,
    status: row.status,
    sessionStartTime: row.sessionStartTime,
    sessionEndTime: row.sessionEndTime,
    priceAmd: row.priceAmd,
  };
}

export function DashboardBookingsTheoryGroupTab() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const { instructors } = useInstructors();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TheoryCohortRow[]>([]);
  const [payBusy, setPayBusy] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<CreateResponse | null>(null);
  const [pendingPaymentElsewhere, setPendingPaymentElsewhere] = useState(false);

  const locale = lang === "ru" ? "ru-RU" : lang === "am" ? "hy-AM" : "en-US";

  const studentUserId =
    user?.accountType === "student" && typeof user.id === "number" ? String(user.id) : "";

  const priceByCohortId = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of rows) {
      map.set(
        row.id,
        computeBookingTotalAmd({
          flowKind: "theory_group",
          instructors,
          instructorName: "",
          slotPick: null,
          theoryCohortId: String(row.id),
          theoryCohorts: [cohortToOption(row)],
          selectedPackage: null,
          packagePracticalSlots: null,
          packageTheorySlots: null,
        }),
      );
    }
    return map;
  }, [rows, instructors]);

  const refreshPendingGuard = useCallback(async () => {
    if (!studentUserId) {
      setPendingPaymentElsewhere(false);
      return;
    }
    try {
      const list = await vivaApiJson<{ status: string }[]>(
        `/bookings?${new URLSearchParams({ studentUserId }).toString()}`,
      );
      const has = Array.isArray(list) && list.some((b) => toCanonicalBookingStatus(b.status) === "pending");
      setPendingPaymentElsewhere(has);
    } catch {
      setPendingPaymentElsewhere(false);
    }
  }, [studentUserId]);

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

  useEffect(() => {
    void refreshPendingGuard();
  }, [refreshPendingGuard]);

  const onStartBooking = async (cohortId: number) => {
    if (pendingPaymentElsewhere) {
      showToast(t("bookingPendingBlocksNew"), "error");
      return;
    }
    try {
      const res = await vivaApiJson<CreateResponse>(`/bookings/theory-groups/${encodeURIComponent(String(cohortId))}/book`, {
        method: "POST",
      });
      if (res.paymentRequiredNow && !res.coveredByPrepaidCredits) {
        setPendingBooking(res);
        setPayDialogOpen(true);
      } else {
        showToast(t("bookingPaymentCompletedToast"), "success");
      }
      await refreshPendingGuard();
      await refresh();
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
      await refreshPendingGuard();
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
        <div className="space-y-4">
          {pendingPaymentElsewhere ? (
            <div
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
              role="status"
            >
              {t("bookingPendingBlocksNew")}
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((row) => {
              const displayPrice = priceByCohortId.get(row.id) ?? 0;
              return (
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
                    {t("cohortGroupPriceAmdLabel")}: {displayPrice.toLocaleString(locale)} ֏
                  </p>
                  <Button
                    className="w-full"
                    disabled={pendingPaymentElsewhere}
                    onClick={() => void onStartBooking(row.id)}
                  >
                    {t("confirmBooking")}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
