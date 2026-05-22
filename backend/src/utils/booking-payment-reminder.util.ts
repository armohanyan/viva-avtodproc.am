import type { Booking } from '../models';
import {
  bookingCountsTowardStudentDebt,
  resolveBookingPayment,
  type AdminBookingPaymentStatus,
} from './booking-admin-payment.util';

type BookingPaymentRow = Parameters<typeof resolveBookingPayment>[0];
import { bookingEndUtcMs } from './lesson-datetime.util';

const YEREVAN_TZ = 'Asia/Yerevan';
const YEREVAN_OFFSET = '+04:00';
const REMINDER_HOUR = 22;

/** Admin date-only input → that calendar day at 22:00 Armenia time. */
export function parseAdminPaymentReminderDate(dateOnly: string): Date {
  const d = dateOnly.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error('Invalid payment reminder date.');
  }
  const ms = Date.parse(`${d}T${String(REMINDER_HOUR).padStart(2, '0')}:00:00${YEREVAN_OFFSET}`);
  if (!Number.isFinite(ms)) {
    throw new Error('Invalid payment reminder date.');
  }
  return new Date(ms);
}

function yerevanDateIsoFromUtcMs(ms: number): string {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

function yerevanAddCalendarDays(fromIso: string, deltaDays: number): string {
  const base = `${fromIso.slice(0, 10)}T12:00:00${YEREVAN_OFFSET}`;
  const t = Date.parse(base);
  if (!Number.isFinite(t)) return fromIso;
  return new Date(t + deltaDays * 86400000).toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

function lessonEndYerevanDateIso(row: Pick<Booking, 'dateIso' | 'time' | 'endTime'>): string {
  const endMs = bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime);
  if (!Number.isFinite(endMs)) return String(row.dateIso).slice(0, 10);
  return yerevanDateIsoFromUtcMs(endMs);
}

/** Automatic reminder: 3 days after practical lesson end, 7 days after theory types — at 22:00 Yerevan. */
export function computeAutomaticPaymentReminderAt(
  row: Pick<Booking, 'dateIso' | 'time' | 'endTime' | 'lessonType'>,
): Date | null {
  const lessonDay = lessonEndYerevanDateIso(row);
  const daysAfter = row.lessonType === 'practical' ? 3 : 7;
  const targetDay = yerevanAddCalendarDays(lessonDay, daysAfter);
  return parseAdminPaymentReminderDate(targetDay);
}

export function resolveDebtPaymentReminderDueAt(
  row: Pick<
    Booking,
    'dateIso' | 'time' | 'endTime' | 'lessonType' | 'paymentReminderAt'
  >,
): Date | null {
  if (row.paymentReminderAt != null) {
    const d = row.paymentReminderAt instanceof Date ? row.paymentReminderAt : new Date(row.paymentReminderAt);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return computeAutomaticPaymentReminderAt(row);
}

export function bookingAdminDebtPaymentStatus(row: BookingPaymentRow): AdminBookingPaymentStatus | null {
  if (!bookingCountsTowardStudentDebt(row)) return null;
  const resolved = resolveBookingPayment(row);
  const ps = resolved.paymentStatus;
  if (ps === 'paid' || ps === 'partial' || ps === 'unpaid') return ps;
  return null;
}

export function bookingNeedsDebtPaymentReminder(row: BookingPaymentRow): boolean {
  const status = bookingAdminDebtPaymentStatus(row);
  return status === 'unpaid' || status === 'partial';
}

export function paymentReminderDateIsoForApi(at: Date | null | undefined): string | null {
  if (at == null) return null;
  const d = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

export type AdminPaymentExtrasInput = {
  adminPaymentStatus?: AdminBookingPaymentStatus;
  paymentNotes?: string | null;
  paymentReminderDate?: string | null;
};

export function adminPaymentExtrasForCreate(
  paymentStatus: AdminBookingPaymentStatus,
  input: AdminPaymentExtrasInput,
): { paymentNotes: string | null; paymentReminderAt: Date | null } {
  const extras = adminPaymentExtrasForDb(paymentStatus, {
    ...input,
    adminPaymentStatus: paymentStatus,
  });
  return {
    paymentNotes: extras.paymentNotes ?? null,
    paymentReminderAt: extras.paymentReminderAt,
  };
}

export function mergeAdminPaymentExtrasPatch(
  row: Booking,
  patch: AdminPaymentExtrasInput,
  effectiveStatus: AdminBookingPaymentStatus,
): Partial<{
  paymentNotes: string | null;
  paymentReminderAt: Date | null;
  paymentReminderSentAt: Date | null;
}> {
  if (
    patch.paymentNotes === undefined &&
    patch.paymentReminderDate === undefined &&
    patch.adminPaymentStatus === undefined
  ) {
    return {};
  }
  const extras = adminPaymentExtrasForDb(effectiveStatus, patch, {
    paymentReminderAt: row.paymentReminderAt,
    paymentReminderSentAt: row.paymentReminderSentAt,
  });
  const out: Partial<{
    paymentNotes: string | null;
    paymentReminderAt: Date | null;
    paymentReminderSentAt: Date | null;
  }> = {};
  if (patch.paymentNotes !== undefined) {
    out.paymentNotes = extras.paymentNotes;
  }
  if (patch.paymentReminderDate !== undefined || patch.adminPaymentStatus !== undefined) {
    out.paymentReminderAt = extras.paymentReminderAt;
    if (extras.paymentReminderSentAt !== undefined) {
      out.paymentReminderSentAt = extras.paymentReminderSentAt;
    }
  }
  return out;
}

function adminPaymentExtrasForDb(
  effectiveStatus: AdminBookingPaymentStatus,
  input: AdminPaymentExtrasInput,
  previous?: { paymentReminderAt?: Date | null; paymentReminderSentAt?: Date | null },
): {
  paymentNotes?: string | null;
  paymentReminderAt: Date | null;
  paymentReminderSentAt?: Date | null;
} {
  const notes =
    input.paymentNotes !== undefined
      ? input.paymentNotes?.trim()
        ? input.paymentNotes.trim().slice(0, 2000)
        : null
      : undefined;

  let paymentReminderAt: Date | null = previous?.paymentReminderAt ?? null;
  let paymentReminderSentAt: Date | null | undefined;

  const reminderTouched =
    input.paymentReminderDate !== undefined || input.adminPaymentStatus !== undefined;

  if (reminderTouched) {
    if (effectiveStatus === 'paid') {
      paymentReminderAt = null;
    } else if (input.paymentReminderDate !== undefined) {
      const raw = input.paymentReminderDate?.trim() ?? '';
      if (!raw) {
        paymentReminderAt = null;
      } else {
        const at = parseAdminPaymentReminderDate(raw);
        const prevMs = previous?.paymentReminderAt?.getTime?.() ?? null;
        paymentReminderAt = at;
        if (prevMs !== at.getTime()) {
          paymentReminderSentAt = null;
        }
      }
    }
  }

  return {
    ...(notes !== undefined ? { paymentNotes: notes } : {}),
    paymentReminderAt,
    ...(paymentReminderSentAt !== undefined ? { paymentReminderSentAt } : {}),
  };
}

export function isDebtPaymentReminderDue(now: Date, dueAt: Date): boolean {
  return dueAt.getTime() <= now.getTime();
}
