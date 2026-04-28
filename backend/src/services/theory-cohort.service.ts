import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { TheoryCohort, TheoryCohortEnrollment, User } from '../models';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, ConflictError } = ErrorsUtil;

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
};

export type TheoryCohortEnrollmentStudentDto = {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
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

function toDto(c: TheoryCohort, enrolled: number): TheoryCohortDto {
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
  };
}

export default class TheoryCohortService {
  static async list(): Promise<TheoryCohortDto[]> {
    const cohorts = await TheoryCohort.findAll({ order: [['startDateIso', 'DESC']] });
    const out: TheoryCohortDto[] = [];
    for (const c of cohorts) {
      out.push(toDto(c, await enrolledCount(c.id)));
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
  }): Promise<TheoryCohortDto> {
    const startT = timeHmOrNull(input.sessionStartTime);
    const endT = timeHmOrNull(input.sessionEndTime);
    const price =
      input.priceAmd != null && Number.isFinite(Number(input.priceAmd)) && Number(input.priceAmd) >= 0
        ? Math.round(Number(input.priceAmd))
        : null;
    const c = await TheoryCohort.create({
      name: input.name.trim(),
      startDateIso: input.startDateIso,
      endDateIso: input.endDateIso,
      seats: input.seats,
      instructorName: input.instructorName.trim(),
      meetLink: input.meetLink?.trim() ?? '',
      status: input.status,
      branchId: input.branchId,
      sessionStartTime: startT,
      sessionEndTime: endT,
      priceAmd: price,
    });
    return toDto(c, 0);
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
    }>,
  ): Promise<TheoryCohortDto | null> {
    const c = await TheoryCohort.findByPk(id);
    if (!c) return null;
    const enc = await enrolledCount(id);
    if (patch.seats !== undefined && patch.seats < enc) {
      throw new ConflictError('Seats cannot be less than enrolled count', HttpStatusCodesUtil.CONFLICT);
    }
    await c.update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.startDateIso !== undefined ? { startDateIso: patch.startDateIso } : {}),
      ...(patch.endDateIso !== undefined ? { endDateIso: patch.endDateIso } : {}),
      ...(patch.seats !== undefined ? { seats: patch.seats } : {}),
      ...(patch.instructorName !== undefined ? { instructorName: patch.instructorName.trim() } : {}),
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
    });
    await c.reload();
    return toDto(c, enc);
  }

  static async remove(id: number): Promise<boolean> {
    await TheoryCohortEnrollment.destroy({ where: { cohortId: id } });
    const n = await TheoryCohort.destroy({ where: { id } });
    return n > 0;
  }

  /** Returns `null` if the cohort does not exist. */
  static async listEnrollments(cohortId: number): Promise<TheoryCohortEnrollmentStudentDto[] | null> {
    const exists = await TheoryCohort.findByPk(cohortId);
    if (!exists) return null;
    const rows = await TheoryCohortEnrollment.findAll({
      where: { cohortId },
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'phone', 'isActive'] }],
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
      return toDto(cohort, cnt + 1);
    });
  }
}
