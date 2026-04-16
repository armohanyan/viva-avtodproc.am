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
  schedule: string;
  seats: number;
  enrolled: number;
  instructorName: string;
  meetLink: string;
  status: string;
  branchId: number;
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

async function enrolledCount(cohortId: number): Promise<number> {
  return TheoryCohortEnrollment.count({ where: { cohortId } });
}

function toDto(c: TheoryCohort, enrolled: number): TheoryCohortDto {
  return {
    id: c.id,
    name: c.name,
    startDateIso: dateIso(c.startDateIso),
    endDateIso: dateIso(c.endDateIso),
    schedule: c.schedule,
    seats: c.seats,
    enrolled,
    instructorName: c.instructorName,
    meetLink: c.meetLink,
    status: c.status,
    branchId: c.branchId,
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
    schedule: string;
    seats: number;
    instructorName: string;
    meetLink?: string;
    status: string;
    branchId: number;
  }): Promise<TheoryCohortDto> {
    const c = await TheoryCohort.create({
      name: input.name.trim(),
      startDateIso: input.startDateIso,
      endDateIso: input.endDateIso,
      schedule: input.schedule.trim(),
      seats: input.seats,
      instructorName: input.instructorName.trim(),
      meetLink: input.meetLink?.trim() ?? '',
      status: input.status,
      branchId: input.branchId,
    });
    return toDto(c, 0);
  }

  static async update(
    id: number,
    patch: Partial<{
      name: string;
      startDateIso: string;
      endDateIso: string;
      schedule: string;
      seats: number;
      instructorName: string;
      meetLink: string;
      status: string;
      branchId: number;
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
      ...(patch.schedule !== undefined ? { schedule: patch.schedule.trim() } : {}),
      ...(patch.seats !== undefined ? { seats: patch.seats } : {}),
      ...(patch.instructorName !== undefined ? { instructorName: patch.instructorName.trim() } : {}),
      ...(patch.meetLink !== undefined ? { meetLink: patch.meetLink.trim() } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
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
