import { Op } from 'sequelize';
import type { PetrolType } from '../constants/petrol-type';
import { petrolTypeLabelAm } from '../constants/petrol-type';
import { sequelize } from '../database/sequelize';
import {
  FleetCar,
  FleetCarInstructor,
  PetrolExpense,
  PetrolExpenseRequest,
  User,
} from '../models';
import type { PetrolExpenseRequestStatus } from '../models/petrol-expense-request.model';
import NotificationService from './notification.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type PetrolExpenseRequestDto = {
  id: number;
  instructorUserId: number;
  instructorName: string;
  carId: number;
  carLabel: string;
  date: string;
  time: string | null;
  petrolType: PetrolType;
  petrolTypeLabel: string;
  price: number;
  photoUrl: string;
  description: string | null;
  status: PetrolExpenseRequestStatus;
  decisionNote: string | null;
  decidedByUserId: number | null;
  decidedByName: string | null;
  decidedAtIso: string | null;
  petrolExpenseId: number | null;
  createdAtIso: string;
};

export type InstructorCarOptionDto = {
  id: number;
  label: string;
};

export type CreatePetrolExpenseRequestInput = {
  carId: number;
  date: string;
  time?: string | null;
  petrolType: PetrolType;
  price: number;
  photoUrl: string;
  description?: string | null;
};

function carLabel(car: FleetCar): string {
  const plate = car.plate?.trim() || `#${car.id}`;
  const makeModel = [car.make, car.model].filter(Boolean).join(' ').trim();
  return makeModel ? `${plate} · ${makeModel}` : plate;
}

function rowToDto(row: PetrolExpenseRequest): PetrolExpenseRequestDto {
  const car = row.get('FleetCar') as FleetCar;
  const instructor = row.get('instructor') as User;
  const decidedBy = row.get('decidedBy') as User | null | undefined;
  const createdAt = (row as PetrolExpenseRequest & { createdAt?: Date }).createdAt;
  return {
    id: row.id,
    instructorUserId: row.instructorUserId,
    instructorName: instructor?.name?.trim() || `Instructor #${row.instructorUserId}`,
    carId: row.carId,
    carLabel: carLabel(car),
    date: typeof row.date === 'string' ? row.date : String(row.date).slice(0, 10),
    time: row.time ?? null,
    petrolType: row.petrolType,
    petrolTypeLabel: petrolTypeLabelAm(row.petrolType),
    price: row.price,
    photoUrl: row.photoUrl,
    description: row.description?.trim() || null,
    status: row.status,
    decisionNote: row.decisionNote?.trim() || null,
    decidedByUserId: row.decidedByUserId ?? null,
    decidedByName: decidedBy?.name ?? null,
    decidedAtIso: row.decidedAt ? new Date(row.decidedAt).toISOString() : null,
    petrolExpenseId: row.petrolExpenseId ?? null,
    createdAtIso: createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

const REQUEST_INCLUDES = [
  { model: FleetCar, required: true },
  { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
  { model: User, as: 'decidedBy', required: false, attributes: ['id', 'name'] },
];

async function findDtoById(id: number): Promise<PetrolExpenseRequestDto> {
  const row = await PetrolExpenseRequest.findByPk(id, { include: REQUEST_INCLUDES });
  if (!row) {
    throw new ResourceNotFoundError('Fuel expense request not found', HttpStatusCodesUtil.NOT_FOUND);
  }
  return rowToDto(row);
}

export default class PetrolExpenseRequestService {
  /** Cars assigned to the instructor via the fleet car↔instructor mapping. */
  static async carsForInstructor(instructorUserId: number): Promise<InstructorCarOptionDto[]> {
    const links = await FleetCarInstructor.findAll({
      where: { instructorUserId },
      attributes: ['carId'],
    });
    const carIds = [...new Set(links.map((l) => l.carId))];
    if (carIds.length === 0) return [];
    const cars = await FleetCar.findAll({ where: { id: { [Op.in]: carIds } } });
    return cars
      .map((car) => ({ id: car.id, label: carLabel(car) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'hy'));
  }

  static async listForInstructor(instructorUserId: number): Promise<{ items: PetrolExpenseRequestDto[] }> {
    const rows = await PetrolExpenseRequest.findAll({
      where: { instructorUserId },
      order: [['id', 'DESC']],
      include: REQUEST_INCLUDES,
    });
    return { items: rows.map(rowToDto) };
  }

  static async create(
    instructorUserId: number,
    input: CreatePetrolExpenseRequestInput,
  ): Promise<PetrolExpenseRequestDto> {
    const instructor = await User.findByPk(instructorUserId, { attributes: ['id', 'name'] });
    if (!instructor) {
      throw new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    const link = await FleetCarInstructor.findOne({
      where: { carId: input.carId, instructorUserId },
    });
    if (!link) {
      throw new InputValidationError(
        'Car is not assigned to this instructor',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const row = await PetrolExpenseRequest.create({
      instructorUserId,
      carId: input.carId,
      date: input.date,
      time: input.time?.trim() || null,
      petrolType: input.petrolType,
      price: Math.round(input.price),
      photoUrl: input.photoUrl.trim(),
      description: input.description?.trim() || null,
    });

    await NotificationService.createForRoles(['super_admin'], {
      type: 'PETROL_EXPENSE_REQUEST_CREATED',
      title: 'Վառելիքի ծախսի նոր հայտ',
      message: `${instructor.name?.trim() || `Instructor #${instructorUserId}`} — ${row.price} AMD (${petrolTypeLabelAm(row.petrolType)}), ${input.date}`,
      entityType: 'system',
      entityId: String(row.id),
      metadata: { petrolExpenseRequestId: row.id },
      dedupeKey: `petrol-expense-request-created:${row.id}`,
    });

    return findDtoById(row.id);
  }

  static async listForAdmin(status?: PetrolExpenseRequestStatus): Promise<{ items: PetrolExpenseRequestDto[] }> {
    const rows = await PetrolExpenseRequest.findAll({
      where: status ? { status } : undefined,
      order: [['id', 'DESC']],
      include: REQUEST_INCLUDES,
    });
    return { items: rows.map(rowToDto) };
  }

  /** Approve a pending request: creates the fuel expense record and notifies the instructor. */
  static async approve(
    id: number,
    adminUserId: number | undefined,
    decisionNote?: string | null,
  ): Promise<PetrolExpenseRequestDto> {
    const row = await PetrolExpenseRequest.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Fuel expense request not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (row.status !== 'pending') {
      throw new InputValidationError('Request has already been decided', HttpStatusCodesUtil.CONFLICT);
    }

    const descriptionParts = [
      row.description?.trim() || null,
      row.time ? `Ժամ՝ ${row.time}` : null,
      `Հրահանգչի հայտ #${row.id}`,
    ].filter(Boolean);

    await sequelize.transaction(async (transaction) => {
      const expense = await PetrolExpense.create(
        {
          carId: row.carId,
          instructorUserId: row.instructorUserId,
          date: typeof row.date === 'string' ? row.date : String(row.date).slice(0, 10),
          petrolType: row.petrolType,
          petrolCount: null,
          paymentType: 'cash',
          price: row.price,
          description: descriptionParts.join(' · ') || null,
          createdByUserId: adminUserId ?? null,
        },
        { transaction },
      );

      row.status = 'approved';
      row.decisionNote = decisionNote?.trim() || null;
      row.decidedByUserId = adminUserId ?? null;
      row.decidedAt = new Date();
      row.petrolExpenseId = expense.id;
      await row.save({ transaction });

      await NotificationService.createOne(
        {
          recipientUserId: row.instructorUserId,
          recipientRole: 'instructor',
          type: 'PETROL_EXPENSE_REQUEST_APPROVED',
          title: 'Վառելիքի ծախսը հաստատվել է',
          message: `Ձեր ${row.date} ամսաթվի ${row.price} AMD վառելիքի ծախսի հայտը հաստատվել է`,
          entityType: 'system',
          entityId: String(row.id),
          metadata: { petrolExpenseRequestId: row.id, petrolExpenseId: expense.id },
          dedupeKey: `petrol-expense-request-approved:${row.id}`,
        },
        transaction,
      );
    });

    return findDtoById(id);
  }

  /** Reject a pending request: nothing is recorded, the instructor is notified. */
  static async reject(
    id: number,
    adminUserId: number | undefined,
    decisionNote?: string | null,
  ): Promise<PetrolExpenseRequestDto> {
    const row = await PetrolExpenseRequest.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Fuel expense request not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (row.status !== 'pending') {
      throw new InputValidationError('Request has already been decided', HttpStatusCodesUtil.CONFLICT);
    }

    await sequelize.transaction(async (transaction) => {
      row.status = 'rejected';
      row.decisionNote = decisionNote?.trim() || null;
      row.decidedByUserId = adminUserId ?? null;
      row.decidedAt = new Date();
      await row.save({ transaction });

      const noteSuffix = row.decisionNote ? ` — ${row.decisionNote}` : '';
      await NotificationService.createOne(
        {
          recipientUserId: row.instructorUserId,
          recipientRole: 'instructor',
          type: 'PETROL_EXPENSE_REQUEST_REJECTED',
          title: 'Վառելիքի ծախսը մերժվել է',
          message: `Ձեր ${row.date} ամսաթվի ${row.price} AMD վառելիքի ծախսի հայտը մերժվել է${noteSuffix}`,
          entityType: 'system',
          entityId: String(row.id),
          metadata: { petrolExpenseRequestId: row.id },
          dedupeKey: `petrol-expense-request-rejected:${row.id}`,
        },
        transaction,
      );
    });

    return findDtoById(id);
  }
}
