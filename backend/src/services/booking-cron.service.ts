import { Op } from 'sequelize';
import { Booking } from '../models';
import NotificationService from './notification.service';
import LoggerUtil from '../utils/logger.util';

/**
 * Deletes unpaid bookings whose server-side payment hold has expired.
 * Slot rows cascade on `booking_slots.booking_id` FK.
 *
 * Does **not** auto-start holds for “pay later” rows (`hold_expires_at` null).
 */
export default class BookingCronService {
  static async runDueJobs(): Promise<{ legacyNormalized: number; deletedExpiredHolds: number; remindersCreated: number }> {
    const [legacyNormalized] = await Booking.update(
      { status: 'pending' },
      {
        where: {
          status: { [Op.in]: ['pending_prebook', 'pending_payment'] },
          paidAt: { [Op.is]: null },
        },
      },
    );

    const deletedExpiredHolds = await Booking.destroy({
      where: {
        status: 'pending',
        paidAt: { [Op.is]: null },
        holdExpiresAt: { [Op.and]: [{ [Op.ne]: null }, { [Op.lt]: new Date() }] },
      },
    });

    if (legacyNormalized > 0 || deletedExpiredHolds > 0) {
      LoggerUtil.info(
        `Booking cron: normalized ${legacyNormalized} legacy status row(s); deleted ${deletedExpiredHolds} expired unpaid booking(s)`,
      );
    }
    const remindersCreated = await NotificationService.emitUpcomingLessonReminders();
    if (remindersCreated > 0) {
      LoggerUtil.info(`Booking cron: created ${remindersCreated} upcoming-lesson reminder notification(s)`);
    }

    return { legacyNormalized, deletedExpiredHolds, remindersCreated };
  }
}
