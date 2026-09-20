/**
 * Lightweight checks for cancellation window helpers (no DB).
 * Run: `yarn selftest:booking` from `backend/`.
 */
import assert from 'node:assert/strict';
import { BookingNotificationPersistedType } from '../constants/booking-notification-types';
import { NOTIFICATION_TYPES } from '../models/notification.model';
import {
  hoursFromInstantUntilLessonStart,
  hoursUntilLessonStart,
  isRefundWindowForCancellation,
} from '../services/booking.service';
import { clipOccupiedRangeForForceSlot, claimStartTimesForOccupiedBooking, claimStartTimesInRange, occupiedRangesMinutes } from '../services/booking-slot-validation.service';
import { bookableTimesFromPlan, DEFAULT_PRACTICAL_SLOT_PLAN } from '../utils/practical-slot-plan.util';
import { rangesOverlapHalfOpen } from '../utils/booking-slot.util';

const far = hoursUntilLessonStart('2099-06-15', '10:00');
assert.ok(far > 24 * 365, 'far-future lesson should be many hours away');

const past = hoursUntilLessonStart('2000-01-01', '10:00');
assert.ok(past < 0, 'past lesson should be negative hours');

assert.equal(isRefundWindowForCancellation('2099-06-15', '10:00'), true, 'far lesson should be in refund window');

const lessonMs = Date.parse('2099-06-15T10:00:00+04:00');
const requestAt25hBefore = new Date(lessonMs - 25 * 3600_000);
assert.ok(
  hoursFromInstantUntilLessonStart('2099-06-15', '10:00', requestAt25hBefore) >= 24,
  'request 25h before lesson should count as refund-eligible at request time',
);

assert.ok(NOTIFICATION_TYPES.includes('BOOKING_REFUNDED'), 'NOTIFICATION_TYPES should include BOOKING_REFUNDED');
assert.ok(NOTIFICATION_TYPES.includes('BOOKING_PAYMENT_REMINDER'), 'NOTIFICATION_TYPES should include BOOKING_PAYMENT_REMINDER');
assert.ok(NOTIFICATION_TYPES.includes('BOOKING_AUTO_CANCELLED_PAYMENT'), 'NOTIFICATION_TYPES should include BOOKING_AUTO_CANCELLED_PAYMENT');
assert.ok(
  NOTIFICATION_TYPES.includes('BOOKING_REFUND_INVITATION'),
  'NOTIFICATION_TYPES should include BOOKING_REFUND_INVITATION',
);
for (const v of Object.values(BookingNotificationPersistedType)) {
  assert.ok(
    (NOTIFICATION_TYPES as readonly string[]).includes(v),
    `booking notification type ${v} must exist on Notification model`,
  );
}

/** 18.08 multi-day booking with 12:10 + 16:10 must not swallow 13:20 / 15:00. */
const gapDayRanges = occupiedRangesMinutes(
  '17:20',
  null,
  '2026-08-16',
  '2026-08-18',
  ['12:10', '16:10'],
);
const slot1320 = { start: 13 * 60 + 20, end: 15 * 60 };
const slot1500 = { start: 15 * 60, end: 16 * 60 + 10 };
assert.equal(
  gapDayRanges.some((r) => rangesOverlapHalfOpen(slot1320, r)),
  false,
  '12:10+16:10 must not occupy 13:20',
);
assert.equal(
  gapDayRanges.some((r) => rangesOverlapHalfOpen(slot1500, r)),
  false,
  '12:10+16:10 must not occupy 15:00',
);
assert.equal(
  gapDayRanges.some((r) => rangesOverlapHalfOpen({ start: 12 * 60 + 10, end: 13 * 60 + 20 }, r)),
  true,
  '12:10 must still occupy its own lesson',
);
assert.equal(
  gapDayRanges.some((r) => rangesOverlapHalfOpen({ start: 16 * 60 + 10, end: 17 * 60 + 20 }, r)),
  true,
  '16:10 must still occupy its own lesson',
);

/** Same-day non-adjacent practical starts must not become one long block. */
const splitSameDayRanges = occupiedRangesMinutes(
  '10:00',
  '15:00',
  '2026-08-08',
  '2026-08-08',
  ['10:00', '13:20'],
);
assert.equal(
  splitSameDayRanges.some((r) => rangesOverlapHalfOpen({ start: 11 * 60, end: 12 * 60 }, r)),
  false,
  '10:00 + 13:20 must not occupy 11:00',
);
assert.equal(
  splitSameDayRanges.some((r) => rangesOverlapHalfOpen({ start: 12 * 60 + 10, end: 13 * 60 + 20 }, r)),
  false,
  '10:00 + 13:20 must not occupy 12:10',
);
assert.equal(
  splitSameDayRanges.some((r) => rangesOverlapHalfOpen({ start: 10 * 60, end: 11 * 60 }, r)),
  true,
  '10:00 must still occupy its own lesson',
);
assert.equal(
  splitSameDayRanges.some((r) => rangesOverlapHalfOpen({ start: 13 * 60 + 20, end: 15 * 60 }, r)),
  true,
  '13:20 must still occupy its own lesson',
);

/** Force/custom slot: pre-lunch 13:20 plan occupancy must not claim through lunch. */
const lunch = [{ start: 14 * 60, end: 15 * 60 }];
const plan1320 = { start: 13 * 60 + 20, end: 15 * 60 };
const clipped = clipOccupiedRangeForForceSlot(plan1320, lunch);
assert.deepEqual(clipped, { start: 13 * 60 + 20, end: 14 * 60 });
assert.equal(
  rangesOverlapHalfOpen({ start: 14 * 60 + 30, end: 15 * 60 + 30 }, clipped),
  false,
  'force slot 14:30-15:30 must be free vs clipped 13:20 occupancy',
);

const defaultBookable = bookableTimesFromPlan(DEFAULT_PRACTICAL_SLOT_PLAN);

/**
 * Off-plan custom window: occupiedRangesMinutes keeps the full endTime span, so busy-slots
 * must mark intermediate plan starts (e.g. 15:00) — otherwise change-hours shows them free
 * and save rejects with instructor-overlap.
 */
const customWindowClaims = claimStartTimesForOccupiedBooking({
  bookingTime: '14:00',
  bookingEndTime: '15:30',
  bookingDateIso: '2026-09-22',
  dateIso: '2026-09-22',
  slotTimesOnDate: ['14:00'],
  bookableSorted: defaultBookable,
});
assert.ok(customWindowClaims.includes('14:00'), 'custom window must include claimed start 14:00');
assert.ok(
  customWindowClaims.includes('15:00'),
  'custom 14:00–15:30 must mark 15:00 busy (change-hours must not show it free)',
);
assert.equal(
  customWindowClaims.includes('16:10'),
  false,
  'custom 14:00–15:30 must not mark 16:10 (half-open end)',
);

/** On-plan single claim with endTime past the next plan start uses plan-range only (matches save). */
const onPlanClaims = claimStartTimesForOccupiedBooking({
  bookingTime: '10:00',
  bookingEndTime: '12:00',
  bookingDateIso: '2026-09-22',
  dateIso: '2026-09-22',
  slotTimesOnDate: ['10:00'],
  bookableSorted: defaultBookable,
});
assert.deepEqual(
  onPlanClaims,
  ['10:00'],
  'on-plan 10:00 with end 12:00 occupies only the plan lesson start (same as validation)',
);

/** Multi-slot same day still expands each lesson independently (no long block). */
const multiSlotClaims = claimStartTimesForOccupiedBooking({
  bookingTime: '10:00',
  bookingEndTime: '15:00',
  bookingDateIso: '2026-08-08',
  dateIso: '2026-08-08',
  slotTimesOnDate: ['10:00', '13:20'],
  bookableSorted: defaultBookable,
});
assert.ok(multiSlotClaims.includes('10:00') && multiSlotClaims.includes('13:20'));
assert.equal(
  multiSlotClaims.includes('11:00'),
  false,
  '10:00+13:20 must not mark 11:00 via endTime merge',
);

/** Theory / range expansion covers :10 plan rows, not only hourly ticks. */
const theoryClaims = claimStartTimesInRange('14:00', '16:10', defaultBookable);
assert.ok(theoryClaims.includes('15:00'), 'theory 14:00–16:10 must cover 15:00 plan start');
assert.ok(theoryClaims.includes('14:00'));
assert.equal(theoryClaims.includes('16:10'), false, 'half-open end must exclude 16:10');

// eslint-disable-next-line no-console
console.log('booking-rules-selftest: OK');
