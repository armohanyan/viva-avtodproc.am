import { Booking, User } from '../models';
import { BookingNotificationPersistedType as Bnt } from '../constants/booking-notification-types';
import MailService from './mail.service';
import NotificationService from './notification.service';
import { todayIsoUtc } from '../utils/calendar-month.util';
import { shouldSendPaymentReminderToday } from '../utils/booking-payment-schedule.util';

function dateIsoString(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function bookingLessonTypeLabel(lessonType: Booking['lessonType']): string {
  return lessonType === 'theory'
    ? 'Group theory lesson'
    : lessonType === 'theory_personal'
      ? '1:1 theory lesson'
      : 'Practical lesson';
}

function isEffectivelyConfirmed(status: string): boolean {
  const s = String(status).toLowerCase();
  return s === 'confirmed' || s === 'completed';
}

/**
 * Centralized booking lifecycle in-app + student email rules (admin/student panels).
 * All booking status notifications for these events should go through this service.
 */
export default class BookingNotificationService {
  static async onBookingConfirmed(bookingId: number): Promise<void> {
    const row = await Booking.findByPk(bookingId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'accountType'] }],
    });
    if (!row) return;
    if (!isEffectivelyConfirmed(String(row.status))) return;
    const student = (row as unknown as { student?: User }).student;
    if (!student) return;

    const dateLine = `${dateIsoString(row.dateIso)} ${row.time}`.trim();

    await NotificationService.createOne({
      recipientUserId: student.id,
      recipientRole: student.accountType,
      type: Bnt.BOOKING_CONFIRMED,
      title: 'Booking confirmed',
      message: dateLine ? `Your booking has been confirmed. ${dateLine}` : 'Your booking has been confirmed.',
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-confirmed:${row.id}:student:${student.id}`,
    });

    await NotificationService.createForRoles(['admin', 'super_admin'], {
      type: Bnt.BOOKING_CONFIRMED,
      title: 'Booking confirmed',
      message: dateLine
        ? `Student booking has been confirmed. ${dateLine} · #${row.id}`
        : `Student booking has been confirmed. · #${row.id}`,
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-confirmed:${row.id}:staff`,
    });

    await BookingNotificationService.sendStudentConfirmedEmailIfNeeded(row, student);
  }

  private static async sendStudentConfirmedEmailIfNeeded(row: Booking, student: Pick<User, 'name' | 'email'>): Promise<void> {
    const email = student.email?.trim();
    if (!email) return;
    if (row.confirmationEmailSentAt) return;

    await MailService.sendBookingLifecycleUpdate(email, {
      bookingId: row.id,
      studentName: student.name,
      bookingType: bookingLessonTypeLabel(row.lessonType),
      dateIso: dateIsoString(row.dateIso),
      time: row.time,
      eventKey: 'confirmed',
      statusLabel: 'Confirmed',
      summary: 'Your booking has been confirmed. Open your student panel to see details.',
    });

    await row.update({ confirmationEmailSentAt: new Date() });
  }

  static async onBookingClosed(bookingId: number, outcome: 'cancelled' | 'refunded'): Promise<void> {
    const row = await Booking.findByPk(bookingId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'accountType'] }],
    });
    if (!row) return;
    const student = (row as unknown as { student?: User }).student;
    if (!student) return;

    const dateLine = `${dateIsoString(row.dateIso)} ${row.time}`.trim();

    const studentType = outcome === 'refunded' ? Bnt.BOOKING_REFUNDED : Bnt.BOOKING_CANCELLED;
    const studentTitle = outcome === 'refunded' ? 'Booking refunded' : 'Booking cancelled';
    const studentMessage = outcome === 'refunded' ? 'Your booking has been refunded.' : 'Your booking has been cancelled.';

    await NotificationService.createOne({
      recipientUserId: student.id,
      recipientRole: student.accountType,
      type: studentType,
      title: studentTitle,
      message: dateLine ? `${studentMessage} ${dateLine}` : studentMessage,
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-closed:${outcome}:${row.id}:student:${student.id}`,
    });

    await NotificationService.createForRoles(['admin', 'super_admin'], {
      type: Bnt.BOOKING_CANCELLED,
      title: 'Booking cancelled',
      message:
        outcome === 'refunded'
          ? dateLine
            ? `A booking has been cancelled with a refund. ${dateLine} · #${row.id}`
            : `A booking has been cancelled with a refund. · #${row.id}`
          : dateLine
            ? `A booking has been cancelled. ${dateLine} · #${row.id}`
            : `A booking has been cancelled. · #${row.id}`,
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-closed:${outcome}:${row.id}:staff`,
    });

    const email = student.email?.trim();
    if (!email) return;

    await MailService.sendBookingLifecycleUpdate(email, {
      bookingId: row.id,
      studentName: student.name,
      bookingType: bookingLessonTypeLabel(row.lessonType),
      dateIso: dateIsoString(row.dateIso),
      time: row.time,
      eventKey: outcome === 'refunded' ? 'refunded' : 'cancelled',
      statusLabel: outcome === 'refunded' ? 'Refunded' : 'Cancelled',
      summary:
        outcome === 'refunded'
          ? 'Your booking has been refunded. You can review the details in your student panel.'
          : 'Your booking has been cancelled. You can review the details in your student panel.',
    });
  }

  /** Admin in-app: finance “request refund” tied to a booking. */
  static async notifyAdminFinanceRefundRequestForBooking(financeTxId: number, bookingId: number): Promise<void> {
    await NotificationService.createForRoles(['admin', 'super_admin'], {
      type: Bnt.BOOKING_REFUND_INVITATION,
      title: 'Refund invitation',
      message: `A refund invitation/request was created for a booking (#${bookingId}, transaction #${financeTxId}).`,
      entityType: 'booking',
      entityId: String(bookingId),
      dedupeKey: `finance-refund-req:tx:${financeTxId}`,
    });
  }

  /** Admin in-app: student submitted cancellation in the refund window (staff action required). */
  static async notifyAdminStudentCancellationRefundRequest(bookingId: number): Promise<void> {
    await NotificationService.createForRoles(['admin', 'super_admin'], {
      type: Bnt.BOOKING_REFUND_INVITATION,
      title: 'Refund invitation',
      message: `A refund invitation/request was created for a booking (student cancellation request · #${bookingId}).`,
      entityType: 'booking',
      entityId: String(bookingId),
      dedupeKey: `booking-refund-invite:student-cancel-req:${bookingId}`,
    });
  }

  /**
   * Student: card payment will become mandatory when the lesson enters the 1-month window; sent once
   * (see `bookings.payment_reminder_sent_at`).
   */
  static async emitReservedPaymentReminderOnce(bookingId: number): Promise<boolean> {
    const row = await Booking.findByPk(bookingId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'accountType'] }],
    });
    if (!row) return false;
    if (row.paidAt != null || String(row.status) !== 'pending_payment' || row.paymentReminderSentAt) {
      return false;
    }
    if (!row.paymentRequiredAt) return false;
    const pr = String(row.paymentRequiredAt).slice(0, 10);
    if (!shouldSendPaymentReminderToday(todayIsoUtc(), pr, false)) return false;
    const student = (row as unknown as { student?: User }).student;
    if (!student) return false;
    const dateLine = `${dateIsoString(row.dateIso)} ${row.time}`.trim();

    const n = await NotificationService.createOne({
      recipientUserId: student.id,
      recipientRole: student.accountType,
      type: Bnt.BOOKING_PAYMENT_REMINDER,
      title: 'Payment coming due',
      message: dateLine
        ? `Payment for your reserved lesson will be required soon (deadline date ${pr}). ${dateLine}`
        : `Payment for your reserved lesson will be required soon (deadline date ${pr}).`,
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-payment-reminder:${row.id}`,
      metadata: { paymentRequiredAt: pr },
    });

    const email = student.email?.trim();
    if (email && n) {
      await MailService.sendBookingLifecycleUpdate(email, {
        bookingId: row.id,
        studentName: student.name,
        bookingType: bookingLessonTypeLabel(row.lessonType),
        dateIso: dateIsoString(row.dateIso),
        time: row.time,
        eventKey: 'payment_reminder',
        statusLabel: 'Payment required soon',
        summary: `Your reserved lesson is approaching the payment date. Please complete card payment in your student panel by ${pr} (Armenia / business calendar). After that date unpaid bookings are released.`,
      });
    }

    const fresh = await Booking.findByPk(bookingId);
    if (fresh && !fresh.paymentReminderSentAt) {
      await fresh.update({ paymentReminderSentAt: new Date() });
    }
    return true;
  }

  /** After auto-cancel for missed payment (booking row is `cancelled` with reason set). */
  static async onBookingAutoCancelledForMissedPayment(bookingId: number): Promise<void> {
    const row = await Booking.findByPk(bookingId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'accountType'] }],
    });
    if (!row) return;
    const student = (row as unknown as { student?: User }).student;
    if (!student) return;
    const dateLine = `${dateIsoString(row.dateIso)} ${row.time}`.trim();

    await NotificationService.createOne({
      recipientUserId: student.id,
      recipientRole: student.accountType,
      type: Bnt.BOOKING_AUTO_CANCELLED_PAYMENT,
      title: 'Booking cancelled — payment not received',
      message: dateLine
        ? `Your booking was cancelled because payment was not completed before the required date. ${dateLine}`
        : 'Your booking was cancelled because payment was not completed before the required date.',
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-auto-cancel-pay:${row.id}`,
    });

    const email = student.email?.trim();
    if (!email) return;

    await MailService.sendBookingLifecycleUpdate(email, {
      bookingId: row.id,
      studentName: student.name,
      bookingType: bookingLessonTypeLabel(row.lessonType),
      dateIso: dateIsoString(row.dateIso),
      time: row.time,
      eventKey: 'auto_cancelled_payment',
      statusLabel: 'Cancelled (payment missed)',
      summary:
        'Your booking was cancelled because payment was not completed before the required date. The slot has been released for other students.',
    });
  }
}
