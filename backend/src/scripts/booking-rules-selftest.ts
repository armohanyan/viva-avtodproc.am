/**
 * Lightweight checks for cancellation window helpers (no DB).
 * Run: `yarn selftest:booking` from `backend/`.
 */
import assert from 'node:assert/strict';
import { hoursUntilLessonStart, isRefundWindowForCancellation } from '../services/booking.service';

const far = hoursUntilLessonStart('2099-06-15', '10:00');
assert.ok(far > 24 * 365, 'far-future lesson should be many hours away');

const past = hoursUntilLessonStart('2000-01-01', '10:00');
assert.ok(past < 0, 'past lesson should be negative hours');

assert.equal(isRefundWindowForCancellation('2099-06-15', '10:00'), true, 'far lesson should be in refund window');

// eslint-disable-next-line no-console
console.log('booking-rules-selftest: OK');
