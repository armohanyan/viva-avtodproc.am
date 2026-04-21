import config from '../config';
import { Booking, User } from '../models';
import { sendBookingConfirmation, type BookingConfirmationData } from './mail.service';
import { LoggerUtil } from '../utils';

function isConfirmedOrPaid(row: { status: string; paidAt: Date | null }): boolean {
  const st = String(row.status).toLowerCase();
  if (st === 'confirmed' || st === 'completed') {
    return true;
  }
  return row.paidAt != null;
}

/**
 * Sends at most one confirmation email per booking when it becomes paid and/or confirmed.
 * Fire-and-forget: callers should `void ...catch(() => {})` if they do not want failures to surface.
 */
export default class BookingConfirmationNotifier {
  static async trySendForBookingId(bookingId: number): Promise<void> {
    const row = await Booking.findByPk(bookingId);
    if (!row || row.confirmationEmailSentAt) {
      return;
    }
    if (!isConfirmedOrPaid(row)) {
      return;
    }

    const student = await User.findByPk(row.studentUserId, { attributes: ['email'] });
    if (!student?.email) {
      return;
    }

    const base = config.PANEL_DEFAULT_ORIGIN.replace(/\/+$/, '');
    const dashboardUrl = `${base}/dashboard/bookings`;

    const bookingData: BookingConfirmationData = {
      bookingId: row.id,
      dateIso: typeof row.dateIso === 'string' ? row.dateIso : String(row.dateIso).slice(0, 10),
      priceAmd: row.totalPriceAmd != null ? Number(row.totalPriceAmd) : null,
      dashboardUrl,
    };

    try {
      await sendBookingConfirmation(student.email, bookingData);
      await row.update({ confirmationEmailSentAt: new Date() });
    } catch (e) {
      LoggerUtil.error(
        `Booking confirmation email failed for #${bookingId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
