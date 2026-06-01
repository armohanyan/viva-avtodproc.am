import { recognizedBookingIncomeAmd } from "src/modules/admin/booking/adminBookingPayment";
import type { FinanceTx } from "src/pages/admin/finance/adminFinanceShared";

export type DashboardBookingPaymentRow = {
  id: number;
  status: string;
  paymentStatus?: string | null;
  paidAmountAmd?: number | null;
  totalPriceAmd?: number | null;
  /** When the booking was marked fully paid (ISO instant). */
  paidAtIso?: string | null;
};

function instantInUtcMsRange(iso: string | null | undefined, fromMs: number, toMs: number): boolean {
  if (!iso?.trim()) return false;
  const ts = new Date(iso).getTime();
  return Number.isFinite(ts) && ts >= fromMs && ts <= toMs;
}

/**
 * Dashboard Եկամուտ: cash collected in the period (payment date), not lesson schedule date.
 * Primary source: completed income finance rows (`createdAt`).
 * Fallback: booking payment fields when `paidAt` falls in the period and no ledger row exists for that booking in the period.
 */
export function dashboardRevenueAmdInPeriod(
  bookings: readonly DashboardBookingPaymentRow[],
  transactions: readonly FinanceTx[],
  fromMs: number,
  toMs: number,
  isActiveBooking: (status: string) => boolean,
): number {
  const bookingIdsWithLedgerInPeriod = new Set<number>();
  let revenue = 0;

  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "income" || tx.status !== "completed") continue;
    if (!instantInUtcMsRange(tx.createdAt, fromMs, toMs)) continue;
    revenue += tx.grossAmd ?? 0;
    const bid = tx.bookingId;
    if (bid != null && Number.isFinite(bid) && bid > 0) {
      bookingIdsWithLedgerInPeriod.add(bid);
    }
  }

  for (const b of bookings) {
    if (!isActiveBooking(String(b.status))) continue;
    const bid = typeof b.id === "number" ? b.id : Number(b.id);
    if (!Number.isFinite(bid) || bookingIdsWithLedgerInPeriod.has(bid)) continue;
    const income = recognizedBookingIncomeAmd(b);
    if (income <= 0) continue;
    if (!instantInUtcMsRange(b.paidAtIso, fromMs, toMs)) continue;
    revenue += income;
  }

  return revenue;
}
