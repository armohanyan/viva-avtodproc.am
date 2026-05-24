import { Op } from 'sequelize';
import type { DistanceUnit, PetrolVolumeUnit } from '../constants/petrol-consumption-units';
import {
  distanceToKm,
  distanceUnitLabelAm,
  litersPer100Km,
  petrolToLiters,
  petrolVolumeUnitLabelAm,
} from '../constants/petrol-consumption-units';
import {
  FleetCar,
  InstructorBranch,
  InstructorProfile,
  PetrolConsumption,
  User,
} from '../models';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type PetrolConsumptionDto = {
  id: number;
  carId: number;
  carLabel: string;
  instructorUserId: number;
  instructorName: string;
  date: string;
  distanceValue: number;
  distanceUnit: DistanceUnit;
  distanceUnitLabel: string;
  petrolAmount: number | null;
  petrolUnit: PetrolVolumeUnit;
  petrolUnitLabel: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type PetrolConsumptionInstructorAnalyticsDto = {
  instructorId: number;
  instructorName: string;
  totalDistanceKm: number;
  totalPetrolLiters: number;
  recordsCount: number;
};

export type PetrolConsumptionCarAnalyticsDto = {
  carId: number;
  carLabel: string;
  totalDistanceKm: number;
  totalPetrolLiters: number;
  recordsCount: number;
};

export type PetrolConsumptionListResult = {
  items: PetrolConsumptionDto[];
  summary: {
    totalDistanceKm: number;
    totalPetrolLiters: number;
    recordsCount: number;
    litersPer100Km: number | null;
  };
  byInstructor: PetrolConsumptionInstructorAnalyticsDto[];
  byCar: PetrolConsumptionCarAnalyticsDto[];
};

export type PetrolConsumptionInput = {
  carId: number;
  instructorUserId: number;
  date: string;
  distanceValue: number;
  distanceUnit: DistanceUnit;
  petrolAmount: number | null;
  petrolUnit: PetrolVolumeUnit;
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

function carLabel(car: FleetCar): string {
  const plate = car.plate?.trim() || `#${car.id}`;
  const makeModel = [car.make, car.model].filter(Boolean).join(' ').trim();
  return makeModel ? `${plate} · ${makeModel}` : plate;
}

function rowToDto(
  row: PetrolConsumption,
  car: FleetCar,
  instructor: User,
  createdBy?: User,
): PetrolConsumptionDto {
  const distanceUnit = row.distanceUnit as DistanceUnit;
  const petrolUnit = row.petrolUnit as PetrolVolumeUnit;
  return {
    id: row.id,
    carId: row.carId,
    carLabel: carLabel(car),
    instructorUserId: row.instructorUserId,
    instructorName: instructor.name,
    date: typeof row.date === 'string' ? row.date : String(row.date).slice(0, 10),
    distanceValue: round2(toNumber(row.distanceValue) ?? 0),
    distanceUnit,
    distanceUnitLabel: distanceUnitLabelAm(distanceUnit),
    petrolAmount: toNumber(row.petrolAmount) != null ? round2(toNumber(row.petrolAmount)!) : null,
    petrolUnit,
    petrolUnitLabel: petrolVolumeUnitLabelAm(petrolUnit),
    description: row.description?.trim() || null,
    createdAt:
      (row as PetrolConsumption & { createdAt?: Date }).createdAt?.toISOString() ??
      new Date().toISOString(),
    updatedAt:
      (row as PetrolConsumption & { updatedAt?: Date }).updatedAt?.toISOString() ??
      new Date().toISOString(),
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

function buildAnalytics(rows: PetrolConsumptionDto[]): {
  summary: PetrolConsumptionListResult['summary'];
  byInstructor: PetrolConsumptionInstructorAnalyticsDto[];
  byCar: PetrolConsumptionCarAnalyticsDto[];
} {
  const byInstructorId = new Map<number, PetrolConsumptionInstructorAnalyticsDto>();
  const byCarId = new Map<number, PetrolConsumptionCarAnalyticsDto>();
  let totalDistanceKm = 0;
  let totalPetrolLiters = 0;

  for (const row of rows) {
    const distKm = distanceToKm(row.distanceValue, row.distanceUnit);
    totalDistanceKm += distKm;

    let petrolL = 0;
    if (row.petrolAmount != null) {
      petrolL = petrolToLiters(row.petrolAmount, row.petrolUnit);
      totalPetrolLiters += petrolL;
    }

    const insPrev = byInstructorId.get(row.instructorUserId) ?? {
      instructorId: row.instructorUserId,
      instructorName: row.instructorName,
      totalDistanceKm: 0,
      totalPetrolLiters: 0,
      recordsCount: 0,
    };
    insPrev.totalDistanceKm += distKm;
    if (row.petrolAmount != null) {
      insPrev.totalPetrolLiters += petrolL;
    }
    insPrev.recordsCount += 1;
    byInstructorId.set(row.instructorUserId, insPrev);

    const carPrev = byCarId.get(row.carId) ?? {
      carId: row.carId,
      carLabel: row.carLabel,
      totalDistanceKm: 0,
      totalPetrolLiters: 0,
      recordsCount: 0,
    };
    carPrev.totalDistanceKm += distKm;
    if (row.petrolAmount != null) {
      carPrev.totalPetrolLiters += petrolL;
    }
    carPrev.recordsCount += 1;
    byCarId.set(row.carId, carPrev);
  }

  const byInstructor = [...byInstructorId.values()]
    .map((r) => ({
      ...r,
      totalDistanceKm: round2(r.totalDistanceKm),
      totalPetrolLiters: round2(r.totalPetrolLiters),
    }))
    .sort((a, b) => a.instructorName.localeCompare(b.instructorName, 'hy'));

  const byCar = [...byCarId.values()]
    .map((r) => ({
      ...r,
      totalDistanceKm: round2(r.totalDistanceKm),
      totalPetrolLiters: round2(r.totalPetrolLiters),
    }))
    .sort((a, b) => a.carLabel.localeCompare(b.carLabel, 'hy'));

  return {
    summary: {
      totalDistanceKm: round2(totalDistanceKm),
      totalPetrolLiters: round2(totalPetrolLiters),
      recordsCount: rows.length,
      litersPer100Km: litersPer100Km(totalDistanceKm, totalPetrolLiters),
    },
    byInstructor,
    byCar,
  };
}

export default class AdminPetrolConsumptionService {
  static async list(
    startDate?: string,
    endDate?: string,
    branchId?: number,
    instructorUserId?: number,
    carId?: number,
  ): Promise<PetrolConsumptionListResult> {
    const { start, end } = parseDateRange(startDate, endDate);

    const where: Record<string, unknown> = {
      date: { [Op.between]: [start, end] },
    };

    if (branchId !== undefined) {
      const instructorIds = await branchInstructorUserIds(branchId);
      if (instructorIds.length === 0) {
        return {
          items: [],
          summary: { totalDistanceKm: 0, totalPetrolLiters: 0, recordsCount: 0, litersPer100Km: null },
          byInstructor: [],
          byCar: [],
        };
      }
      where.instructorUserId = { [Op.in]: instructorIds };
    }

    if (instructorUserId !== undefined && Number.isFinite(instructorUserId) && instructorUserId > 0) {
      where.instructorUserId = instructorUserId;
    }

    if (carId !== undefined && Number.isFinite(carId) && carId > 0) {
      where.carId = carId;
    }

    const rows = await PetrolConsumption.findAll({
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

    const { summary, byInstructor, byCar } = buildAnalytics(items);
    return { items, summary, byInstructor, byCar };
  }

  static async create(
    input: PetrolConsumptionInput,
    createdByUserId?: number,
  ): Promise<PetrolConsumptionDto> {
    await assertCarExists(input.carId);
    await assertPracticalInstructor(input.instructorUserId);

    const row = await PetrolConsumption.create({
      carId: input.carId,
      instructorUserId: input.instructorUserId,
      date: input.date,
      distanceValue: round2(input.distanceValue),
      distanceUnit: input.distanceUnit,
      petrolAmount: input.petrolAmount != null ? round2(input.petrolAmount) : null,
      petrolUnit: input.petrolUnit,
      description: input.description?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    const result = await this.getDtoById(row.id);
    if (!result) {
      throw new ResourceNotFoundError('Petrol consumption not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return result;
  }

  static async update(id: number, patch: Partial<PetrolConsumptionInput>): Promise<PetrolConsumptionDto> {
    const row = await PetrolConsumption.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Petrol consumption not found', HttpStatusCodesUtil.NOT_FOUND);
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
    if (patch.distanceValue !== undefined) row.distanceValue = round2(patch.distanceValue);
    if (patch.distanceUnit !== undefined) row.distanceUnit = patch.distanceUnit;
    if (patch.petrolAmount !== undefined) {
      row.petrolAmount = patch.petrolAmount != null ? round2(patch.petrolAmount) : null;
    }
    if (patch.petrolUnit !== undefined) row.petrolUnit = patch.petrolUnit;
    if (patch.description !== undefined) row.description = patch.description?.trim() || null;

    await row.save();
    const result = await this.getDtoById(id);
    if (!result) {
      throw new ResourceNotFoundError('Petrol consumption not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return result;
  }

  static async remove(id: number): Promise<void> {
    const n = await PetrolConsumption.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Petrol consumption not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }

  private static async getDtoById(id: number): Promise<PetrolConsumptionDto | null> {
    const row = await PetrolConsumption.findByPk(id, {
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
