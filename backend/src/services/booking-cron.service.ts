import { Op } from 'sequelize';
import { Booking } from '../models';
import { addOneCalendarMonth, todayIsoUtc } from '../utils/calendar-month.util';
import LoggerUtil from '../utils/logger.util';

const PAYMENT_HOLD_MS = 10 * 60 * 1000;

/**
 * Background jobs for `pending` bookings with a payment window (`hold_expires_at`).
 *
 * 1) `pending` + unpaid + lesson in pay horizon + no hold yet → start 10-minute hold (still `pending`).
 * 2) `pending` + unpaid + active hold expired → `cancelled` (slot freed).
 *
 * Also migrates legacy statuses from older rows into the same flow once per row.
 */
export default class BookingCronService {
  static async runDueJobs(): Promise<{ promoted: number; expiredHolds: number }> {
    const today = todayIsoUtc();
    const payHorizonEnd = addOneCalendarMonth(today);

    const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MS);

    const [legacyToPending] = await Booking.update(
      { status: 'pending' },
      {
        where: {
          status: { [Op.in]: ['pending_prebook', 'pending_payment'] },
          paidAt: { [Op.is]: null },
        },
      },
    );

    const [promoted] = await Booking.update(
      { holdExpiresAt: holdUntil },
      {
        where: {
          status: 'pending',
          lessonType: 'practical',
          paidAt: { [Op.is]: null },
          dateIso: { [Op.lte]: payHorizonEnd },
          holdExpiresAt: { [Op.is]: null },
        },
      },
    );

    const [expiredHolds] = await Booking.update(
      { status: 'cancelled', holdExpiresAt: null },
      {
        where: {
          status: 'pending',
          paidAt: { [Op.is]: null },
          holdExpiresAt: { [Op.lt]: new Date() },
        },
      },
    );

    if (legacyToPending > 0 || promoted > 0 || expiredHolds > 0) {
      LoggerUtil.info(
        `Booking cron: normalized ${legacyToPending} legacy status row(s); started ${promoted} payment hold(s); cancelled ${expiredHolds} expired unpaid hold(s)`,
      );
    }

    return { promoted, expiredHolds };
  }
}
