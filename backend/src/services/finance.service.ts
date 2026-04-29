import { col, fn, where as sqlWhere, type Transaction } from 'sequelize';
import type {
  FinanceTxChannel,
  FinanceTxEntryType,
  FinanceTxExpenseKind,
  FinanceTxMethod,
  FinanceTxSource,
  FinanceTxStatus,
} from '../models/finance-transaction.model';
import { Booking, FinanceTransaction, User } from '../models';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';

/** English line for manual/system finance rows tied to a booking (matches admin booking payment wording). */
export function financeDescriptionForBooking(booking: Booking): string {
  const type = booking.lessonType;
  const raw = booking.dateIso as unknown;
  const dateIso =
    typeof raw === 'string'
      ? raw.slice(0, 10)
      : raw instanceof Date
        ? raw.toISOString().slice(0, 10)
        : String(raw).slice(0, 10);
  const typeEn =
    type === 'theory' ? 'Theory' : type === 'theory_personal' ? 'Personal theory' : 'Practical';
  return `${typeEn} lesson ${dateIso} · #${booking.id}`;
}

function normalizeBookingStatus(raw: string): 'confirmed' | 'pending' | 'cancelled' | 'refunded' {
  if (raw === 'confirmed' || raw === 'pending' || raw === 'cancelled' || raw === 'refunded') return raw;
  if (raw === 'completed') return 'confirmed';
  if (raw === 'pending_prebook' || raw === 'pending_payment') return 'pending';
  return 'pending';
}

function financeStatusFromBooking(booking: Booking): FinanceTxStatus {
  const st = normalizeBookingStatus(String(booking.status ?? ''));
  if (st === 'confirmed') return 'completed';
  if (st === 'refunded') return 'refunded';
  if (st === 'cancelled') return 'failed';
  return 'pending';
}

export type FinanceTxDto = {
  id: number;
  createdAt: string;
  customer: string;
  email: string;
  description: string;
  branchId: number;
  channel: FinanceTxChannel;
  method: FinanceTxMethod;
  grossAmd: number;
  feeAmd: number;
  status: FinanceTxStatus;
  providerRef: string;
  source: FinanceTxSource;
  entryType: FinanceTxEntryType;
  expenseKind: FinanceTxExpenseKind | null;
  employeeName: string | null;
  units: number | null;
  unitRateAmd: number | null;
  bookingId: number | null;
};

function toDto(row: FinanceTransaction): FinanceTxDto {
  const created = (row as unknown as { createdAt?: Date | string }).createdAt;
  const createdAt =
    created instanceof Date ? created.toISOString() : typeof created === 'string' ? created : new Date().toISOString();
  return {
    id: row.id,
    createdAt,
    customer: row.customer,
    email: row.email,
    description: row.description,
    branchId: row.branchId,
    channel: row.channel,
    method: row.method,
    grossAmd: row.grossAmd,
    feeAmd: row.feeAmd,
    status: row.status,
    providerRef: row.providerRef,
    source: row.source,
    entryType: row.entryType ?? 'income',
    expenseKind: row.expenseKind ?? null,
    employeeName: row.employeeName ?? null,
    units: row.units == null ? null : Number(row.units),
    unitRateAmd: row.unitRateAmd ?? null,
    bookingId: row.bookingId ?? null,
  };
}

export default class FinanceService {
  static async list(): Promise<FinanceTxDto[]> {
    const rows = await FinanceTransaction.findAll({ order: [['createdAt', 'DESC']] });
    return rows.map(toDto);
  }

  /** Finance rows whose `email` matches the student's account email (case-insensitive). */
  static async listForStudentUser(userId: number): Promise<FinanceTxDto[]> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') {
      return [];
    }
    const email = user.email.trim().toLowerCase();
    const rows = await FinanceTransaction.findAll({
      where: sqlWhere(fn('LOWER', col('email')), email),
      order: [['createdAt', 'DESC']],
    });
    return rows.map(toDto);
  }

  static async create(input: {
    customer: string;
    email?: string;
    description?: string;
    branchId: number;
    channel?: FinanceTxChannel;
    method: FinanceTxMethod;
    grossAmd: number;
    feeAmd?: number;
    status?: FinanceTxStatus;
    providerRef?: string;
    source: FinanceTxSource;
    entryType?: FinanceTxEntryType;
    expenseKind?: FinanceTxExpenseKind | null;
    employeeName?: string | null;
    units?: number | null;
    unitRateAmd?: number | null;
    createdAt?: string;
    bookingId?: number | null;
    transaction?: Transaction;
  }): Promise<FinanceTxDto> {
    const bookingIdNorm =
      input.bookingId === undefined || input.bookingId === null ? null : Number(input.bookingId);

    let linkedBooking: Booking | null = null;
    if (bookingIdNorm != null && Number.isFinite(bookingIdNorm)) {
      linkedBooking = await Booking.findByPk(bookingIdNorm, { transaction: input.transaction });
      if (!linkedBooking) {
        throw new ErrorsUtil.InputValidationError('Linked booking was not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (linkedBooking.branchId !== input.branchId) {
        throw new ErrorsUtil.InputValidationError(
          'Transaction branch must match the linked booking branch.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    let description = (input.description ?? '').trim();
    if (!description) {
      if (linkedBooking) {
        description = financeDescriptionForBooking(linkedBooking);
      } else {
        throw new ErrorsUtil.InputValidationError(
          'Description is required when no booking is linked.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const channel: FinanceTxChannel = input.channel ?? 'office';
    const entryType: FinanceTxEntryType = input.entryType ?? 'income';
    const expenseKind = entryType === 'expense' ? (input.expenseKind ?? 'other') : null;
    const employeeName = entryType === 'expense' ? (input.employeeName ?? null) : null;
    const units = entryType === 'expense' ? (input.units ?? null) : null;
    const unitRateAmd = entryType === 'expense' ? (input.unitRateAmd ?? null) : null;
    const feeAmd = input.feeAmd ?? 0;
    const status: FinanceTxStatus = linkedBooking ? financeStatusFromBooking(linkedBooking) : (input.status ?? 'completed');
    const providerRef = (input.providerRef ?? '').trim() || '—';

    let grossAmd = input.grossAmd;
    if (entryType === 'expense' && units != null && unitRateAmd != null) {
      const computed = Math.round(Number(units) * Number(unitRateAmd));
      if (!Number.isFinite(computed) || computed <= 0) {
        throw new ErrorsUtil.InputValidationError(
          'Units and unit rate must produce a positive amount.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      grossAmd = computed;
    }
    if (feeAmd > grossAmd) {
      throw new ErrorsUtil.InputValidationError('Fee cannot exceed gross.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
    const row = await FinanceTransaction.create(
      {
        customer: input.customer.trim(),
        email: (input.email ?? '').trim(),
        description,
        branchId: input.branchId,
        channel,
        method: input.method,
        grossAmd,
        feeAmd,
        status,
        providerRef,
        source: input.source,
        entryType,
        expenseKind,
        employeeName: employeeName?.trim() || null,
        units,
        unitRateAmd,
        createdAt,
        bookingId: bookingIdNorm,
      } as never,
      { transaction: input.transaction },
    );
    return toDto(row);
  }

  /** Updates a **manual** finance row (system-generated rows cannot be edited here). */
  static async updateManual(
    id: number,
    input: Partial<{
      customer: string;
      email: string;
      description: string;
      branchId: number;
      channel: FinanceTxChannel;
      method: FinanceTxMethod;
      grossAmd: number;
      feeAmd: number;
      status: FinanceTxStatus;
      providerRef: string;
      createdAt: string;
      bookingId: number | null;
      entryType: FinanceTxEntryType;
      expenseKind: FinanceTxExpenseKind | null;
      employeeName: string | null;
      units: number | null;
      unitRateAmd: number | null;
    }>,
  ): Promise<FinanceTxDto> {
    const row = await FinanceTransaction.findByPk(id);
    if (!row) {
      throw new ErrorsUtil.ResourceNotFoundError('Transaction not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (row.source !== 'manual') {
      throw new ErrorsUtil.InputValidationError(
        'Only manual transactions can be edited.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const bookingIdFromInput =
      input.bookingId === undefined ? (row.bookingId ?? null) : input.bookingId === null ? null : Number(input.bookingId);
    const bookingIdNorm =
      bookingIdFromInput != null && Number.isFinite(bookingIdFromInput) ? bookingIdFromInput : null;

    const nextBranchId = input.branchId !== undefined ? input.branchId : row.branchId;

    let linkedBooking: Booking | null = null;
    if (bookingIdNorm != null) {
      const booking = await Booking.findByPk(bookingIdNorm);
      if (!booking) {
        throw new ErrorsUtil.InputValidationError('Linked booking was not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (booking.branchId !== nextBranchId) {
        throw new ErrorsUtil.InputValidationError(
          'Transaction branch must match the linked booking branch.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      linkedBooking = booking;
    }

    const nextEntryType = input.entryType !== undefined ? input.entryType : row.entryType;
    const nextUnits = input.units !== undefined ? input.units : (row.units == null ? null : Number(row.units));
    const nextUnitRateAmd = input.unitRateAmd !== undefined ? input.unitRateAmd : row.unitRateAmd;
    const nextGrossRaw = input.grossAmd !== undefined ? input.grossAmd : row.grossAmd;
    const nextGross =
      nextEntryType === 'expense' && nextUnits != null && nextUnitRateAmd != null
        ? Math.round(Number(nextUnits) * Number(nextUnitRateAmd))
        : nextGrossRaw;
    const nextFee = input.feeAmd !== undefined ? input.feeAmd : row.feeAmd;
    if (nextFee > nextGross) {
      throw new ErrorsUtil.InputValidationError('Fee cannot exceed gross.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const nextCreatedAt = input.createdAt !== undefined ? new Date(input.createdAt) : undefined;
    if (nextCreatedAt !== undefined && Number.isNaN(nextCreatedAt.getTime())) {
      throw new ErrorsUtil.InputValidationError('Invalid date or time.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    await row.update({
      ...(input.customer !== undefined ? { customer: input.customer.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.channel !== undefined ? { channel: input.channel } : {}),
      ...(input.method !== undefined ? { method: input.method } : {}),
      ...(input.grossAmd !== undefined ? { grossAmd: input.grossAmd } : {}),
      ...(input.feeAmd !== undefined ? { feeAmd: input.feeAmd } : {}),
      ...(linkedBooking ? { status: financeStatusFromBooking(linkedBooking) } : input.status !== undefined ? { status: input.status } : {}),
      ...(input.providerRef !== undefined
        ? { providerRef: input.providerRef.trim() || '—' }
        : {}),
      ...(input.entryType !== undefined ? { entryType: input.entryType } : {}),
      ...(nextEntryType === 'expense'
        ? {
            ...(input.expenseKind !== undefined ? { expenseKind: input.expenseKind ?? 'other' } : {}),
            ...(input.employeeName !== undefined ? { employeeName: input.employeeName?.trim() || null } : {}),
            ...(input.units !== undefined ? { units: input.units } : {}),
            ...(input.unitRateAmd !== undefined ? { unitRateAmd: input.unitRateAmd } : {}),
          }
        : {
            ...(input.entryType === 'income' ? { expenseKind: null, employeeName: null, units: null, unitRateAmd: null } : {}),
            ...(input.expenseKind !== undefined ? { expenseKind: null } : {}),
            ...(input.employeeName !== undefined ? { employeeName: null } : {}),
            ...(input.units !== undefined ? { units: null } : {}),
            ...(input.unitRateAmd !== undefined ? { unitRateAmd: null } : {}),
          }),
      ...(input.grossAmd !== undefined || (nextEntryType === 'expense' && nextUnits != null && nextUnitRateAmd != null)
        ? { grossAmd: nextGross }
        : {}),
      ...(nextCreatedAt !== undefined ? { createdAt: nextCreatedAt } : {}),
      ...(input.bookingId !== undefined ? { bookingId: bookingIdNorm } : {}),
    } as never);

    await row.reload();
    return toDto(row);
  }

  static async removeManual(id: number): Promise<void> {
    const row = await FinanceTransaction.findByPk(id);
    if (!row) {
      throw new ErrorsUtil.ResourceNotFoundError('Transaction not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (row.source !== 'manual') {
      throw new ErrorsUtil.InputValidationError(
        'Only manual transactions can be deleted.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    await row.destroy();
  }
}
