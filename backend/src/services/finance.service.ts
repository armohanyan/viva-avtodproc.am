import { col, fn, where as sqlWhere } from 'sequelize';
import type {
  FinanceTxChannel,
  FinanceTxMethod,
  FinanceTxSource,
  FinanceTxStatus,
} from '../models/finance-transaction.model';
import { Booking, FinanceTransaction, User } from '../models';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';

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
    description: string;
    branchId: number;
    channel: FinanceTxChannel;
    method: FinanceTxMethod;
    grossAmd: number;
    feeAmd: number;
    status: FinanceTxStatus;
    providerRef?: string;
    source: FinanceTxSource;
    createdAt?: string;
    bookingId?: number | null;
  }): Promise<FinanceTxDto> {
    const bookingIdNorm =
      input.bookingId === undefined || input.bookingId === null ? null : Number(input.bookingId);
    if (bookingIdNorm != null && Number.isFinite(bookingIdNorm)) {
      const booking = await Booking.findByPk(bookingIdNorm);
      if (!booking) {
        throw new ErrorsUtil.InputValidationError('Linked booking was not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (booking.branchId !== input.branchId) {
        throw new ErrorsUtil.InputValidationError(
          'Transaction branch must match the linked booking branch.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
    const row = await FinanceTransaction.create({
      customer: input.customer.trim(),
      email: (input.email ?? '').trim(),
      description: input.description.trim(),
      branchId: input.branchId,
      channel: input.channel,
      method: input.method,
      grossAmd: input.grossAmd,
      feeAmd: input.feeAmd,
      status: input.status,
      providerRef: (input.providerRef ?? '').trim() || '—',
      source: input.source,
      createdAt,
      bookingId: bookingIdNorm,
    } as never);
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
    }

    const nextGross = input.grossAmd !== undefined ? input.grossAmd : row.grossAmd;
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
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.providerRef !== undefined
        ? { providerRef: input.providerRef.trim() || '—' }
        : {}),
      ...(nextCreatedAt !== undefined ? { createdAt: nextCreatedAt } : {}),
      ...(input.bookingId !== undefined ? { bookingId: bookingIdNorm } : {}),
    } as never);

    await row.reload();
    return toDto(row);
  }
}
