import config from '../config';
import { Booking, BookingSlot, TheoryCohort, User } from '../models';
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

    const [student, instructor, slotRows] = await Promise.all([
      User.findByPk(row.studentUserId, { attributes: ['name', 'email'] }),
      User.findByPk(row.instructorUserId, { attributes: ['name'] }),
      BookingSlot.findAll({
        where: { bookingId: row.id },
        order: [
          ['dateIso', 'ASC'],
          ['slotTime', 'ASC'],
        ],
      }),
    ]);
    if (!student?.email) {
      return;
    }

    const base = config.PANEL_DEFAULT_ORIGIN.replace(/\/+$/, '');
    const dashboardUrl = `${base}/dashboard/bookings`;

    let theoryGroupName: string | null = null;
    if (row.lessonType === 'theory') {
      const cohortId = Number((row.prepaidMeta as Record<string, unknown> | null)?.theoryCohortId);
      if (Number.isFinite(cohortId) && cohortId > 0) {
        const cohort = await TheoryCohort.findByPk(cohortId, { attributes: ['name'] });
        theoryGroupName = cohort?.name ?? null;
      }
    }

    const bookingData: BookingConfirmationData = {
      bookingId: row.id,
      studentName: student.name,
      bookingType:
        row.lessonType === 'theory'
          ? 'Group theory lesson'
          : row.lessonType === 'theory_personal'
            ? '1:1 theory lesson'
            : 'Practical lesson',
      instructorName: instructor?.name ?? null,
      slots: slotRows.map((s) => `${typeof s.dateIso === 'string' ? s.dateIso : String(s.dateIso).slice(0, 10)} ${s.slotTime}`),
      packageName: null,
      theoryGroupName,
      dateIso: typeof row.dateIso === 'string' ? row.dateIso : String(row.dateIso).slice(0, 10),
      priceAmd: row.totalPriceAmd != null ? Number(row.totalPriceAmd) : null,
      paymentStatus: row.paidAt ? 'Paid by card' : 'Pending card payment',
      bookingStatus: row.status,
      supportEmail: config.MAIL.SENDER_EMAIL || 'support@viva.am',
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
