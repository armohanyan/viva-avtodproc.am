import { paymentReminderDateIsoForApi } from './booking-payment-reminder.util';

/** Admin-recorded payment state on a booking (separate from booking lifecycle `status`). */
export type AdminBookingPaymentStatus = 'paid' | 'partial' | 'unpaid';

export type ResolvedBookingPayment = {
  paymentStatus: AdminBookingPaymentStatus | 'pending' | 'failed';
  paidAmountAmd: number;
  totalPriceAmd: number;
  remainingAmd: number;
};

export type StudentPaymentSummaryDto = {
  totalDebtAmd: number;
  totalPaidOnBookingsAmd: number;
  totalRemainingAmd: number;
  unpaidBookings: Array<{
    id: number;
    dateIso: string;
    time: string;
    endTime: string | null;
    totalPriceAmd: number;
    paidAmountAmd: number;
    remainingAmd: number;
    lessonTypeKey: 'lessonTypePractical' | 'lessonTypeTheory' | 'lessonTypeTheoryPersonal';
    paymentStatus: string;
    status: string;
    paymentNotes: string | null;
    paymentReminderDateIso: string | null;
  }>;
};

type BookingPaymentRow = {
  status: string;
  totalPriceAmd?: number | null;
  paidAmountAmd?: number | null;
  paymentStatus?: string | null;
  paidAt?: Date | null;
  prepaidMeta?: Record<string, unknown> | null;
};

function roundAmd(n: number): number {
  return Math.max(0, Math.round(n));
}

export function bookingTotalPriceAmd(row: { totalPriceAmd?: number | null }): number {
  const t = row.totalPriceAmd;
  return t != null && Number.isFinite(Number(t)) ? roundAmd(Number(t)) : 0;
}

function normalizeLifecycleStatus(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'pending_prebook') return 'pending';
  if (s === 'completed') return 'confirmed';
  return s;
}

/** Whether this booking row can contribute to student debt (has a billable total). */
export function bookingCountsTowardStudentDebt(row: BookingPaymentRow): boolean {
  const st = normalizeLifecycleStatus(String(row.status ?? ''));
  if (st === 'cancelled' || st === 'refunded') return false;
  return bookingTotalPriceAmd(row) > 0;
}

function inferAdminStatusFromLegacy(row: BookingPaymentRow): AdminBookingPaymentStatus {
  if (row.prepaidMeta != null && typeof row.prepaidMeta === 'object') {
    return 'paid';
  }
  const ps = String(row.paymentStatus ?? '').trim().toLowerCase();
  if (ps === 'paid') {
    return 'paid';
  }
  if (ps === 'partial') {
    return 'partial';
  }
  if (row.paidAt != null) {
    return 'paid';
  }
  return 'unpaid';
}

/** Resolve stored + legacy booking payment fields for display and debt math. */
export function resolveBookingPayment(row: BookingPaymentRow): ResolvedBookingPayment {
  const total = bookingTotalPriceAmd(row);
  const rawPs = String(row.paymentStatus ?? '').trim().toLowerCase();

  if (row.prepaidMeta != null && typeof row.prepaidMeta === 'object') {
    return { paymentStatus: 'paid', paidAmountAmd: 0, totalPriceAmd: total, remainingAmd: 0 };
  }

  if (rawPs === 'pending' || rawPs === 'failed') {
    const paidStored = row.paidAmountAmd;
    const paid =
      paidStored != null && Number.isFinite(Number(paidStored))
        ? roundAmd(Number(paidStored))
        : 0;
    const remaining = Math.max(0, total - paid);
    return {
      paymentStatus: rawPs as 'pending' | 'failed',
      paidAmountAmd: paid,
      totalPriceAmd: total,
      remainingAmd: remaining,
    };
  }

  let status = inferAdminStatusFromLegacy(row);
  let paid = row.paidAmountAmd;
  if (paid == null || !Number.isFinite(Number(paid))) {
    if (status === 'paid') {
      paid = total;
    } else if (status === 'partial') {
      paid = 0;
    } else {
      paid = 0;
    }
  }
  paid = roundAmd(Number(paid));

  if (status === 'paid') {
    paid = total;
  } else if (status === 'unpaid') {
    paid = 0;
  } else if (status === 'partial') {
    if (total > 0 && paid >= total) {
      status = 'paid';
      paid = total;
    }
  }

  const remaining = Math.max(0, total - paid);
  if (total > 0 && remaining === 0 && status !== 'paid') {
    status = 'paid';
    paid = total;
  }

  return {
    paymentStatus: status,
    paidAmountAmd: paid,
    totalPriceAmd: total,
    remainingAmd: remaining,
  };
}

export function validateAdminPaymentInput(input: {
  adminPaymentStatus: AdminBookingPaymentStatus;
  paidAmountAmd: number | undefined;
  totalPriceAmd: number;
}): { paymentStatus: AdminBookingPaymentStatus; paidAmountAmd: number } {
  const total = roundAmd(input.totalPriceAmd);
  const status = input.adminPaymentStatus;

  if (total <= 0) {
    return { paymentStatus: 'paid', paidAmountAmd: 0 };
  }

  if (status === 'paid') {
    return { paymentStatus: 'paid', paidAmountAmd: total };
  }

  if (status === 'unpaid') {
    return { paymentStatus: 'unpaid', paidAmountAmd: 0 };
  }

  const raw = input.paidAmountAmd;
  if (raw == null || !Number.isFinite(Number(raw))) {
    throw new Error('Paid amount is required for partial payment.');
  }
  const paid = roundAmd(Number(raw));
  if (paid <= 0) {
    throw new Error('Partial paid amount must be greater than zero.');
  }
  if (paid >= total) {
    throw new Error('Partial paid amount must be less than the total booking price.');
  }
  return { paymentStatus: 'partial', paidAmountAmd: paid };
}

export type BookingPaymentStatusDb = AdminBookingPaymentStatus | 'pending' | 'failed';

export function adminPaymentFieldsForDb(
  totalPriceAmd: number,
  adminPaymentStatus: AdminBookingPaymentStatus | undefined,
  paidAmountAmd: number | undefined,
  opts?: { prepaidMeta?: Record<string, unknown> | null },
): { paymentStatus: BookingPaymentStatusDb; paidAmountAmd: number; paidAt: Date | null } {
  if (opts?.prepaidMeta != null) {
    return { paymentStatus: 'paid', paidAmountAmd: 0, paidAt: new Date() };
  }
  const status = adminPaymentStatus ?? 'unpaid';
  const validated = validateAdminPaymentInput({
    adminPaymentStatus: status,
    paidAmountAmd,
    totalPriceAmd,
  });
  return {
    paymentStatus: validated.paymentStatus,
    paidAmountAmd: validated.paidAmountAmd,
    paidAt: validated.paymentStatus === 'paid' && totalPriceAmd > 0 ? new Date() : null,
  };
}

export function buildStudentPaymentSummary(
  rows: Array<
    BookingPaymentRow & {
      id: number;
      dateIso: string;
      time: string;
      endTime?: string | null;
      lessonType: 'practical' | 'theory' | 'theory_personal';
      paymentNotes?: string | null;
      paymentReminderAt?: Date | null;
    }
  >,
): StudentPaymentSummaryDto {
  let totalDebtAmd = 0;
  let totalPaidOnBookingsAmd = 0;
  const unpaidBookings: StudentPaymentSummaryDto['unpaidBookings'] = [];

  for (const row of rows) {
    if (!bookingCountsTowardStudentDebt(row)) continue;
    const resolved = resolveBookingPayment(row);
    totalPaidOnBookingsAmd += resolved.paidAmountAmd;
    if (resolved.remainingAmd <= 0) continue;
    totalDebtAmd += resolved.remainingAmd;
    unpaidBookings.push({
      id: row.id,
      dateIso: String(row.dateIso).slice(0, 10),
      time: row.time,
      endTime: row.endTime ?? null,
      totalPriceAmd: resolved.totalPriceAmd,
      paidAmountAmd: resolved.paidAmountAmd,
      remainingAmd: resolved.remainingAmd,
      lessonTypeKey:
        row.lessonType === 'theory'
          ? 'lessonTypeTheory'
          : row.lessonType === 'theory_personal'
            ? 'lessonTypeTheoryPersonal'
            : 'lessonTypePractical',
      paymentStatus: resolved.paymentStatus,
      status: normalizeLifecycleStatus(String(row.status)),
      paymentNotes: row.paymentNotes?.trim() ? row.paymentNotes.trim() : null,
      paymentReminderDateIso: paymentReminderDateIsoForApi(row.paymentReminderAt ?? null),
    });
  }

  unpaidBookings.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.time.localeCompare(a.time));

  return {
    totalDebtAmd,
    totalPaidOnBookingsAmd,
    totalRemainingAmd: totalDebtAmd,
    unpaidBookings,
  };
}

/** Cash-like income recognized from payment fields (not booking lifecycle status). */
export function recognizedIncomeAmd(row: BookingPaymentRow): number {
  if (!bookingCountsTowardStudentDebt(row)) return 0;
  const resolved = resolveBookingPayment(row);
  const ps = resolved.paymentStatus;
  if (ps === 'unpaid' || ps === 'pending' || ps === 'failed') return 0;
  return resolved.paidAmountAmd;
}

function instantUtcMs(raw: Date | string | null | undefined): number | null {
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function instantInUtcMsRange(
  raw: Date | string | null | undefined,
  fromMs: number,
  toMs: number,
): boolean {
  const ts = instantUtcMs(raw);
  return ts != null && ts >= fromMs && ts <= toMs;
}

export type BookingIncomeInPeriodInput = {
  incomeTxs: ReadonlyArray<{
    bookingId: number | null;
    grossAmd: number;
    createdAt?: Date | string | null;
  }>;
  fallbackBookings: ReadonlyArray<
    BookingPaymentRow & { id: number; paidAt?: Date | null }
  >;
  startAtMs: number;
  endAtMs: number;
};

export type BookingIncomeInPeriodResult = {
  totalIncomeAmd: number;
  bookingIncomeAmd: Map<number, number>;
  bookingPaymentDateMs: Map<number, number>;
};

/**
 * Cash collected for bookings in a period (payment date), not booking creation or lesson date.
 * Primary source: completed income finance rows linked to a booking (`createdAt`).
 * Fallback: booking `paidAt` when no ledger row exists for that booking in the period.
 */
export function computeBookingIncomeInPeriod(
  input: BookingIncomeInPeriodInput,
): BookingIncomeInPeriodResult {
  const bookingIncomeAmd = new Map<number, number>();
  const bookingPaymentDateMs = new Map<number, number>();
  const bookingIdsWithLedgerInPeriod = new Set<number>();
  let totalIncomeAmd = 0;

  for (const tx of input.incomeTxs) {
    const bid = tx.bookingId;
    if (bid == null || !Number.isFinite(bid) || bid <= 0) continue;
    if (!instantInUtcMsRange(tx.createdAt, input.startAtMs, input.endAtMs)) continue;
    const amt = Math.max(0, Math.round(Number(tx.grossAmd) || 0));
    if (amt <= 0) continue;
    totalIncomeAmd += amt;
    bookingIdsWithLedgerInPeriod.add(bid);
    bookingIncomeAmd.set(bid, (bookingIncomeAmd.get(bid) ?? 0) + amt);
    const txMs = instantUtcMs(tx.createdAt);
    if (txMs != null) {
      const prev = bookingPaymentDateMs.get(bid) ?? 0;
      if (txMs > prev) bookingPaymentDateMs.set(bid, txMs);
    }
  }

  for (const row of input.fallbackBookings) {
    const bid = row.id;
    if (!Number.isFinite(bid) || bid <= 0) continue;
    if (bookingIdsWithLedgerInPeriod.has(bid)) continue;
    if (!bookingCountsTowardStudentDebt(row)) continue;
    if (!instantInUtcMsRange(row.paidAt, input.startAtMs, input.endAtMs)) continue;
    const income = recognizedIncomeAmd(row);
    if (income <= 0) continue;
    totalIncomeAmd += income;
    bookingIncomeAmd.set(bid, (bookingIncomeAmd.get(bid) ?? 0) + income);
    const paidMs = instantUtcMs(row.paidAt);
    if (paidMs != null) bookingPaymentDateMs.set(bid, paidMs);
  }

  return { totalIncomeAmd, bookingIncomeAmd, bookingPaymentDateMs };
}

export function isCountableAdminPaymentStatus(
  ps: ResolvedBookingPayment['paymentStatus'],
): ps is AdminBookingPaymentStatus {
  return ps === 'paid' || ps === 'partial' || ps === 'unpaid';
}
