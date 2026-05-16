import { Op } from 'sequelize';
import type { LessonCompletionStatus } from '../constants/lesson-completion';
import { BOOKING_STATUSES_COUNTED_FOR_PROGRESS } from '../constants/lesson-completion';
import {
  Booking,
  TheoryCohortEnrollment,
  TheoryCohortSession,
  User,
} from '../models';
import { normalizeBookingStatus } from './booking.service';
import StudentEntitlementsService from './student-entitlements.service';
import { bookingEndUtcMs, lessonEndUtcMs, lessonInstantUtcMs } from '../utils/lesson-datetime.util';

export type ProgressLessonSnapshot = {
  lessonType: 'practical' | 'theory_personal' | 'theory_group';
  dateIso: string;
  time: string;
  endTime: string | null;
  label: string;
};

export type StudentProgressDto = {
  studentUserId: number;
  lastCalculatedAt: string;
  overall: {
    totalLessons: number;
    completedLessons: number;
    remainingLessons: number;
    progressPercent: number;
    upcomingLessons: number;
  };
  practical: {
    total: number;
    completed: number;
    remaining: number;
    progressPercent: number;
    upcoming: number;
  };
  personalTheory: {
    total: number;
    completed: number;
    remaining: number;
    progressPercent: number;
    upcoming: number;
  };
  groupTheory: {
    total: number;
    completed: number;
    remaining: number;
    progressPercent: number;
    upcoming: number;
  };
  lastCompletedLesson: ProgressLessonSnapshot | null;
  nextUpcomingLesson: ProgressLessonSnapshot | null;
};

function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 1000) / 10);
}

function isBookingActiveForProgress(row: Booking): boolean {
  const st = normalizeBookingStatus(String(row.status ?? ''));
  if (!BOOKING_STATUSES_COUNTED_FOR_PROGRESS.has(st)) return false;
  if (st === 'pending_payment') {
    const paid = row.paidAt != null || row.paymentStatus === 'paid';
    if (!paid) return false;
  }
  return true;
}

function bookingCountsAsCompleted(row: Booking, now: Date): boolean {
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed') return true;
  if (cs === 'missed' || cs === 'cancelled' || cs === 'refunded' || cs === 'cancelled_no_refund') {
    return false;
  }
  if (row.lessonPassedSuccessfully === false) return false;
  return (
    isBookingActiveForProgress(row) &&
    bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime) <= now.getTime()
  );
}

function bookingCountsAsUpcoming(row: Booking, now: Date): boolean {
  if (!isBookingActiveForProgress(row)) return false;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed' || cs === 'missed') return false;
  return bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime) > now.getTime();
}

function sessionCountsAsCompleted(session: TheoryCohortSession, now: Date): boolean {
  if (session.status === 'cancelled') return false;
  if (session.status === 'completed') return true;
  return lessonEndUtcMs(String(session.dateIso), String(session.endTime)) <= now.getTime();
}

function sessionCountsAsUpcoming(session: TheoryCohortSession, now: Date): boolean {
  if (session.status === 'cancelled' || session.status === 'completed') return false;
  return lessonEndUtcMs(String(session.dateIso), String(session.endTime)) > now.getTime();
}

function snapshotFromBooking(row: Booking): ProgressLessonSnapshot {
  const end = row.endTime ? String(row.endTime).slice(0, 5) : null;
  const type =
    row.lessonType === 'theory_personal'
      ? ('theory_personal' as const)
      : ('practical' as const);
  return {
    lessonType: type,
    dateIso: String(row.dateIso).slice(0, 10),
    time: String(row.time).slice(0, 5),
    endTime: end,
    label: type === 'practical' ? 'Practical lesson' : 'Personal theory lesson',
  };
}

function snapshotFromSession(session: TheoryCohortSession, cohortName?: string): ProgressLessonSnapshot {
  return {
    lessonType: 'theory_group',
    dateIso: String(session.dateIso).slice(0, 10),
    time: String(session.startTime).slice(0, 5),
    endTime: String(session.endTime).slice(0, 5),
    label: cohortName ? `Group theory · ${cohortName}` : 'Group theory lesson',
  };
}

export default class StudentProgressService {
  static async getForStudent(studentUserId: number): Promise<StudentProgressDto | null> {
    const user = await User.findByPk(studentUserId, { attributes: ['id', 'accountType'] });
    if (!user || user.accountType !== 'student') return null;

    const now = new Date();
    const entitlements = await StudentEntitlementsService.get(studentUserId);

    const practicalBookings = await Booking.findAll({
      where: {
        studentUserId,
        lessonType: 'practical',
        status: { [Op.notIn]: ['cancelled', 'refunded'] },
      },
    });

    const personalTheoryBookings = await Booking.findAll({
      where: {
        studentUserId,
        lessonType: 'theory_personal',
        status: { [Op.notIn]: ['cancelled', 'refunded'] },
      },
    });

    const activePractical = practicalBookings.filter(isBookingActiveForProgress);
    const activePersonal = personalTheoryBookings.filter(isBookingActiveForProgress);

    let entitlementPracticalTotal = 0;
    let entitlementPersonalTheoryTotal = 0;
    if (entitlements) {
      for (const p of entitlements.packages) {
        entitlementPracticalTotal += Number(p.practicalTotal ?? 0);
        entitlementPersonalTheoryTotal += Number(p.personalTheoryTotal ?? p.theoryTotal ?? 0);
      }
      for (const e of entitlements.extras) {
        entitlementPracticalTotal += Number(e.practicalTotal ?? 0);
      }
    }

    const practicalTotal = Math.max(entitlementPracticalTotal, activePractical.length);
    const personalTheoryTotal = Math.max(entitlementPersonalTheoryTotal, activePersonal.length);

    const practicalCompleted = activePractical.filter((b) => bookingCountsAsCompleted(b, now)).length;
    const personalCompleted = activePersonal.filter((b) => bookingCountsAsCompleted(b, now)).length;

    const practicalUpcoming = activePractical.filter((b) => bookingCountsAsUpcoming(b, now)).length;
    const personalUpcoming = activePersonal.filter((b) => bookingCountsAsUpcoming(b, now)).length;

    const enrollments = await TheoryCohortEnrollment.findAll({
      where: { studentUserId },
      attributes: ['cohortId'],
    });
    const cohortIds = [...new Set(enrollments.map((e) => e.cohortId))];

    let groupTotal = 0;
    let groupCompleted = 0;
    let groupUpcoming = 0;
    const groupSessionSnapshots: Array<{ session: TheoryCohortSession; endMs: number; completed: boolean }> = [];

    if (cohortIds.length > 0) {
      const sessions = await TheoryCohortSession.findAll({
        where: {
          cohortId: { [Op.in]: cohortIds },
          status: { [Op.ne]: 'cancelled' },
        },
        order: [
          ['dateIso', 'ASC'],
          ['startTime', 'ASC'],
        ],
      });

      for (const session of sessions) {
        groupTotal += 1;
        const completed = sessionCountsAsCompleted(session, now);
        if (completed) groupCompleted += 1;
        if (sessionCountsAsUpcoming(session, now)) groupUpcoming += 1;
        groupSessionSnapshots.push({
          session,
          endMs: lessonEndUtcMs(String(session.dateIso), String(session.endTime)),
          completed,
        });
      }
    }

    const practicalRemaining = Math.max(0, practicalTotal - practicalCompleted);
    const personalRemaining = Math.max(0, personalTheoryTotal - personalCompleted);
    const groupRemaining = Math.max(0, groupTotal - groupCompleted);

    const totalLessons = practicalTotal + personalTheoryTotal + groupTotal;
    const completedLessons = practicalCompleted + personalCompleted + groupCompleted;
    const remainingLessons = practicalRemaining + personalRemaining + groupRemaining;
    const upcomingLessons = practicalUpcoming + personalUpcoming + groupUpcoming;

    const timeline: Array<{ endMs: number; completed: boolean; snapshot: ProgressLessonSnapshot }> = [];

    for (const b of [...activePractical, ...activePersonal]) {
      const endMs = bookingEndUtcMs(String(b.dateIso), String(b.time), b.endTime);
      timeline.push({
        endMs,
        completed: bookingCountsAsCompleted(b, now),
        snapshot: snapshotFromBooking(b),
      });
    }

    for (const item of groupSessionSnapshots) {
      timeline.push({
        endMs: item.endMs,
        completed: item.completed,
        snapshot: snapshotFromSession(item.session),
      });
    }

    const completedSorted = timeline
      .filter((t) => t.completed && Number.isFinite(t.endMs))
      .sort((a, b) => b.endMs - a.endMs);
    const upcomingSorted = timeline
      .filter((t) => !t.completed && Number.isFinite(t.endMs) && t.endMs > now.getTime())
      .sort((a, b) => a.endMs - b.endMs);

    return {
      studentUserId,
      lastCalculatedAt: now.toISOString(),
      overall: {
        totalLessons,
        completedLessons,
        remainingLessons,
        progressPercent: progressPercent(completedLessons, totalLessons),
        upcomingLessons,
      },
      practical: {
        total: practicalTotal,
        completed: practicalCompleted,
        remaining: practicalRemaining,
        progressPercent: progressPercent(practicalCompleted, practicalTotal),
        upcoming: practicalUpcoming,
      },
      personalTheory: {
        total: personalTheoryTotal,
        completed: personalCompleted,
        remaining: personalRemaining,
        progressPercent: progressPercent(personalCompleted, personalTheoryTotal),
        upcoming: personalUpcoming,
      },
      groupTheory: {
        total: groupTotal,
        completed: groupCompleted,
        remaining: groupRemaining,
        progressPercent: progressPercent(groupCompleted, groupTotal),
        upcoming: groupUpcoming,
      },
      lastCompletedLesson: completedSorted[0]?.snapshot ?? null,
      nextUpcomingLesson: upcomingSorted[0]?.snapshot ?? null,
    };
  }
}
