/**
 * Pure calendar tests for reserved-unpaid practical payment timing (no DB).
 * Run: `yarn selftest:payment-schedule` from `backend/`.
 */
import assert from 'node:assert/strict';
import {
  canReserveWithoutPayment,
  getPaymentRequiredCalendarIso,
  getPaymentReminderCalendarIso,
  isImmediatePaymentRequired,
  shouldAutoCancelUnpaidAfterPaymentDeadline,
  shouldSendPaymentReminderToday,
} from '../utils/booking-payment-schedule.util';

assert.equal(isImmediatePaymentRequired('2026-06-06', '2026-04-04'), false, 'far lesson: payment not immediate at booking');
assert.equal(canReserveWithoutPayment('2026-06-06', '2026-04-04'), true);

assert.equal(isImmediatePaymentRequired('2026-06-06', '2026-05-06'), true, 'within horizon: pay now');
assert.equal(canReserveWithoutPayment('2026-06-06', '2026-05-06'), false);

assert.equal(getPaymentRequiredCalendarIso('2026-06-06'), '2026-05-06');

assert.equal(getPaymentRequiredCalendarIso('2026-03-31'), '2026-03-01');

const pr = getPaymentRequiredCalendarIso('2026-06-06');
assert.equal(getPaymentReminderCalendarIso(pr), '2026-05-03');

assert.equal(shouldSendPaymentReminderToday('2026-05-03', pr, false), true);
assert.equal(shouldSendPaymentReminderToday('2026-05-02', pr, false), false);
assert.equal(shouldSendPaymentReminderToday('2026-05-03', pr, true), false);

assert.equal(shouldAutoCancelUnpaidAfterPaymentDeadline('2026-05-06', pr, false), false, 'deadline day still allowed');
assert.equal(shouldAutoCancelUnpaidAfterPaymentDeadline('2026-05-07', pr, false), true);
assert.equal(shouldAutoCancelUnpaidAfterPaymentDeadline('2026-05-07', pr, true), false, 'paid never auto-cancelled');

// eslint-disable-next-line no-console
console.log('booking-payment-schedule-selftest: OK');
