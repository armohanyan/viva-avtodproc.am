import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import CashRegisterShiftView from "src/modules/cash-register/CashRegisterShiftView";
import {
  fetchCashRegisterPeriodSummary,
  fetchCashRegisterShift,
  fetchCashRegisterShifts,
} from "src/modules/cash-register/cash-register.api";
import type { CashShiftDetail } from "src/modules/cash-register/cash-register.types";
import { printCashRegisterPeriodReport } from "src/modules/cash-register/cashRegisterPrint";
import { Wallet, ArrowLeft } from "lucide-react";
import { useAccount } from "src/modules/accounts";
import { useCallback, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

export default function AdminCashRegisterShiftDetailPage() {
  const { user } = useAccount();
  const { showToast } = useToast();
  const [, params] = useRoute<{ id: string }>("/admin/cash-register/shifts/:id");
  const shiftId = Number(params?.id ?? 0);
  const [detail, setDetail] = useState<CashShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [printDaily, setPrintDaily] = useState<(() => void) | undefined>(undefined);

  const load = useCallback(async () => {
    if (!(shiftId > 0)) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchCashRegisterShift(shiftId);
      setDetail(next);
      const day = next.shift.openedAt.slice(0, 10);
      try {
        const branchKey = String(next.shift.branchId);
        const [period, shifts] = await Promise.all([
          fetchCashRegisterPeriodSummary(day, day, branchKey),
          fetchCashRegisterShifts(day, day, branchKey),
        ]);
        setPrintDaily(() => () =>
          printCashRegisterPeriodReport({
            startDate: day,
            endDate: day,
            branchScope: next.shift.branchName,
            printedBy: user?.name?.trim() || user?.email?.trim() || undefined,
            period,
            shifts,
          }),
        );
      } catch {
        setPrintDaily(undefined);
      }
    } catch (e) {
      setPrintDaily(undefined);
      setDetail(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [shiftId, showToast, user?.email, user?.name]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Wallet}
        title="Դրամարկղ"
        subtitle={detail ? `${detail.shift.branchName} · #${detail.shift.id}` : "Մանրամասն հաշվետվություն"}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/cash-register">
              <ArrowLeft className="h-4 w-4 me-1" />
              Վերադառնալ
            </Link>
          </Button>
        }
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Բեռնվում է…</p>
      ) : detail ? (
        <CashRegisterShiftView
          detail={detail}
          showShare
          printedBy={user?.name?.trim() || user?.email?.trim() || undefined}
          onPrintDailyResults={printDaily}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Գրաֆիկը չի գտնվել</p>
      )}
    </AdminLayout>
  );
}
