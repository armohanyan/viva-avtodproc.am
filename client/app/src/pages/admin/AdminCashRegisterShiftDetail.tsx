import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import CashRegisterShiftView from "src/modules/cash-register/CashRegisterShiftView";
import { fetchCashRegisterShift } from "src/modules/cash-register/cash-register.api";
import type { CashShiftDetail } from "src/modules/cash-register/cash-register.types";
import { Wallet, ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

export default function AdminCashRegisterShiftDetailPage() {
  const { showToast } = useToast();
  const [, params] = useRoute<{ id: string }>("/admin/cash-register/shifts/:id");
  const shiftId = Number(params?.id ?? 0);
  const [detail, setDetail] = useState<CashShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!(shiftId > 0)) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDetail(await fetchCashRegisterShift(shiftId));
    } catch (e) {
      setDetail(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [shiftId, showToast]);

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
        <CashRegisterShiftView detail={detail} showShare />
      ) : (
        <p className="text-sm text-muted-foreground">Գրաֆիկը չի գտնվել</p>
      )}
    </AdminLayout>
  );
}
