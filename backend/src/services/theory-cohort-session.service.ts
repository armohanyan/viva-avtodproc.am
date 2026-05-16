import { Op, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { TheoryCohort, TheoryCohortEnrollment, TheoryCohortSession, User } from '../models';
import {
  generateCohortSessions,
  parseLessonWeekdays,
  serializeLessonWeekdays,
  type GeneratedCohortSession,
} from '../utils/theory-cohort-session-generator.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ConflictError, InputValidationError } = ErrorsUtil;

export type TheoryCohortSessionDto = {
  id: number;
  cohortId: number;
  branchId: number;
  instructorUserId: number | null;
  dateIso: string;
  startTime: string;
  endTime: string;
  lessonIndex: number;
  status: string;
};

function dateIso(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function toSessionDto(s: TheoryCohortSession): TheoryCohortSessionDto {
  return {
    id: s.id,
    cohortId: s.cohortId,
    branchId: s.branchId,
    instructorUserId: s.instructorUserId ?? null,
    dateIso: dateIso(s.dateIso),
    startTime: String(s.startTime).slice(0, 5),
    endTime: String(s.endTime).slice(0, 5),
    lessonIndex: s.lessonIndex,
    status: s.status,
  };
}

const YEREVAN_TZ = 'Asia/Yerevan';

function yerevanTodayIso(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

function isPastSession(dateIso: string, startTime: string, today = yerevanTodayIso()): boolean {
  const d = dateIso.slice(0, 10);
  if (d < today) return true;
  if (d > today) return false;
  const m = /^(\d{1,2}):(\d{2})/.exec(startTime);
  if (!m) return false;
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: YEREVAN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(nowParts.find((p) => p.type === 'hour')?.value ?? 0);
  const min = Number(nowParts.find((p) => p.type === 'minute')?.value ?? 0);
  const nowMin = h * 60 + min;
  const startMin = Number(m[1]) * 60 + Number(m[2]);
  return startMin < nowMin;
}

async function resolveInstructorUserId(
  instructorName: string,
  branchId: number,
  explicitId?: number | null,
): Promise<number | null> {
  if (explicitId != null && Number.isFinite(explicitId) && explicitId > 0) {
    const u = await User.findOne({
      where: { id: explicitId, accountType: 'instructor' },
      attributes: ['id'],
    });
    if (u) return u.id;
  }
  const name = instructorName.trim().toLowerCase();
  if (!name) return null;
  const instructors = await User.findAll({
    where: { accountType: 'instructor' },
    attributes: ['id', 'name'],
  });
  const match = instructors.find((i) => i.name?.trim().toLowerCase() === name);
  return match?.id ?? null;
}

export default class TheoryCohortSessionService {
  static previewGeneration(cohort: {
    startDateIso: string;
    endDateIso: string;
    lessonWeekdays: unknown;
    sessionStartTime: string | null;
    sessionEndTime: string | null;
    totalLessons: number;
  }): GeneratedCohortSession[] {
    if (!cohort.sessionStartTime?.trim() || !cohort.sessionEndTime?.trim()) return [];
    return generateCohortSessions({
      startDateIso: cohort.startDateIso,
      endDateIso: cohort.endDateIso,
      lessonWeekdays: parseLessonWeekdays(cohort.lessonWeekdays),
      sessionStartTime: cohort.sessionStartTime,
      sessionEndTime: cohort.sessionEndTime,
      totalLessons: cohort.totalLessons,
    });
  }

  static async listByCohort(cohortId: number): Promise<TheoryCohortSessionDto[]> {
    const rows = await TheoryCohortSession.findAll({
      where: { cohortId },
      order: [
        ['lessonIndex', 'ASC'],
        ['dateIso', 'ASC'],
      ],
    });
    return rows.map(toSessionDto);
  }

  static async listByDateRange(opts: {
    startDate: string;
    endDate: string;
    branchId?: number;
    instructorUserId?: number;
    cohortId?: number;
    status?: string;
  }): Promise<TheoryCohortSessionDto[]> {
    const where: Record<string, unknown> = {
      dateIso: { [Op.between]: [opts.startDate, opts.endDate] },
    };
    if (opts.branchId != null && opts.branchId > 0) where.branchId = opts.branchId;
    if (opts.instructorUserId != null && opts.instructorUserId > 0) {
      where.instructorUserId = opts.instructorUserId;
    }
    if (opts.cohortId != null && opts.cohortId > 0) where.cohortId = opts.cohortId;
    if (opts.status?.trim()) where.status = opts.status.trim();

    const rows = await TheoryCohortSession.findAll({
      where,
      order: [
        ['dateIso', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });
    return rows.map(toSessionDto);
  }

  /** List sessions for cohorts the student is enrolled in. */
  static async listForEnrolledStudent(
    studentUserId: number,
    startDate: string,
    endDate: string,
  ): Promise<TheoryCohortSessionDto[]> {
    const enrollments = await TheoryCohortEnrollment.findAll({
      where: { studentUserId },
      attributes: ['cohortId'],
    });
    const cohortIds = [...new Set(enrollments.map((e) => e.cohortId).filter((id) => id > 0))];
    if (cohortIds.length === 0) return [];

    const rows = await TheoryCohortSession.findAll({
      where: {
        cohortId: { [Op.in]: cohortIds },
        dateIso: { [Op.between]: [startDate, endDate] },
      },
      order: [
        ['dateIso', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });
    return rows.map(toSessionDto);
  }

  static async syncSessionsForCohort(
    cohort: TheoryCohort,
    t: Transaction,
    opts?: { forceRegenerateFuture?: boolean },
  ): Promise<number> {
    const weekdays = parseLessonWeekdays(cohort.lessonWeekdays);
    const totalLessons = Math.max(0, Math.floor(Number(cohort.totalLessons) || 0));
    if (
      weekdays.length === 0 ||
      totalLessons < 1 ||
      !cohort.sessionStartTime?.trim() ||
      !cohort.sessionEndTime?.trim()
    ) {
      return 0;
    }

    const planned = generateCohortSessions({
      startDateIso: dateIso(cohort.startDateIso),
      endDateIso: dateIso(cohort.endDateIso),
      lessonWeekdays: weekdays,
      sessionStartTime: cohort.sessionStartTime,
      sessionEndTime: cohort.sessionEndTime,
      totalLessons,
    });
    if (planned.length === 0) return 0;

    const instructorUserId = await resolveInstructorUserId(
      cohort.instructorName,
      cohort.branchId,
      cohort.instructorUserId,
    );

    const existing = await TheoryCohortSession.findAll({
      where: { cohortId: cohort.id },
      transaction: t,
    });
    const existingByKey = new Map(
      existing.map((s) => [`${dateIso(s.dateIso)}:${String(s.startTime).slice(0, 5)}`, s]),
    );

    const enrollmentCount = await TheoryCohortEnrollment.count({
      where: { cohortId: cohort.id },
      transaction: t,
    });
    const hasEnrollments = enrollmentCount > 0;
    const today = yerevanTodayIso();

    let created = 0;
    for (const p of planned) {
      const key = `${p.dateIso}:${p.startTime}`;
      const prev = existingByKey.get(key);
      if (prev) {
        const past = isPastSession(p.dateIso, p.startTime, today);
        const completed = prev.status === 'completed' || prev.status === 'cancelled';
        if (past || completed) continue;
        await prev.update(
          {
            branchId: cohort.branchId,
            instructorUserId,
            endTime: p.endTime,
            lessonIndex: p.lessonIndex,
          },
          { transaction: t },
        );
        continue;
      }

      const past = isPastSession(p.dateIso, p.startTime, today);
      if (past && hasEnrollments && !opts?.forceRegenerateFuture) continue;

      await TheoryCohortSession.create(
        {
          cohortId: cohort.id,
          branchId: cohort.branchId,
          instructorUserId,
          dateIso: p.dateIso,
          startTime: p.startTime,
          endTime: p.endTime,
          lessonIndex: p.lessonIndex,
          status: 'scheduled',
        },
        { transaction: t },
      );
      created += 1;
    }

    const plannedKeys = new Set(planned.map((p) => `${p.dateIso}:${p.startTime}`));
    for (const s of existing) {
      const key = `${dateIso(s.dateIso)}:${String(s.startTime).slice(0, 5)}`;
      if (plannedKeys.has(key)) continue;
      const past = isPastSession(dateIso(s.dateIso), String(s.startTime), today);
      const completed = s.status === 'completed' || s.status === 'cancelled';
      if (past || completed) continue;
      if (hasEnrollments) {
        throw new ConflictError(
          'Cannot remove future sessions while students are enrolled. Adjust schedule carefully.',
          HttpStatusCodesUtil.CONFLICT,
        );
      }
      await s.destroy({ transaction: t });
    }

    return created;
  }

  static async regenerateAllForCohortId(cohortId: number): Promise<number> {
    return sequelize.transaction(async (t) => {
      const cohort = await TheoryCohort.findByPk(cohortId, { transaction: t });
      if (!cohort) {
        throw new InputValidationError('Cohort not found', HttpStatusCodesUtil.NOT_FOUND);
      }
      return this.syncSessionsForCohort(cohort, t, { forceRegenerateFuture: false });
    });
  }

  static async removeAllForCohort(cohortId: number, t: Transaction): Promise<void> {
    await TheoryCohortSession.destroy({ where: { cohortId }, transaction: t });
  }

  static serializeWeekdaysForStorage(weekdays: number[]): string {
    return serializeLessonWeekdays(weekdays);
  }

  static parseWeekdaysFromStorage(raw: unknown): number[] {
    return parseLessonWeekdays(raw);
  }
}
