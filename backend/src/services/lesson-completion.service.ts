import { Op } from 'sequelize';
import { BOOKING_STATUSES_COUNTED_FOR_PROGRESS, type LessonCompletionStatus } from '../constants/lesson-completion';
import { Booking, TheoryCohortSession } from '../models';
import { normalizeBookingStatus } from './booking.service';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import { bookingEndUtcMs, isBookingEndInPast, isLessonEndInPast, lessonEndUtcMs } from '../utils/lesson-datetime.util';
import LoggerUtil from '../utils/logger.util';

const BOOKING_LESSON_TYPES = ['practical', 'theory_personal'] as const;

function completionStatusFromBookingRow(row: Booking, now: Date): LessonCompletionStatus | null {
  const bookingStatus = normalizeBookingStatus(String(row.status ?? ''));
  if (bookingStatus === 'cancelled') {
    return row.paymentStatus === 'paid' ? 'cancelled_no_refund' : 'cancelled';
  }
  if (bookingStatus === 'refunded') {
    return 'refunded';
  }
  if (!BOOKING_STATUSES_COUNTED_FOR_PROGRESS.has(bookingStatus)) {
    return null;
  }
  if (row.lessonPassedSuccessfully === false) {
    return 'missed';
  }
  const endMs = bookingEndUtcMs(
    String(row.dateIso),
    String(row.time),
    row.endTime ? String(row.endTime) : null,
  );
  if (Number.isFinite(endMs) && endMs <= now.getTime()) {
    return 'completed';
  }
  return 'scheduled';
}

function mapBookingStatusToCompletionOnCancel(nextBookingStatus: string): LessonCompletionStatus {
  if (nextBookingStatus === 'refunded') return 'refunded';
  return 'cancelled';
}

export default class LessonCompletionService {
  /**
   * Idempotent: marks past practical / personal-theory lessons and group sessions as completed (or missed).
   */
  static async markDueLessonsCompleted(now = new Date()): Promise<{
    bookingsMarkedCompleted: number;
    bookingsMarkedMissed: number;
    bookingsCompletionSynced: number;
    cohortSessionsMarkedCompleted: number;
  }> {
    const today = yerevanTodayIso(now);
    const candidates = await Booking.findAll({
      where: {
        lessonType: { [Op.in]: [...BOOKING_LESSON_TYPES] },
        status: { [Op.in]: ['confirmed', 'pending_payment', 'completed', 'pending', 'pending_prebook'] },
        dateIso: { [Op.lte]: today },
      },
      attributes: [
        'id',
        'dateIso',
        'time',
        'endTime',
        'status',
        'paymentStatus',
        'lessonType',
        'lessonPassedSuccessfully',
        'lessonCompletionStatus',
        'lessonCompletedAt',
      ],
    });

    let bookingsMarkedCompleted = 0;
    let bookingsMarkedMissed = 0;
    let bookingsCompletionSynced = 0;

    for (const row of candidates) {
      const target = completionStatusFromBookingRow(row, now);
      if (target == null) continue;

      const current = (row.lessonCompletionStatus ?? 'scheduled') as LessonCompletionStatus;
      if (current === target) continue;

      if (target !== 'completed' && target !== 'missed') continue;
      if (target === 'completed' && !isBookingEndInPast(String(row.dateIso), String(row.time), row.endTime, now)) {
        continue;
      }

      const patch: Partial<Booking> = {
        lessonCompletionStatus: target,
        lessonCompletedAt: target === 'completed' || target === 'missed' ? row.lessonCompletedAt ?? now : null,
      };

      await row.update(patch);
      bookingsCompletionSynced += 1;
      if (target === 'completed') bookingsMarkedCompleted += 1;
      if (target === 'missed') bookingsMarkedMissed += 1;
    }

    const sessionCandidates = await TheoryCohortSession.findAll({
      where: {
        status: { [Op.in]: ['scheduled', 'completed'] },
        dateIso: { [Op.lte]: today },
      },
      attributes: ['id', 'dateIso', 'endTime', 'status'],
    });

    let cohortSessionsMarkedCompleted = 0;
    for (const session of sessionCandidates) {
      if (session.status === 'completed') continue;
      if (session.status === 'cancelled') continue;
      if (!isLessonEndInPast(String(session.dateIso), String(session.endTime), now)) continue;

      await session.update({ status: 'completed' });
      cohortSessionsMarkedCompleted += 1;
    }

    if (
      bookingsCompletionSynced > 0 ||
      cohortSessionsMarkedCompleted > 0
    ) {
      LoggerUtil.info(
        `Lesson completion cron: bookings completed=${bookingsMarkedCompleted} missed=${bookingsMarkedMissed}; cohort sessions=${cohortSessionsMarkedCompleted}`,
      );
    }

    return {
      bookingsMarkedCompleted,
      bookingsMarkedMissed,
      bookingsCompletionSynced,
      cohortSessionsMarkedCompleted,
    };
  }

  /** Apply terminal completion status when a booking is cancelled/refunded. */
  static completionStatusForClosedBooking(bookingStatus: string): LessonCompletionStatus {
    return mapBookingStatusToCompletionOnCancel(normalizeBookingStatus(bookingStatus));
  }

  static async syncBookingCompletionStatus(bookingId: number, now = new Date()): Promise<void> {
    const row = await Booking.findByPk(bookingId);
    if (!row || !BOOKING_LESSON_TYPES.includes(row.lessonType as (typeof BOOKING_LESSON_TYPES)[number])) {
      return;
    }
    const target = completionStatusFromBookingRow(row, now);
    if (target == null) {
      await row.update({ lessonCompletionStatus: null, lessonCompletedAt: null });
      return;
    }
    if (row.lessonCompletionStatus === target) return;
    await row.update({
      lessonCompletionStatus: target,
      lessonCompletedAt:
        target === 'completed' || target === 'missed' ? row.lessonCompletedAt ?? now : null,
    });
  }

  static defaultCompletionStatusForNewBooking(): LessonCompletionStatus {
    return 'scheduled';
  }
}
