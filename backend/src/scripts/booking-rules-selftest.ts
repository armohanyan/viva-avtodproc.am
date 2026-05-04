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

// eslint-disable-next-line no-console
console.log('booking-rules-selftest: OK');
