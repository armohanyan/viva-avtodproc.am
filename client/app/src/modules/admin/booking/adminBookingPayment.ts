import { parseAmdInput, toDatetimeLocalValue, type TxMethod } from "src/pages/admin/finance/adminFinanceShared";
import type { TranslationKey } from "src/lib/i18n";

/** Admin booking payment status (maps to API `adminPaymentStatus`). */
export type AdminBookingPaymentStatus = "paid" | "partial" | "unpaid";

export type AdminBookingPaymentState = {
  status: AdminBookingPaymentStatus;
  paidStr: string;
  method: TxMethod;
  datetimeLocal: string;
  paymentNotes: string;
  paymentReminderDate: string;
};

export function defaultAdminBookingPayment(status: AdminBookingPaymentStatus = "unpaid"): AdminBookingPaymentState {
  return {
    status,
    paidStr: "0",
    method: "cash",
    datetimeLocal: toDatetimeLocalValue(new Date()),
    paymentNotes: "",
    paymentReminderDate: "",
  };
}

export function paidAmountFromState(state: AdminBookingPaymentState): number {
  const paid = parseAmdInput(state.paidStr);
  return Number.isFinite(paid) && paid > 0 ? Math.round(paid) : 0;
}

/** Derive admin payment status from total vs paid (amounts are source of truth in the UI). */
export function inferAdminPaymentStatusFromAmounts(
  totalAmd: number,
  paidAmd: number,
): AdminBookingPaymentStatus {
  const total = Math.max(0, Math.round(totalAmd));
  const paid = Math.max(0, Math.round(paidAmd));
  if (total <= 0) return "paid";
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

/** After editing paid amount, sync status (and reminder visibility) automatically. */
export function adminPaymentStateAfterPaidStrChange(
  state: AdminBookingPaymentState,
  paidStr: string,
  totalAmd: number,
): AdminBookingPaymentState {
  const total = Math.max(0, Math.round(totalAmd));
  const raw = parseAmdInput(paidStr);
  const paid = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  const status = inferAdminPaymentStatusFromAmounts(total, paid);
  return {
    ...state,
    paidStr,
    status,
    ...(status === "paid" ? { paymentReminderDate: "" } : {}),
  };
}

export function adminPaymentFromBooking(
  booking: {
    paymentStatus?: string | null;
    paidAmountAmd?: number | null;
    totalPriceAmd?: number | null;
    paymentNotes?: string | null;
    paymentReminderDateIso?: string | null;
  },
  finance?: { method?: TxMethod; createdAt?: string } | null,
): AdminBookingPaymentState {
  const ps = String(booking.paymentStatus ?? "").trim().toLowerCase();
  const total = booking.totalPriceAmd ?? 0;
  const paid = booking.paidAmountAmd ?? 0;
  let status: AdminBookingPaymentStatus = "unpaid";
  let paidStr = "0";
  if (ps === "paid" || (total > 0 && paid >= total)) {
    status = "paid";
    paidStr = paid > 0 ? String(paid) : total > 0 ? String(total) : "0";
  } else if (ps === "partial" || (paid > 0 && paid < total)) {
    status = "partial";
    paidStr = paid > 0 ? String(paid) : "0";
  } else if (paid > 0) {
    status = "partial";
    paidStr = String(paid);
  }
  const datetimeLocal =
    finance?.createdAt && !Number.isNaN(new Date(finance.createdAt).getTime())
      ? toDatetimeLocalValue(new Date(finance.createdAt))
      : toDatetimeLocalValue(new Date());
  return {
    status,
    paidStr,
    method: finance?.method ?? "cash",
    datetimeLocal,
    paymentNotes: booking.paymentNotes?.trim() ?? "",
    paymentReminderDate: booking.paymentReminderDateIso?.slice(0, 10) ?? "",
  };
}

export function bookingRemainingAmd(totalAmd: number, state: AdminBookingPaymentState): number {
  const total = Math.max(0, Math.round(totalAmd));
  return Math.max(0, total - paidAmountFromState(state));
}

export function validateAdminBookingPayment(
  state: AdminBookingPaymentState,
  totalAmd: number,
): TranslationKey | null {
  const total = Math.max(0, Math.round(totalAmd));
  if (total <= 0) return null;
  if (state.status === "paid") return null;
  const raw = parseAmdInput(state.paidStr);
  // Empty paid field means 0 (unpaid); reject only non-numeric garbage.
  const paid = Number.isFinite(raw) ? raw : state.paidStr.trim() === "" ? 0 : NaN;
  if (!Number.isFinite(paid)) return "adminBookingPaymentPartialRequired";
  if (paid < 0) return "adminBookingPaymentPartialPositive";
  if (paid > total) return "adminBookingPaymentPartialLessThanTotal";
  const status = inferAdminPaymentStatusFromAmounts(total, Math.round(paid));
  if (status === "partial") {
    if (paid <= 0) return "adminBookingPaymentPartialPositive";
    if (paid >= total) return "adminBookingPaymentPartialLessThanTotal";
  }
  if (paid > 0) {
    const created = new Date(state.datetimeLocal);
    if (Number.isNaN(created.getTime())) return "financeManualErrorDate";
  }
  return null;
}

export function adminPaymentApiPayload(
  state: AdminBookingPaymentState,
  totalAmd: number,
): {
  adminPaymentStatus: AdminBookingPaymentStatus;
  paidAmountAmd?: number;
  paymentNotes?: string | null;
  paymentReminderDate?: string | null;
} {
  const total = Math.max(0, Math.round(totalAmd));
  const paidFromField = Math.min(total, Math.max(0, paidAmountFromState(state)));
  const notes = state.paymentNotes.trim() ? state.paymentNotes.trim() : null;
  const status: AdminBookingPaymentStatus =
    state.status === "paid" || state.status === "partial" || state.status === "unpaid"
      ? state.status
      : inferAdminPaymentStatusFromAmounts(total, paidFromField);
  const reminderDate =
    status === "paid"
      ? null
      : state.paymentReminderDate.trim()
        ? state.paymentReminderDate.trim().slice(0, 10)
        : null;
  if (status === "paid") {
    return { adminPaymentStatus: "paid", paidAmountAmd: total, paymentNotes: notes, paymentReminderDate: null };
  }
  if (status === "unpaid") {
    return {
      adminPaymentStatus: "unpaid",
      paidAmountAmd: 0,
      paymentNotes: notes,
      paymentReminderDate: reminderDate,
    };
  }
  return {
    adminPaymentStatus: "partial",
    paidAmountAmd: paidFromField,
    paymentNotes: notes,
    paymentReminderDate: reminderDate,
  };
}

export type BookingListPaymentRow = {
  totalAmd: number;
  paidAmd: number;
  remainingAmd: number;
  status: AdminBookingPaymentStatus | "pending" | "failed" | "na";
};

/** Cash-like income from booking payment fields (paid or partial only). */
export function recognizedBookingIncomeAmd(booking: {
  status?: string;
  paymentStatus?: string | null;
  paidAmountAmd?: number | null;
  totalPriceAmd?: number | null;
}): number {
  const lifecycle = String(booking.status ?? "").trim().toLowerCase();
  if (lifecycle === "cancelled" || lifecycle === "refunded") return 0;
  const row = bookingListPaymentRow(booking);
  if (row.status === "paid" || row.status === "partial") return row.paidAmd;
  return 0;
}

export function bookingListPaymentRow(booking: {
  paymentStatus?: string | null;
  paidAmountAmd?: number | null;
  totalPriceAmd?: number | null;
}): BookingListPaymentRow {
  const totalAmd = Math.max(0, Math.round(booking.totalPriceAmd ?? 0));
  const ps = String(booking.paymentStatus ?? "").trim().toLowerCase();
  if (totalAmd <= 0) {
    return { totalAmd: 0, paidAmd: 0, remainingAmd: 0, status: "na" };
  }
  if (ps === "pending") return { totalAmd, paidAmd: 0, remainingAmd: totalAmd, status: "pending" };
  if (ps === "failed") return { totalAmd, paidAmd: 0, remainingAmd: totalAmd, status: "failed" };
  let paidAmd =
    booking.paidAmountAmd != null && Number.isFinite(Number(booking.paidAmountAmd))
      ? Math.round(Number(booking.paidAmountAmd))
      : 0;
  if (paidAmd <= 0 && ps === "paid") paidAmd = totalAmd;
  const remainingAmd = Math.max(0, totalAmd - paidAmd);
  let status: BookingListPaymentRow["status"] = "unpaid";
  if (ps === "paid" || remainingAmd === 0) status = "paid";
  else if (ps === "partial" || (paidAmd > 0 && paidAmd < totalAmd)) status = "partial";
  else if (paidAmd > 0) status = "partial";
  return { totalAmd, paidAmd, remainingAmd, status };
}

export function bookingListPaymentLabelKey(status: BookingListPaymentRow["status"]): TranslationKey {
  if (status === "paid") return "adminBookingPaymentStatusPaid";
  if (status === "partial") return "adminBookingPaymentStatusPartial";
  if (status === "unpaid") return "adminBookingPaymentStatusUnpaid";
  if (status === "pending") return "studentDetailsPaymentPending";
  if (status === "failed") return "studentDetailsPaymentFailed";
  return "studentDetailsPaymentNa";
}

export const BOOKING_LIST_PAYMENT_BADGE_CLASS: Record<BookingListPaymentRow["status"], string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-sky-100 text-sky-800",
  unpaid: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-600",
  na: "bg-slate-100 text-slate-500",
};

/** True when the booking has any slot on `dateIso` (primary row date or `slotEntries`). */
export function bookingOccursOnDateIso(
  booking: { dateIso: string; slotEntries?: readonly { dateIso: string }[] },
  dateIso: string,
): boolean {
  const day = dateIso.slice(0, 10);
  if (!day) return true;
  if (String(booking.dateIso).slice(0, 10) === day) return true;
  return (booking.slotEntries ?? []).some((e) => String(e.dateIso).slice(0, 10) === day);
}

export type BookingPaymentFilter = "all" | "paid" | "partial" | "unpaid" | "outstanding";

export function bookingHasDebtPaymentStatus(
  booking: { paymentStatus?: string | null; paidAmountAmd?: number | null; totalPriceAmd?: number | null },
): boolean {
  const row = bookingListPaymentRow(booking);
  return row.status === "partial" || row.status === "unpaid";
}

export function bookingMatchesPaymentFilter(
  booking: { paymentStatus?: string | null; paidAmountAmd?: number | null; totalPriceAmd?: number | null },
  filter: BookingPaymentFilter,
): boolean {
  if (filter === "all") return true;
  const row = bookingListPaymentRow(booking);
  if (filter === "outstanding") return row.remainingAmd > 0 && row.totalAmd > 0;
  if (filter === "paid") return row.status === "paid";
  if (filter === "partial") return row.status === "partial";
  return row.status === "unpaid";
}

export function adminPaymentStatusLabelKey(status: AdminBookingPaymentStatus): TranslationKey {
  if (status === "paid") return "adminBookingPaymentStatusPaid";
  if (status === "partial") return "adminBookingPaymentStatusPartial";
  return "adminBookingPaymentStatusUnpaid";
}

/** Suggested paid string when admin changes payment status (paid field stays editable). */
export function paidStrForStatusChange(
  status: AdminBookingPaymentStatus,
  totalAmd: number,
  currentPaidStr: string,
): string {
  const total = Math.max(0, Math.round(totalAmd));
  if (status === "paid") return total > 0 ? String(total) : currentPaidStr;
  if (status === "unpaid") return "0";
  return currentPaidStr;
}
