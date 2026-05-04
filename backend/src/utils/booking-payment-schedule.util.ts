/**
 * Payment timing for lesson bookings: “immediate payment” when the lesson date falls within
 * one calendar month of today (same rule as {@link isLessonOnOrBeforePayHorizon}).
 * Pure date-only (YYYY-MM-DD) logic for stable behavior across timezones.
 */

import {
  addOneCalendarMonth,
  isLessonOnOrBeforePayHorizon,
  parseIsoDateParts,
  subtractOneCalendarMonth,
  todayIsoUtc,
} from './calendar-month.util';

export const PAYMENT_REMINDER_DAYS_BEFORE_REQUIRED = 3;

/** Lesson date is close enough that payment must be completed at booking time (no unpaid reservation). */
export function isImmediatePaymentRequired(lessonDateIso: string, todayIso: string = todayIsoUtc()): boolean {
  return isLessonOnOrBeforePayHorizon(lessonDateIso, todayIso);
}

/** Early lesson slots may be reserved unpaid when the lesson is still beyond the one-month horizon. */
export function canReserveWithoutPayment(lessonDateIso: string, todayIso: string = todayIsoUtc()): boolean {
  return !isLessonOnOrBeforePayHorizon(lessonDateIso, todayIso);
}

/**
 * First calendar day when `isImmediatePaymentRequired(lesson, today)` becomes true.
 * Found by advancing from {@link subtractOneCalendarMonth} until the pay-horizon covers the lesson.
 */
export function getPaymentRequiredCalendarIso(lessonDateIso: string): string {
  const lesson = lessonDateIso.slice(0, 10);
  let t = subtractOneCalendarMonth(lesson);
  for (let guard = 0; guard < 400; guard++) {
    if (lesson <= addOneCalendarMonth(t)) return t;
    t = addCalendarDays(t, 1);
  }
  throw new Error(`Could not resolve payment-required calendar day for lesson ${lessonDateIso}`);
}

export function addCalendarDays(isoDate: string, deltaDays: number): string {
  const p = parseIsoDateParts(isoDate);
  if (!p) throw new Error(`Invalid ISO date: ${isoDate}`);
  const u = Date.UTC(p.y, p.m - 1, p.d + deltaDays);
  const d = new Date(u);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Calendar day when the “pay within one month” reminder should fire (3 days before obligation starts). */
export function getPaymentReminderCalendarIso(paymentRequiredCalendarIso: string): string {
  return addCalendarDays(paymentRequiredCalendarIso, -PAYMENT_REMINDER_DAYS_BEFORE_REQUIRED);
}

export function shouldSendPaymentReminderToday(
  todayIso: string,
  paymentRequiredCalendarIso: string,
  reminderAlreadySent: boolean,
): boolean {
  if (reminderAlreadySent) return false;
  const reminderDay = getPaymentReminderCalendarIso(paymentRequiredCalendarIso);
  return todayIso === reminderDay;
}

/** After this calendar day ends without payment, reserved unpaid bookings are auto-cancelled. */
export function shouldAutoCancelUnpaidAfterPaymentDeadline(
  todayIso: string,
  paymentRequiredCalendarIso: string,
  isPaid: boolean,
): boolean {
  if (isPaid) return false;
  return todayIso > paymentRequiredCalendarIso;
}

/** Product alias: first calendar day when paying at booking time becomes mandatory. */
export { getPaymentRequiredCalendarIso as getPaymentRequiredAt };
