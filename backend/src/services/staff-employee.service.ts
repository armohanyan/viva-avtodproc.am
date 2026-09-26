import { Op } from 'sequelize';
import { InstructorProfile, StaffEmployee, User } from '../models';
import type { StaffEmployeePosition } from '../models/staff-employee.model';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { yerevanTodayIso } from '../utils/booking-slot.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const POSITIONS: readonly StaffEmployeePosition[] = [
  'instructor',
  'theory_teacher',
  'instructor_and_theory',
  'director',
  'admin',
  'cleaner',
  'other',
] as const;

export type StaffEmployeeDto = {
  id: number;
  name: string;
  userId: number | null;
  accountName: string | null;
  position: StaffEmployeePosition;
  jobTitle: string;
  startDateIso: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAtIso: string;
};

export type CreateStaffEmployeeInput = {
  name: string;
  userId?: number | null;
  position: StaffEmployeePosition;
  jobTitle?: string | null;
  startDateIso: string;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type UpdateStaffEmployeeInput = Partial<CreateStaffEmployeeInput>;

function defaultJobTitle(position: StaffEmployeePosition): string {
  switch (position) {
    case 'instructor':
      return 'Հրահանգիչ';
    case 'theory_teacher':
      return 'Տեսության դասախոս';
    case 'instructor_and_theory':
      return 'Հրահանգիչ և տեսության դասախոս';
    case 'director':
      return 'Տնօրեն';
    case 'admin':
      return 'Ադմին';
    case 'cleaner':
      return 'Մաքրուհի';
    default:
      return 'Այլ';
  }
}

function toDto(row: StaffEmployee, accountName: string | null = null): StaffEmployeeDto {
  const createdAt = (row as StaffEmployee & { createdAt?: Date }).createdAt;
  return {
    id: row.id,
    name: row.name,
    userId: row.userId ?? null,
    accountName,
    position: row.position,
    jobTitle: row.jobTitle || defaultJobTitle(row.position),
    startDateIso: String(row.startDateIso).slice(0, 10),
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    isActive: Boolean(row.isActive),
    createdAtIso: createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

function assertPosition(position: string): StaffEmployeePosition {
  if ((POSITIONS as readonly string[]).includes(position)) {
    return position as StaffEmployeePosition;
  }
  throw new InputValidationError('Invalid position', HttpStatusCodesUtil.BAD_REQUEST);
}

export default class StaffEmployeeService {
  static async list(activeOnly = false): Promise<{ items: StaffEmployeeDto[] }> {
    const rows = await StaffEmployee.findAll({
      where: activeOnly ? { isActive: true } : {},
      order: [
        ['isActive', 'DESC'],
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
      include: [{ model: User, as: 'user', required: false, attributes: ['id', 'name'] }],
    });
    return {
      items: rows.map((row) => {
        const user = row.get('user') as User | null | undefined;
        return toDto(row, user?.name?.trim() || null);
      }),
    };
  }

  static async getById(id: number): Promise<StaffEmployeeDto> {
    const row = await StaffEmployee.findByPk(id, {
      include: [{ model: User, as: 'user', required: false, attributes: ['id', 'name'] }],
    });
    if (!row) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const user = row.get('user') as User | null | undefined;
    return toDto(row, user?.name?.trim() || null);
  }

  static async create(
    input: CreateStaffEmployeeInput,
    createdByUserId?: number,
  ): Promise<StaffEmployeeDto> {
    const name = input.name.trim();
    if (!name) {
      throw new InputValidationError('Name is required', HttpStatusCodesUtil.BAD_REQUEST);
    }
    if (!DATE_RE.test(input.startDateIso)) {
      throw new InputValidationError('Invalid start date', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const position = assertPosition(input.position);
    let userId: number | null =
      input.userId != null && Number(input.userId) > 0 ? Number(input.userId) : null;

    if (userId != null) {
      const user = await User.findByPk(userId, { attributes: ['id', 'name', 'accountType'] });
      if (!user) {
        throw new ResourceNotFoundError('Account not found', HttpStatusCodesUtil.NOT_FOUND);
      }
      const clash = await StaffEmployee.findOne({ where: { userId } });
      if (clash) {
        throw new InputValidationError(
          'This account is already linked to another employee',
          HttpStatusCodesUtil.CONFLICT,
        );
      }
    }

    const row = await StaffEmployee.create({
      name,
      userId,
      position,
      jobTitle: input.jobTitle?.trim() || defaultJobTitle(position),
      startDateIso: input.startDateIso,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive !== false,
      createdByUserId: createdByUserId ?? null,
    });
    return this.getById(row.id);
  }

  static async update(id: number, input: UpdateStaffEmployeeInput): Promise<StaffEmployeeDto> {
    const row = await StaffEmployee.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    const patch: Partial<{
      name: string;
      userId: number | null;
      position: StaffEmployeePosition;
      jobTitle: string;
      startDateIso: string;
      phone: string | null;
      notes: string | null;
      isActive: boolean;
    }> = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new InputValidationError('Name is required', HttpStatusCodesUtil.BAD_REQUEST);
      }
      patch.name = name;
    }
    if (input.position !== undefined) {
      patch.position = assertPosition(input.position);
      if (input.jobTitle === undefined && !row.jobTitle) {
        patch.jobTitle = defaultJobTitle(patch.position);
      }
    }
    if (input.jobTitle !== undefined) {
      patch.jobTitle =
        input.jobTitle?.trim() ||
        defaultJobTitle(patch.position ?? row.position);
    }
    if (input.startDateIso !== undefined) {
      if (!DATE_RE.test(input.startDateIso)) {
        throw new InputValidationError('Invalid start date', HttpStatusCodesUtil.BAD_REQUEST);
      }
      patch.startDateIso = input.startDateIso;
    }
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
    if (input.isActive !== undefined) patch.isActive = Boolean(input.isActive);

    if (input.userId !== undefined) {
      const userId =
        input.userId != null && Number(input.userId) > 0 ? Number(input.userId) : null;
      if (userId != null) {
        const user = await User.findByPk(userId, { attributes: ['id'] });
        if (!user) {
          throw new ResourceNotFoundError('Account not found', HttpStatusCodesUtil.NOT_FOUND);
        }
        const clash = await StaffEmployee.findOne({
          where: { userId, id: { [Op.ne]: id } },
        });
        if (clash) {
          throw new InputValidationError(
            'This account is already linked to another employee',
            HttpStatusCodesUtil.CONFLICT,
          );
        }
      }
      patch.userId = userId;
    }

    await row.update(patch);
    return this.getById(id);
  }

  static async remove(id: number): Promise<void> {
    const n = await StaffEmployee.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }

  /** Ensure instructor profiles exist as staff employees (idempotent). */
  static async syncFromInstructorProfiles(): Promise<void> {
    const profiles = await InstructorProfile.findAll({
      attributes: ['userId', 'teachesPractical', 'teachesTheory', 'status'],
      include: [{ model: User, as: 'user', required: true, attributes: ['id', 'name', 'phone'] }],
    });
    const existing = await StaffEmployee.findAll({
      where: { userId: { [Op.ne]: null } },
      attributes: ['id', 'userId'],
    });
    const have = new Set(existing.map((e) => e.userId).filter((id): id is number => id != null));
    const today = yerevanTodayIso();

    for (const p of profiles) {
      if (have.has(p.userId)) continue;
      const user = (p as InstructorProfile & { user?: User }).user;
      if (!user) continue;
      let position: StaffEmployeePosition = 'instructor';
      if (p.teachesPractical && p.teachesTheory) position = 'instructor_and_theory';
      else if (p.teachesTheory) position = 'theory_teacher';
      else if (p.teachesPractical) position = 'instructor';
      else position = 'other';

      await StaffEmployee.create({
        name: user.name?.trim() || `Instructor #${user.id}`,
        userId: user.id,
        position,
        jobTitle: defaultJobTitle(position),
        startDateIso: today,
        phone: user.phone ?? null,
        notes: 'Synced from instructor profile',
        isActive: p.status === 'active',
      });
      have.add(user.id);
    }
  }
}
