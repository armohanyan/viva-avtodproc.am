import type {
  FinanceTxChannel,
  FinanceTxMethod,
  FinanceTxSource,
  FinanceTxStatus,
} from '../models/finance-transaction.model';
import { Booking, FinanceTransaction } from '../models';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';

export type FinanceTxDto = {
  id: string;
  createdAt: string;
  customer: string;
  email: string;
  description: string;
  branchId: string;
  channel: FinanceTxChannel;
  method: FinanceTxMethod;
  grossAmd: number;
  feeAmd: number;
  status: FinanceTxStatus;
  providerRef: string;
  source: FinanceTxSource;
  bookingId: string | null;
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

function newTxId(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${y}${m}${day}-${r}`;
}

export default class FinanceService {
  static async list(): Promise<FinanceTxDto[]> {
    const rows = await FinanceTransaction.findAll({ order: [['createdAt', 'DESC']] });
    return rows.map(toDto);
  }

  static async create(input: {
    id?: string;
    customer: string;
    email?: string;
    description: string;
    branchId: string;
    channel: FinanceTxChannel;
    method: FinanceTxMethod;
    grossAmd: number;
    feeAmd: number;
    status: FinanceTxStatus;
    providerRef?: string;
    source: FinanceTxSource;
    createdAt?: string;
    bookingId?: string | null;
  }): Promise<FinanceTxDto> {
    const bookingIdNorm =
      input.bookingId === undefined || input.bookingId === null
        ? null
        : String(input.bookingId).trim() || null;
    if (bookingIdNorm) {
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

    const id = input.id?.trim() || newTxId(input.source === 'manual' ? 'TX-MAN' : 'TX');
    const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
    const row = await FinanceTransaction.create({
      id,
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
}
