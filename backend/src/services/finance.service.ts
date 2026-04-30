import { col, fn, where as sqlWhere, type Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type {
  FinanceTxChannel,
  FinanceTxEntryType,
  FinanceTxExpenseKind,
  FinanceTxMethod,
  FinanceTxSource,
  FinanceTxStatus,
} from '../models/finance-transaction.model';
import { Booking, FinanceTransaction, User } from '../models';
import MailService from './mail.service';
import config from '../config';
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

const BOOKING_SLOT_TZ_OFFSET = '+04:00';
const CANCELLATION_REFUND_MIN_HOURS = 24;

function lessonStartDateUtcMs(dateIso: string, timeHHMM: string): number {
  return Date.parse(`${dateIso.slice(0, 10)}T${timeHHMM.trim()}:00${BOOKING_SLOT_TZ_OFFSET}`);
}

function isRefundWindowForCancellation(dateIso: string, timeHHMM: string): boolean {
  return (lessonStartDateUtcMs(dateIso, timeHHMM) - Date.now()) / 3600_000 >= CANCELLATION_REFUND_MIN_HOURS;
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
  refundRequestedAt: string | null;
  refundReviewedAt: string | null;
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
    refundRequestedAt: row.refundRequestedAt ? new Date(row.refundRequestedAt).toISOString() : null,
    refundReviewedAt: row.refundReviewedAt ? new Date(row.refundReviewedAt).toISOString() : null,
  };
}

export default class FinanceService {
  private static inferTransactionFlow(row: FinanceTransaction): 'package' | 'group' | 'practical' | 'one_on_one' | 'other' {
    const d = row.description.trim().toLowerCase();
    if (d.includes('package')) return 'package';
    if (d.includes('group theory') || d.includes('theory group') || d.includes('group')) return 'group';
    if (d.includes('1:1') || d.includes('personal theory')) return 'one_on_one';
    if (d.includes('practical')) return 'practical';
    return 'other';
  }

  private static async sendTransactionEmail(
    row: FinanceTransaction,
    eventKey: 'created' | 'refund_requested' | 'refund_approved' | 'refund_rejected',
    actionLabel: string,
  ): Promise<void> {
    const email = row.email.trim();
    if (!email) return;
    const base = config.PANEL_DEFAULT_ORIGIN.replace(/\/+$/, '');
    await MailService.sendTransactionLifecycleUpdate(email, {
      studentName: row.customer,
      transactionId: row.id,
      description: row.description,
      grossAmd: Number(row.grossAmd),
      flowLabel: this.inferTransactionFlow(row),
      eventKey,
      statusLabel: row.status,
      actionLabel,
      dashboardUrl: `${base}/dashboard/finance`,
    });
  }

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
    void this.sendTransactionEmail(
      row,
      'created',
      'Ձեր գործարքը գրանցվել է։ Նոր կարգավիճակի դեպքում կուղարկենք հաջորդ թարմացումը։',
    ).catch(() => {});
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

  /** Student requests staff-reviewed refund for a payment row. */
  static async requestRefundForStudentUser(id: number, studentUserId: number): Promise<FinanceTxDto> {
    return sequelize.transaction(async (transaction) => {
      const student = await User.findByPk(studentUserId, { transaction });
      if (!student || student.accountType !== 'student') {
        throw new ErrorsUtil.PermissionError('Student access required.', HttpStatusCodesUtil.FORBIDDEN);
      }
      const tx = await FinanceTransaction.findByPk(id, { transaction });
      if (!tx) {
        throw new ErrorsUtil.ResourceNotFoundError('Transaction not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (tx.status !== 'completed') {
        throw new ErrorsUtil.InputValidationError('Only completed payments can be refunded.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (tx.refundRequestedAt != null) {
        throw new ErrorsUtil.ConflictError('Refund request already submitted.', HttpStatusCodesUtil.CONFLICT);
      }
      const sameOwner = tx.email.trim().toLowerCase() === student.email.trim().toLowerCase();
      if (!sameOwner) {
        throw new ErrorsUtil.PermissionError('You can only request refunds for your own payments.', HttpStatusCodesUtil.FORBIDDEN);
      }

      if (tx.bookingId != null) {
        const booking = await Booking.findByPk(tx.bookingId, { transaction });
        if (!booking || booking.studentUserId !== studentUserId) {
          throw new ErrorsUtil.PermissionError('You can only request refunds for your own bookings.', HttpStatusCodesUtil.FORBIDDEN);
        }
        const dateIso = typeof booking.dateIso === 'string' ? booking.dateIso.slice(0, 10) : new Date(booking.dateIso).toISOString().slice(0, 10);
        if (!isRefundWindowForCancellation(dateIso, booking.time)) {
          throw new ErrorsUtil.InputValidationError(
            'Refund request is only allowed at least 24 hours before lesson start.',
            HttpStatusCodesUtil.BAD_REQUEST,
          );
        }
      } else {
        const createdRaw = (tx as unknown as { createdAt?: Date | string }).createdAt;
        const createdAt = createdRaw instanceof Date ? createdRaw : createdRaw ? new Date(createdRaw) : new Date();
        const ageMs = Date.now() - createdAt.getTime();
        if (ageMs > 24 * 3600_000) {
          throw new ErrorsUtil.InputValidationError(
            'Refund request window has passed for this payment.',
            HttpStatusCodesUtil.BAD_REQUEST,
          );
        }
      }

      await tx.update({ status: 'pending', refundRequestedAt: new Date(), refundReviewedAt: null }, { transaction });
      await tx.reload({ transaction });
      void this.sendTransactionEmail(
        tx,
        'refund_requested',
        'Վերադարձի հարցումը ընդունվել է և գտնվում է ստուգման փուլում։',
      ).catch(() => {});
      return toDto(tx);
    });
  }

  static async approveRefundRequest(id: number): Promise<FinanceTxDto> {
    const tx = await FinanceTransaction.findByPk(id);
    if (!tx) {
      throw new ErrorsUtil.ResourceNotFoundError('Transaction not found.', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (tx.refundRequestedAt == null || tx.status !== 'pending') {
      throw new ErrorsUtil.InputValidationError('No pending refund request for this payment.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    await tx.update({ status: 'refunded', refundReviewedAt: new Date() });
    await tx.reload();
    void this.sendTransactionEmail(tx, 'refund_approved', 'Վերադարձի հարցումը հաստատվել է։').catch(() => {});
    return toDto(tx);
  }

  static async rejectRefundRequest(id: number): Promise<FinanceTxDto> {
    const tx = await FinanceTransaction.findByPk(id);
    if (!tx) {
      throw new ErrorsUtil.ResourceNotFoundError('Transaction not found.', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (tx.refundRequestedAt == null || tx.status !== 'pending') {
      throw new ErrorsUtil.InputValidationError('No pending refund request for this payment.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    await tx.update({ status: 'completed', refundReviewedAt: new Date(), refundRequestedAt: null });
    await tx.reload();
    void this.sendTransactionEmail(
      tx,
      'refund_rejected',
      'Վերադարձի հարցումը մերժվել է, և վճարումը մնում է կատարված։',
    ).catch(() => {});
    return toDto(tx);
  }
}
