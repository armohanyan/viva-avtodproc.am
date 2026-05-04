import { Op } from 'sequelize';
import { Booking } from '../models';
import NotificationService from './notification.service';
import LoggerUtil from '../utils/logger.util';
import BookingNotificationService from './booking-notification.service';
import BookingService from './booking.service';
import { todayIsoUtc } from '../utils/calendar-month.util';
import { shouldAutoCancelUnpaidAfterPaymentDeadline } from '../utils/booking-payment-schedule.util';

/**
 * Deletes unpaid bookings whose server-side payment hold has expired.
 * Slot rows cascade on `booking_slots.booking_id` FK.
 *
 * “Pay later” rows (`hold_expires_at` null) are not deleted here unless they start a hold and let it expire.
 */
export default class BookingCronService {
  static async runDueJobs(): Promise<{
    legacyNormalized: number;
    deletedExpiredHolds: number;
    remindersCreated: number;
    paymentRemindersSent: number;
    autoCancelledUnpaidReserved: number;
    upcomingLessonRemindersCreated: number;
  }> {
    const [legacyNormalized] = await Booking.update(
      { status: 'pending' },
      {
        where: {
          status: 'pending_prebook',
          paidAt: { [Op.is]: null },
        },
      },
    );

    const deletedExpiredHolds = await Booking.destroy({
      where: {
        status: { [Op.in]: ['pending', 'pending_payment'] },
        paidAt: { [Op.is]: null },
        holdExpiresAt: { [Op.and]: [{ [Op.ne]: null }, { [Op.lt]: new Date() }] },
      },
    });

    if (legacyNormalized > 0 || deletedExpiredHolds > 0) {
      LoggerUtil.info(
        `Booking cron: normalized ${legacyNormalized} legacy status row(s); deleted ${deletedExpiredHolds} expired unpaid booking(s)`,
      );
    }

    const upcomingLessonRemindersCreated = await NotificationService.emitUpcomingLessonReminders();

    const today = todayIsoUtc();
    const reminderRows = await Booking.findAll({
      where: {
        status: 'pending_payment',
        lessonType: 'practical',
        paidAt: { [Op.is]: null },
        paymentRequiredAt: { [Op.ne]: null },
        paymentReminderSentAt: { [Op.is]: null },
      },
      attributes: ['id'],
    });
    let paymentRemindersSent = 0;
    for (const r of reminderRows) {
      const ok = await BookingNotificationService.emitReservedPaymentReminderOnce(r.id);
      if (ok) paymentRemindersSent += 1;
    }

    const cancelRows = await Booking.findAll({
      where: {
        status: 'pending_payment',
        lessonType: 'practical',
        paidAt: { [Op.is]: null },
        paymentRequiredAt: { [Op.ne]: null },
      },
      attributes: ['id', 'paymentRequiredAt'],
    });
    let autoCancelledUnpaidReserved = 0;
    for (const r of cancelRows) {
      const pr = String(r.paymentRequiredAt).slice(0, 10);
      if (!shouldAutoCancelUnpaidAfterPaymentDeadline(today, pr, false)) continue;
      const did = await BookingService.autoCancelReservedUnpaidAfterPaymentDeadlineFromCron(r.id);
      if (did) autoCancelledUnpaidReserved += 1;
    }

    const remindersCreated = upcomingLessonRemindersCreated + paymentRemindersSent;

    if (paymentRemindersSent > 0 || autoCancelledUnpaidReserved > 0) {
      LoggerUtil.info(
        `Booking cron: payment reminders ${paymentRemindersSent}; auto-cancelled unpaid reserved ${autoCancelledUnpaidReserved}`,
      );
    }
    if (upcomingLessonRemindersCreated > 0) {
      LoggerUtil.info(`Booking cron: created ${upcomingLessonRemindersCreated} upcoming-lesson reminder notification(s)`);
    }

    return {
      legacyNormalized,
      deletedExpiredHolds,
      remindersCreated,
      paymentRemindersSent,
      autoCancelledUnpaidReserved,
      upcomingLessonRemindersCreated,
    };
  }
}
