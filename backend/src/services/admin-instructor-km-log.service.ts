import { Op } from 'sequelize';
import { InstructorBranch, InstructorKmLog, InstructorProfile, User } from '../models';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type InstructorKmLogDto = {
  id: number;
  instructorUserId: number;
  instructorName: string;
  date: string;
  km: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type InstructorKmLogInput = {
  instructorUserId: number;
  date: string;
  km: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateRange(startDate?: string, endDate?: string): { start: string; end: string } {
  const today = yerevanTodayIso();
  let start = startDate && DATE_RE.test(startDate) ? startDate : today;
  let end = endDate && DATE_RE.test(endDate) ? endDate : today;
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return { start, end };
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rowToDto(row: InstructorKmLog, instructor: User, createdBy?: User): InstructorKmLogDto {
  const km = toNumber(row.km) ?? 0;
  return {
    id: row.id,
    instructorUserId: row.instructorUserId,
    instructorName: instructor.name,
    date: typeof row.date === 'string' ? row.date : String(row.date).slice(0, 10),
    km: round2(km),
    createdAt:
      (row as InstructorKmLog & { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      (row as InstructorKmLog & { updatedAt?: Date }).updatedAt?.toISOString() ?? new Date().toISOString(),
    createdByUserId: row.createdByUserId ?? null,
    createdByName: createdBy?.name ?? null,
  };
}

async function branchInstructorUserIds(branchId: number): Promise<number[]> {
  const links = await InstructorBranch.findAll({
    where: { branchId },
    attributes: ['instructorUserId'],
  });
  return [...new Set(links.map((l) => l.instructorUserId))];
}

async function assertPracticalInstructor(instructorUserId: number): Promise<void> {
  const profile = await InstructorProfile.findByPk(instructorUserId);
  if (!profile?.teachesPractical) {
    throw new InputValidationError(
      'Instructor must teach practical lessons',
      HttpStatusCodesUtil.BAD_REQUEST,
    );
  }
}

export default class AdminInstructorKmLogService {
  static async list(
    startDate?: string,
    endDate?: string,
    branchId?: number,
    instructorUserId?: number,
  ): Promise<{ items: InstructorKmLogDto[] }> {
    const { start, end } = parseDateRange(startDate, endDate);

    const where: Record<string, unknown> = {
      date: { [Op.between]: [start, end] },
    };

    if (instructorUserId !== undefined) {
      where.instructorUserId = instructorUserId;
    }

    if (branchId !== undefined) {
      const instructorIds = await branchInstructorUserIds(branchId);
      if (instructorIds.length === 0) {
        return { items: [] };
      }
      if (instructorUserId !== undefined) {
        if (!instructorIds.includes(instructorUserId)) {
          return { items: [] };
        }
      } else {
        where.instructorUserId = { [Op.in]: instructorIds };
      }
    }

    const rows = await InstructorKmLog.findAll({
      where,
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [
        { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', required: false, attributes: ['id', 'name'] },
      ],
    });

    const items = rows.map((row) => {
      const instructor = row.get('instructor') as User;
      const createdBy = row.get('createdBy') as User | undefined;
      return rowToDto(row, instructor, createdBy);
    });

    return { items };
  }

  static async create(input: InstructorKmLogInput, createdByUserId?: number): Promise<InstructorKmLogDto> {
    await assertPracticalInstructor(input.instructorUserId);

    if (!Number.isFinite(input.km) || input.km <= 0) {
      throw new InputValidationError('KM must be a positive number', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const row = await InstructorKmLog.create({
      instructorUserId: input.instructorUserId,
      date: input.date,
      km: round2(input.km),
      createdByUserId: createdByUserId ?? null,
    });

    const result = await this.getDtoById(row.id);
    if (!result) {
      throw new ResourceNotFoundError('KM log not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return result;
  }

  static async update(id: number, patch: Partial<InstructorKmLogInput>): Promise<InstructorKmLogDto> {
    const row = await InstructorKmLog.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('KM log not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    if (patch.instructorUserId !== undefined) {
      await assertPracticalInstructor(patch.instructorUserId);
      row.instructorUserId = patch.instructorUserId;
    }
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.km !== undefined) {
      if (!Number.isFinite(patch.km) || patch.km <= 0) {
        throw new InputValidationError('KM must be a positive number', HttpStatusCodesUtil.BAD_REQUEST);
      }
      row.km = round2(patch.km);
    }

    await row.save();
    const result = await this.getDtoById(id);
    if (!result) {
      throw new ResourceNotFoundError('KM log not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return result;
  }

  static async remove(id: number): Promise<void> {
    const n = await InstructorKmLog.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('KM log not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }

  private static async getDtoById(id: number): Promise<InstructorKmLogDto | null> {
    const row = await InstructorKmLog.findByPk(id, {
      include: [
        { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', required: false, attributes: ['id', 'name'] },
      ],
    });
    if (!row) return null;
    const instructor = row.get('instructor') as User;
    const createdBy = row.get('createdBy') as User | undefined;
    return rowToDto(row, instructor, createdBy);
  }
}
