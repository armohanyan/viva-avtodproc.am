import { Op } from 'sequelize';
import type { PetrolPaymentType } from '../constants/petrol-payment-type';
import { petrolPaymentTypeLabelAm } from '../constants/petrol-payment-type';
import type { PetrolType } from '../constants/petrol-type';
import { petrolTypeLabelAm } from '../constants/petrol-type';
import {
  FleetCar,
  InstructorBranch,
  InstructorProfile,
  PetrolExpense,
  User,
} from '../models';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type PetrolExpenseDto = {
  id: number;
  carId: number;
  carLabel: string;
  instructorUserId: number;
  instructorName: string;
  date: string;
  petrolType: PetrolType;
  petrolTypeLabel: string;
  petrolCount: number | null;
  paymentType: PetrolPaymentType;
  paymentTypeLabel: string;
  price: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type PetrolInstructorAnalyticsDto = {
  instructorId: number;
  instructorName: string;
  totalPetrolCount: number;
  totalPrice: number;
  recordsCount: number;
};

export type PetrolListResult = {
  items: PetrolExpenseDto[];
  summary: {
    totalPetrolCount: number;
    totalPrice: number;
    instructorCount: number;
  };
  byInstructor: PetrolInstructorAnalyticsDto[];
};

export type PetrolExpenseInput = {
  carId: number;
  instructorUserId: number;
  date: string;
  petrolType: PetrolType;
  petrolCount: number | null;
  paymentType?: PetrolPaymentType;
  price: number;
  description?: string | null;
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

function toNullableNumber(value: unknown): number | null {
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

function carLabel(car: FleetCar): string {
  const plate = car.plate?.trim() || `#${car.id}`;
  const makeModel = [car.make, car.model].filter(Boolean).join(' ').trim();
  return makeModel ? `${plate} · ${makeModel}` : plate;
}

function rowToDto(
  row: PetrolExpense,
  car: FleetCar,
  instructor: User,
  createdBy?: User,
): PetrolExpenseDto {
  const petrolType = row.petrolType as PetrolType;
  const paymentType = (row.paymentType ?? 'cash') as PetrolPaymentType;
  return {
    id: row.id,
    carId: row.carId,
    carLabel: carLabel(car),
    instructorUserId: row.instructorUserId,
    instructorName: instructor.name,
    date: typeof row.date === 'string' ? row.date : String(row.date).slice(0, 10),
    petrolType,
    petrolTypeLabel: petrolTypeLabelAm(petrolType),
    petrolCount: toNullableNumber(row.petrolCount),
    paymentType,
    paymentTypeLabel: petrolPaymentTypeLabelAm(paymentType),
    price: row.price,
    description: row.description?.trim() || null,
    createdAt:
      (row as PetrolExpense & { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      (row as PetrolExpense & { updatedAt?: Date }).updatedAt?.toISOString() ?? new Date().toISOString(),
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

async function assertCarExists(carId: number): Promise<FleetCar> {
  const car = await FleetCar.findByPk(carId);
  if (!car) {
    throw new ResourceNotFoundError('Car not found', HttpStatusCodesUtil.NOT_FOUND);
  }
  return car;
}

function buildAnalytics(rows: PetrolExpenseDto[]): {
  summary: PetrolListResult['summary'];
  byInstructor: PetrolInstructorAnalyticsDto[];
} {
  const byId = new Map<number, PetrolInstructorAnalyticsDto>();
  let totalPetrolCount = 0;
  let totalPrice = 0;

  for (const row of rows) {
    totalPrice += row.price;
    if (row.petrolCount != null) {
      totalPetrolCount += row.petrolCount;
    }
    const prev = byId.get(row.instructorUserId) ?? {
      instructorId: row.instructorUserId,
      instructorName: row.instructorName,
      totalPetrolCount: 0,
      totalPrice: 0,
      recordsCount: 0,
    };
    if (row.petrolCount != null) {
      prev.totalPetrolCount += row.petrolCount;
    }
    prev.totalPrice += row.price;
    prev.recordsCount += 1;
    byId.set(row.instructorUserId, prev);
  }

  const byInstructor = [...byId.values()].sort((a, b) =>
    a.instructorName.localeCompare(b.instructorName, 'hy'),
  );

  return {
    summary: {
      totalPetrolCount: Math.round(totalPetrolCount * 100) / 100,
      totalPrice,
      instructorCount: byId.size,
    },
    byInstructor,
  };
}

export default class AdminPetrolExpenseService {
  static async list(
    startDate?: string,
    endDate?: string,
    branchId?: number,
  ): Promise<PetrolListResult> {
    const { start, end } = parseDateRange(startDate, endDate);

    const where: Record<string, unknown> = {
      date: { [Op.between]: [start, end] },
    };

    if (branchId !== undefined) {
      const instructorIds = await branchInstructorUserIds(branchId);
      if (instructorIds.length === 0) {
        return {
          items: [],
          summary: { totalPetrolCount: 0, totalPrice: 0, instructorCount: 0 },
          byInstructor: [],
        };
      }
      where.instructorUserId = { [Op.in]: instructorIds };
    }

    const rows = await PetrolExpense.findAll({
      where,
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [
        { model: FleetCar, required: true },
        { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', required: false, attributes: ['id', 'name'] },
      ],
    });

    const items = rows.map((row) => {
      const car = row.get('FleetCar') as FleetCar;
      const instructor = row.get('instructor') as User;
      const createdBy = row.get('createdBy') as User | undefined;
      return rowToDto(row, car, instructor, createdBy);
    });

    const { summary, byInstructor } = buildAnalytics(items);
    return { items, summary, byInstructor };
  }

  static async create(input: PetrolExpenseInput, createdByUserId?: number): Promise<PetrolExpenseDto> {
    await assertCarExists(input.carId);
    await assertPracticalInstructor(input.instructorUserId);

    const row = await PetrolExpense.create({
      carId: input.carId,
      instructorUserId: input.instructorUserId,
      date: input.date,
      petrolType: input.petrolType,
      petrolCount: input.petrolCount,
      paymentType: input.paymentType ?? 'cash',
      price: Math.round(input.price),
      description: input.description?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    const result = await this.getDtoById(row.id);
    if (!result) {
      throw new ResourceNotFoundError('Petrol expense not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return result;
  }

  static async update(id: number, patch: Partial<PetrolExpenseInput>): Promise<PetrolExpenseDto> {
    const row = await PetrolExpense.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Petrol expense not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    if (patch.carId !== undefined) {
      await assertCarExists(patch.carId);
      row.carId = patch.carId;
    }
    if (patch.instructorUserId !== undefined) {
      await assertPracticalInstructor(patch.instructorUserId);
      row.instructorUserId = patch.instructorUserId;
    }
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.petrolType !== undefined) row.petrolType = patch.petrolType;
    if (patch.petrolCount !== undefined) row.petrolCount = patch.petrolCount;
    if (patch.paymentType !== undefined) row.paymentType = patch.paymentType;
    if (patch.price !== undefined) row.price = Math.round(patch.price);
    if (patch.description !== undefined) row.description = patch.description?.trim() || null;

    await row.save();
    const result = await this.getDtoById(id);
    if (!result) {
      throw new ResourceNotFoundError('Petrol expense not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return result;
  }

  static async remove(id: number): Promise<void> {
    const n = await PetrolExpense.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Petrol expense not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }

  private static async getDtoById(id: number): Promise<PetrolExpenseDto | null> {
    const row = await PetrolExpense.findByPk(id, {
      include: [
        { model: FleetCar, required: true },
        { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', required: false, attributes: ['id', 'name'] },
      ],
    });
    if (!row) return null;
    const car = row.get('FleetCar') as FleetCar;
    const instructor = row.get('instructor') as User;
    const createdBy = row.get('createdBy') as User | undefined;
    return rowToDto(row, car, instructor, createdBy);
  }
}
