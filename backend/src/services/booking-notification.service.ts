import { Booking, User } from '../models';
import { BookingNotificationPersistedType as Bnt } from '../constants/booking-notification-types';
import {
  bookingNeedsDebtPaymentReminder,
  resolveDebtPaymentReminderDueAt,
} from '../utils/booking-payment-reminder.util';
import { resolveBookingPayment } from '../utils/booking-admin-payment.util';
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

function bookingLessonTypeLabelHy(lessonType: Booking['lessonType']): string {
  return lessonType === 'theory'
    ? 'Խմբային տեսական դաս'
    : lessonType === 'theory_personal'
      ? 'Անհատական տեսական դաս'
      : 'Պրակտիկ դաս';
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
      title: 'Վճարման հիշեցում',
      message: dateLine
        ? `Ձեր պահված դասի համար վճարումը շուտով պարտադիր կլինի (վերջնաժամկետ՝ ${pr})։ ${dateLine}`
        : `Ձեր պահված դասի համար վճարումը շուտով պարտադիր կլինի (վերջնաժամկետ՝ ${pr})։`,
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
        bookingType: bookingLessonTypeLabelHy(row.lessonType),
        dateIso: dateIsoString(row.dateIso),
        time: row.time,
        eventKey: 'payment_reminder',
        statusLabel: 'Շուտով պարտադիր է վճարում',
        summary: `Ձեր պահված դասը մոտենում է վճարման ամսաթվին։ Խնդրում ենք ավարտել քարտային վճարումը ուսանողական հարթակում մինչև ${pr} (Հայաստանի գործարքային օրացույց)։ Այդ ամսաթվից հետո չվճարված ամրագրումները ազատվում են։`,
      });
    }

    const fresh = await Booking.findByPk(bookingId);
    if (fresh && !fresh.paymentReminderSentAt) {
      await fresh.update({ paymentReminderSentAt: new Date() });
    }
    return true;
  }

  /**
   * Admin-recorded debt reminder (unpaid / partial): notifies student and staff once when due.
   * Uses `payment_reminder_at` or automatic offset after lesson; deduped via `payment_reminder_sent_at`.
   */
  static async emitAdminDebtPaymentReminderOnce(bookingId: number, now = new Date()): Promise<boolean> {
    const row = await Booking.findByPk(bookingId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'accountType'] }],
    });
    if (!row) return false;
    if (row.paymentReminderSentAt) return false;
    if (!bookingNeedsDebtPaymentReminder(row)) return false;

    const dueAt = resolveDebtPaymentReminderDueAt(row);
    if (!dueAt || dueAt.getTime() > now.getTime()) return false;

    const student = (row as unknown as { student?: User }).student;
    if (!student) return false;

    const resolved = resolveBookingPayment(row);
    const remaining = resolved.remainingAmd;
    const lessonDate = dateIsoString(row.dateIso);
    const typeLabel = bookingLessonTypeLabel(row.lessonType);
    const statusHy =
      resolved.paymentStatus === 'partial' ? 'մասնակի վճարված' : 'չվճարված';

    const studentMessage = `Հիշեցում․ Դուք ունեք ${statusHy} դաս։ Խնդրում ենք կատարել վճարումը։ Մնացորդ՝ ${remaining} AMD`;
    const adminMessage = `Վճարման հիշեցում․ ${student.name}-ը ունի չվճարված/մասնակի վճարված ամրագրում (${typeLabel}${lessonDate ? ` · ${lessonDate}` : ''})։ Մնացորդ՝ ${remaining} AMD`;

    await NotificationService.createOne({
      recipientUserId: student.id,
      recipientRole: student.accountType,
      type: Bnt.BOOKING_PAYMENT_REMINDER,
      title: 'Վճարման հիշեցում',
      message: studentMessage,
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-debt-payment-reminder:student:${row.id}`,
      metadata: { remainingAmd: remaining, paymentStatus: resolved.paymentStatus },
    });

    await NotificationService.createForRoles(['admin', 'super_admin'], {
      type: Bnt.BOOKING_PAYMENT_REMINDER,
      title: 'Վճարման հիշեցում',
      message: adminMessage,
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-debt-payment-reminder:staff:${row.id}`,
      metadata: { studentUserId: student.id, remainingAmd: remaining },
    });

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
      title: 'Ամրագրումը չեղարկվել է — վճարում չկատարվեց',
      message: dateLine
        ? `Ձեր ամրագրումը չեղարկվել է, քանի որ վճարումը չի ավարտվել պահանջվող ամսաթվից առաջ։ ${dateLine}`
        : 'Ձեր ամրագրումը չեղարկվել է, քանի որ վճարումը չի ավարտվել պահանջվող ամսաթվից առաջ։',
      entityType: 'booking',
      entityId: String(row.id),
      dedupeKey: `booking-auto-cancel-pay:${row.id}`,
    });

    const email = student.email?.trim();
    if (!email) return;

    await MailService.sendBookingLifecycleUpdate(email, {
      bookingId: row.id,
      studentName: student.name,
      bookingType: bookingLessonTypeLabelHy(row.lessonType),
      dateIso: dateIsoString(row.dateIso),
      time: row.time,
      eventKey: 'auto_cancelled_payment',
      statusLabel: 'Չեղարկված (վճարում չկատարվեց)',
      summary:
        'Ձեր ամրագրումը չեղարկվել է, քանի որ վճարումը չի ավարտվել պահանջվող ամսաթվից առաջ։ Սլոթը ազատվել է այլ ուսանողների համար։',
    });
  }
}
