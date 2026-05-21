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
