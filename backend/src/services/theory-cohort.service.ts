import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Op } from 'sequelize';
import { InstructorBranch, TheoryCohort, TheoryCohortEnrollment, TheoryCohortSession, User } from '../models';
import InstructorBranchService from './instructor-branch.service';
import TheoryCohortInstructorService from './theory-cohort-instructor.service';
import TheoryCohortSessionService from './theory-cohort-session.service';
import {
  generateCohortSessions,
  validateCohortSessionGenerationInput,
} from '../utils/theory-cohort-session-generator.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, ConflictError, InputValidationError } = ErrorsUtil;

export type TheoryCohortDto = {
  id: number;
  name: string;
  startDateIso: string;
  endDateIso: string;
  seats: number;
  enrolled: number;
  instructorName: string;
  meetLink: string;
  status: string;
  branchId: number;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
  /** Whole-group price (AMD); omitted or null means “use instructor hourly × hours” at booking time. */
  priceAmd: number | null;
  lessonWeekdays: number[];
  totalLessons: number;
  instructorUserId: number | null;
  instructorUserIds: number[];
  generatedSessionCount: number;
};

export type TheoryCohortEnrollmentStudentDto = {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  phone2: string | null;
  isActive: boolean;
};

function dateIso(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeHmOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  return HM.test(s) ? s : null;
}

async function enrolledCount(cohortId: number): Promise<number> {
  return TheoryCohortEnrollment.count({ where: { cohortId } });
}

function priceAmdOrNull(c: TheoryCohort): number | null {
  const v = c.getDataValue('priceAmd') as number | null | undefined;
  if (v == null || !Number.isFinite(Number(v)) || Number(v) < 0) return null;
  return Math.round(Number(v));
}

async function sessionCountForCohort(cohortId: number): Promise<number> {
  return TheoryCohortSession.count({ where: { cohortId } });
}

function legacyInstructorUserIds(c: TheoryCohort): number[] {
  if (c.instructorUserId != null && Number.isFinite(Number(c.instructorUserId)) && Number(c.instructorUserId) > 0) {
    return [Math.round(Number(c.instructorUserId))];
  }
  return [];
}

function toDto(
  c: TheoryCohort,
  enrolled: number,
  generatedSessionCount = 0,
  instructorUserIds: number[] = [],
): TheoryCohortDto {
  const ids =
    instructorUserIds.length > 0 ? instructorUserIds : legacyInstructorUserIds(c);
  const primaryId = ids[0] ?? null;
  return {
    id: c.id,
    name: c.name,
    startDateIso: dateIso(c.startDateIso),
    endDateIso: dateIso(c.endDateIso),
    seats: c.seats,
    enrolled,
    instructorName: c.instructorName,
    meetLink: c.meetLink,
    status: c.status,
    branchId: c.branchId,
    sessionStartTime: timeHmOrNull(c.sessionStartTime),
    sessionEndTime: timeHmOrNull(c.sessionEndTime),
    priceAmd: priceAmdOrNull(c),
    lessonWeekdays: TheoryCohortSessionService.parseWeekdaysFromStorage(c.lessonWeekdays),
    totalLessons: Math.max(0, Math.floor(Number(c.totalLessons) || 0)),
    instructorUserId: primaryId,
    instructorUserIds: ids,
    generatedSessionCount,
  };
}

async function resolveInstructorUserIdsFromInput(input: {
  instructorUserIds?: readonly number[] | null;
  instructorUserId?: number | null;
  instructorName?: string;
  branchId: number;
}): Promise<number[]> {
  const fromList = (input.instructorUserIds ?? [])
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n) && n > 0);
  const uniq = [...new Set(fromList)];
  if (uniq.length > 0) return uniq;
  if (
    input.instructorUserId != null &&
    Number.isFinite(Number(input.instructorUserId)) &&
    Number(input.instructorUserId) > 0
  ) {
    return [Math.round(Number(input.instructorUserId))];
  }
  const name = input.instructorName?.trim();
  if (!name) return [];
  const firstName = name.split(',')[0]?.trim() ?? name;
  const links = await InstructorBranch.findAll({ where: { branchId: input.branchId } });
  const branchInstructorIds = links.map((l) => l.instructorUserId);
  const instructor = await User.findOne({
    where: {
      name: firstName,
      accountType: 'instructor',
      ...(branchInstructorIds.length > 0 ? { id: { [Op.in]: branchInstructorIds } } : {}),
    },
    attributes: ['id'],
  });
  return instructor ? [instructor.id] : [];
}

function validateScheduleFields(input: {
  startDateIso: string;
  endDateIso: string;
  lessonWeekdays?: number[];
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  totalLessons?: number;
}): void {
  const weekdays = input.lessonWeekdays ?? [];
  const total = Math.floor(Number(input.totalLessons) || 0);
  const startT = timeHmOrNull(input.sessionStartTime);
  const endT = timeHmOrNull(input.sessionEndTime);
  if (total > 0 && weekdays.length > 0 && startT && endT) {
    const err = validateCohortSessionGenerationInput({
      startDateIso: input.startDateIso,
      endDateIso: input.endDateIso,
      lessonWeekdays: weekdays,
      sessionStartTime: startT,
      sessionEndTime: endT,
      totalLessons: total,
    });
    if (err) {
      throw new InputValidationError(err, HttpStatusCodesUtil.BAD_REQUEST);
    }
  }
}

async function assertCohortInstructorServesBranch(
  instructorUserId: number | null,
  branchId: number,
): Promise<void> {
  if (instructorUserId == null) return;
  await InstructorBranchService.assertInstructorServesBranch(instructorUserId, branchId);
}

export default class TheoryCohortService {
  static async list(branchId?: number): Promise<TheoryCohortDto[]> {
    const cohorts = await TheoryCohort.findAll({
      ...(branchId !== undefined ? { where: { branchId } } : {}),
      order: [['startDateIso', 'DESC']],
    });
    const instructorIdsByCohort = await TheoryCohortInstructorService.listInstructorUserIdsByCohortIds(
      cohorts.map((c) => c.id),
    );
    const out: TheoryCohortDto[] = [];
    for (const c of cohorts) {
      const linked = instructorIdsByCohort.get(c.id) ?? [];
      out.push(
        toDto(c, await enrolledCount(c.id), await sessionCountForCohort(c.id), linked),
      );
    }
    return out;
  }

  static async create(input: {
    name: string;
    startDateIso: string;
    endDateIso: string;
    seats: number;
    instructorName: string;
    meetLink?: string;
    status: string;
    branchId: number;
    sessionStartTime?: string | null;
    sessionEndTime?: string | null;
    priceAmd?: number | null;
    lessonWeekdays?: number[];
    totalLessons?: number;
    instructorUserId?: number | null;
    instructorUserIds?: number[] | null;
  }): Promise<TheoryCohortDto> {
    const startT = timeHmOrNull(input.sessionStartTime);
    const endT = timeHmOrNull(input.sessionEndTime);
    const weekdays = TheoryCohortSessionService.serializeWeekdaysForStorage(input.lessonWeekdays ?? []);
    const totalLessons = Math.max(0, Math.floor(Number(input.totalLessons) || 0));
    validateScheduleFields({
      startDateIso: input.startDateIso,
      endDateIso: input.endDateIso,
      lessonWeekdays: TheoryCohortSessionService.parseWeekdaysFromStorage(weekdays),
      sessionStartTime: startT,
      sessionEndTime: endT,
      totalLessons,
    });
    const price =
      input.priceAmd != null && Number.isFinite(Number(input.priceAmd)) && Number(input.priceAmd) >= 0
        ? Math.round(Number(input.priceAmd))
        : null;
    const resolvedInstructorIds = await resolveInstructorUserIdsFromInput({
      instructorUserIds: input.instructorUserIds,
      instructorUserId: input.instructorUserId,
      instructorName: input.instructorName,
      branchId: input.branchId,
    });
    await TheoryCohortInstructorService.assertAssignableTheoryInstructors(
      resolvedInstructorIds,
      input.branchId,
    );
    const instructorUserId = resolvedInstructorIds[0] ?? null;
    const instructorName =
      (await TheoryCohortInstructorService.buildInstructorDisplayName(resolvedInstructorIds)) ||
      input.instructorName.trim();

    return sequelize.transaction(async (t) => {
      const c = await TheoryCohort.create(
        {
          name: input.name.trim(),
          startDateIso: input.startDateIso,
          endDateIso: input.endDateIso,
          seats: input.seats,
          instructorName,
          meetLink: input.meetLink?.trim() ?? '',
          status: input.status,
          branchId: input.branchId,
          sessionStartTime: startT,
          sessionEndTime: endT,
          priceAmd: price,
          lessonWeekdays: weekdays,
          totalLessons,
          instructorUserId,
        },
        { transaction: t },
      );
      await TheoryCohortInstructorService.syncInstructors(
        c.id,
        resolvedInstructorIds,
        input.branchId,
        t,
      );
      await c.reload({ transaction: t });
      await TheoryCohortSessionService.syncSessionsForCohort(c, t);
      const genCount = await sessionCountForCohort(c.id);
      return toDto(c, 0, genCount, resolvedInstructorIds);
    });
  }

  static async update(
    id: number,
    patch: Partial<{
      name: string;
      startDateIso: string;
      endDateIso: string;
      seats: number;
      instructorName: string;
      meetLink: string;
      status: string;
      branchId: number;
      sessionStartTime: string | null;
      sessionEndTime: string | null;
      priceAmd?: number | null;
      lessonWeekdays?: number[];
      totalLessons?: number;
      instructorUserId?: number | null;
      instructorUserIds?: number[] | null;
    }>,
  ): Promise<TheoryCohortDto | null> {
    const c = await TheoryCohort.findByPk(id);
    if (!c) return null;
    const enc = await enrolledCount(id);
    if (patch.seats !== undefined && patch.seats < enc) {
      throw new ConflictError('Seats cannot be less than enrolled count', HttpStatusCodesUtil.CONFLICT);
    }

    const nextStart = patch.startDateIso ?? dateIso(c.startDateIso);
    const nextEnd = patch.endDateIso ?? dateIso(c.endDateIso);
    const nextWeekdays =
      patch.lessonWeekdays !== undefined
        ? patch.lessonWeekdays
        : TheoryCohortSessionService.parseWeekdaysFromStorage(c.lessonWeekdays);
    const nextTotal = patch.totalLessons !== undefined ? Math.max(0, Math.floor(patch.totalLessons)) : Math.floor(Number(c.totalLessons) || 0);
    const nextStartT = patch.sessionStartTime !== undefined ? timeHmOrNull(patch.sessionStartTime) : timeHmOrNull(c.sessionStartTime);
    const nextEndT = patch.sessionEndTime !== undefined ? timeHmOrNull(patch.sessionEndTime) : timeHmOrNull(c.sessionEndTime);
    validateScheduleFields({
      startDateIso: nextStart,
      endDateIso: nextEnd,
      lessonWeekdays: nextWeekdays,
      sessionStartTime: nextStartT,
      sessionEndTime: nextEndT,
      totalLessons: nextTotal,
    });

    const nextBranchId = patch.branchId !== undefined ? patch.branchId : c.branchId;
    const instructorsTouched =
      patch.instructorUserIds !== undefined ||
      patch.instructorUserId !== undefined ||
      patch.instructorName !== undefined;
    let nextInstructorIds: number[] | undefined;
    if (patch.instructorUserIds !== undefined || patch.instructorUserId !== undefined) {
      nextInstructorIds = await resolveInstructorUserIdsFromInput({
        instructorUserIds: patch.instructorUserIds,
        instructorUserId: patch.instructorUserId,
        instructorName: patch.instructorName ?? c.instructorName,
        branchId: nextBranchId,
      });
      await TheoryCohortInstructorService.assertAssignableTheoryInstructors(
        nextInstructorIds,
        nextBranchId,
      );
    } else if (patch.branchId !== undefined && patch.branchId !== c.branchId) {
      nextInstructorIds = await TheoryCohortInstructorService.resolveInstructorUserIds(c);
      if (nextInstructorIds.length > 0) {
        await TheoryCohortInstructorService.assertAssignableTheoryInstructors(
          nextInstructorIds,
          nextBranchId,
        );
      }
    }
    const nextInstructorUserId =
      nextInstructorIds !== undefined
        ? nextInstructorIds[0] ?? null
        : patch.instructorUserId !== undefined
          ? patch.instructorUserId == null ||
            !Number.isFinite(Number(patch.instructorUserId)) ||
            Number(patch.instructorUserId) <= 0
            ? null
            : Math.round(Number(patch.instructorUserId))
          : c.instructorUserId != null && Number.isFinite(Number(c.instructorUserId)) && Number(c.instructorUserId) > 0
            ? Math.round(Number(c.instructorUserId))
            : null;
    if (nextInstructorUserId != null) {
      await assertCohortInstructorServesBranch(nextInstructorUserId, nextBranchId);
    }
    const nextInstructorName =
      nextInstructorIds !== undefined
        ? (await TheoryCohortInstructorService.buildInstructorDisplayName(nextInstructorIds)) ||
          (patch.instructorName !== undefined ? patch.instructorName.trim() : c.instructorName)
        : patch.instructorName !== undefined
          ? patch.instructorName.trim()
          : undefined;

    return sequelize.transaction(async (t) => {
    if (nextInstructorIds !== undefined) {
      await TheoryCohortInstructorService.syncInstructors(c.id, nextInstructorIds, nextBranchId, t);
    }
    await c.update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.startDateIso !== undefined ? { startDateIso: patch.startDateIso } : {}),
      ...(patch.endDateIso !== undefined ? { endDateIso: patch.endDateIso } : {}),
      ...(patch.seats !== undefined ? { seats: patch.seats } : {}),
      ...(nextInstructorName !== undefined ? { instructorName: nextInstructorName } : {}),
      ...(patch.meetLink !== undefined ? { meetLink: patch.meetLink.trim() } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
      ...(patch.sessionStartTime !== undefined ? { sessionStartTime: timeHmOrNull(patch.sessionStartTime) } : {}),
      ...(patch.sessionEndTime !== undefined ? { sessionEndTime: timeHmOrNull(patch.sessionEndTime) } : {}),
      ...(patch.priceAmd !== undefined
        ? {
            priceAmd:
              patch.priceAmd == null || !Number.isFinite(Number(patch.priceAmd)) || Number(patch.priceAmd) < 0
                ? null
                : Math.round(Number(patch.priceAmd)),
          }
        : {}),
      ...(patch.lessonWeekdays !== undefined
        ? { lessonWeekdays: TheoryCohortSessionService.serializeWeekdaysForStorage(patch.lessonWeekdays) }
        : {}),
      ...(patch.totalLessons !== undefined ? { totalLessons: Math.max(0, Math.floor(patch.totalLessons)) } : {}),
      ...(instructorsTouched || patch.instructorUserId !== undefined
        ? { instructorUserId: nextInstructorUserId }
        : {}),
    }, { transaction: t });
    await c.reload({ transaction: t });
    await TheoryCohortSessionService.syncSessionsForCohort(c, t);
    const genCount = await sessionCountForCohort(c.id);
    const linked =
      nextInstructorIds ?? (await TheoryCohortInstructorService.listInstructorUserIdsForCohort(c.id));
    return toDto(c, enc, genCount, linked);
    });
  }

  static async remove(id: number): Promise<boolean> {
    return sequelize.transaction(async (t) => {
      await TheoryCohortSessionService.removeAllForCohort(id, t);
      await TheoryCohortInstructorService.removeAllForCohort(id, t);
      await TheoryCohortEnrollment.destroy({ where: { cohortId: id }, transaction: t });
      const n = await TheoryCohort.destroy({ where: { id }, transaction: t });
      return n > 0;
    });
  }

  static previewSessions(input: {
    startDateIso: string;
    endDateIso: string;
    lessonWeekdays: number[];
    sessionStartTime: string | null;
    sessionEndTime: string | null;
    totalLessons: number;
  }): { sessions: ReturnType<typeof generateCohortSessions> } {
    const startT = timeHmOrNull(input.sessionStartTime);
    const endT = timeHmOrNull(input.sessionEndTime);
    if (!startT || !endT) {
      throw new InputValidationError('Session start and end times are required', HttpStatusCodesUtil.BAD_REQUEST);
    }
    validateScheduleFields({
      startDateIso: input.startDateIso,
      endDateIso: input.endDateIso,
      lessonWeekdays: input.lessonWeekdays,
      sessionStartTime: startT,
      sessionEndTime: endT,
      totalLessons: input.totalLessons,
    });
    const sessions = generateCohortSessions({
      startDateIso: input.startDateIso,
      endDateIso: input.endDateIso,
      lessonWeekdays: input.lessonWeekdays,
      sessionStartTime: startT,
      sessionEndTime: endT,
      totalLessons: input.totalLessons,
    });
    return { sessions };
  }

  /** Returns `null` if the cohort does not exist. */
  static async listEnrollments(cohortId: number): Promise<TheoryCohortEnrollmentStudentDto[] | null> {
    const exists = await TheoryCohort.findByPk(cohortId);
    if (!exists) return null;
    const rows = await TheoryCohortEnrollment.findAll({
      where: { cohortId },
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'phone', 'phone2', 'isActive'] }],
    });
    const out: TheoryCohortEnrollmentStudentDto[] = [];
    for (const row of rows) {
      const student = row.get('student') as User | null | undefined;
      if (!student) continue;
      out.push({
        userId: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone ?? null,
        phone2: student.phone2 ?? null,
        isActive: student.isActive ?? true,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  static async enroll(cohortId: number, studentUserId: number): Promise<TheoryCohortDto | null> {
    return sequelize.transaction(async (t) => {
      const cohort = await TheoryCohort.findByPk(cohortId, { transaction: t, lock: Transaction.LOCK.UPDATE });
      if (!cohort) return null;
      const student = await User.findOne({
        where: { id: studentUserId, accountType: 'student' },
        transaction: t,
      });
      if (!student) {
        throw new ResourceNotFoundError('Student not found', HttpStatusCodesUtil.NOT_FOUND);
      }
      const existing = await TheoryCohortEnrollment.findOne({
        where: { cohortId, studentUserId },
        transaction: t,
      });
      if (existing) {
        throw new ConflictError('Student already enrolled', HttpStatusCodesUtil.CONFLICT);
      }
      const cnt = await TheoryCohortEnrollment.count({ where: { cohortId }, transaction: t });
      if (cnt >= cohort.seats) {
        throw new ConflictError('Cohort is full', HttpStatusCodesUtil.CONFLICT);
      }
      await TheoryCohortEnrollment.create({ cohortId, studentUserId }, { transaction: t });
      const genCount = await sessionCountForCohort(cohortId);
      return toDto(cohort, cnt + 1, genCount);
    });
  }
}
