import { Op } from 'sequelize';
import { Booking } from '../models';
import { addOneCalendarMonth, todayIsoUtc } from '../utils/calendar-month.util';
import LoggerUtil from '../utils/logger.util';

const PAYMENT_HOLD_MS = 10 * 60 * 1000;

/**
 * Background jobs for practical-style bookings with pre-book + payment window.
 *
 * 1) `pending_prebook` + unpaid + lesson date entered the “≤ same calendar day next month” window
 *    → `pending_payment` and a 10-minute payment hold (slot stays busy until paid or hold expires).
 * 2) `pending_payment` + unpaid + hold expired → `cancelled` (slot freed).
 */
export default class BookingCronService {
  static async runDueJobs(): Promise<{ promoted: number; expiredHolds: number }> {
    const today = todayIsoUtc();
    const payHorizonEnd = addOneCalendarMonth(today);

    const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MS);
    const [promoted] = await Booking.update(
      { status: 'pending_payment', holdExpiresAt: holdUntil },
      {
        where: {
          status: 'pending_prebook',
          paidAt: { [Op.is]: null },
          dateIso: { [Op.lte]: payHorizonEnd },
        },
      },
    );

    const [expiredHolds] = await Booking.update(
      { status: 'cancelled', holdExpiresAt: null },
      {
        where: {
          status: 'pending_payment',
          paidAt: { [Op.is]: null },
          holdExpiresAt: { [Op.lt]: new Date() },
        },
      },
    );

    if (promoted > 0 || expiredHolds > 0) {
      LoggerUtil.info(
        `Booking cron: promoted ${promoted} pre-book(s) to payment due; cancelled ${expiredHolds} expired unpaid hold(s)`,
      );
    }

    return { promoted, expiredHolds };
  }
}
