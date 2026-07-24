import { Op, Transaction, col, fn, where as sqlWhere, type Transaction as SequelizeTransaction } from 'sequelize';
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
import BookingNotificationService from './booking-notification.service';
import MailService from './mail.service';
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
  relatedPaymentTransactionId: number | null;
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
    relatedPaymentTransactionId: row.relatedPaymentTransactionId ?? null,
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
    await MailService.sendTransactionLifecycleUpdate(email, {
      studentName: row.customer,
      transactionId: row.id,
      description: row.description,
      grossAmd: Number(row.grossAmd),
      flowLabel: this.inferTransactionFlow(row),
      eventKey,
      statusLabel: row.status,
      actionLabel,
    });
  }

  static async list(branchId?: number): Promise<FinanceTxDto[]> {
    const rows = await FinanceTransaction.findAll({
      ...(branchId !== undefined ? { where: { branchId } } : {}),
      order: [['createdAt', 'DESC']],
    });
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

  /**
   * Removes finance rows for a deleted student: matches account email (same as `listForStudentUser`)
   * and any rows still linked to the student's bookings, including refund expense children.
   */
  static async deleteAllForStudentUser(
    userId: number,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'accountType', 'email'],
      transaction,
    });
    if (!user || user.accountType !== 'student') {
      return;
    }

    const bookings = await Booking.findAll({
      where: { studentUserId: userId },
      attributes: ['id'],
      transaction,
    });
    const bookingIds = bookings.map((b) => b.id).filter((id): id is number => typeof id === 'number');

    const email = user.email.trim().toLowerCase();
    const orConditions: Array<ReturnType<typeof sqlWhere> | { bookingId: { [Op.in]: number[] } }> = [];
    if (bookingIds.length > 0) {
      orConditions.push({ bookingId: { [Op.in]: bookingIds } });
    }
    if (email.length > 0) {
      orConditions.push(sqlWhere(fn('LOWER', col('email')), email));
    }
    if (orConditions.length === 0) {
      return;
    }

    const primaryRows = await FinanceTransaction.findAll({
      where: { [Op.or]: orConditions },
      attributes: ['id'],
      transaction,
    });
    const ids = new Set(primaryRows.map((r) => r.id));

    let expanded = true;
    while (expanded) {
      expanded = false;
      if (ids.size === 0) {
        break;
      }
      const linked = await FinanceTransaction.findAll({
        where: { relatedPaymentTransactionId: { [Op.in]: [...ids] } },
        attributes: ['id'],
        transaction,
      });
      for (const row of linked) {
        if (!ids.has(row.id)) {
          ids.add(row.id);
          expanded = true;
        }
      }
    }

    if (ids.size > 0) {
      await FinanceTransaction.destroy({
        where: { id: { [Op.in]: [...ids] } },
        transaction,
      });
    }
  }

  static async create(input: {
    customer?: string;
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
    relatedPaymentTransactionId?: number | null;
    transaction?: SequelizeTransaction;
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

    let customer = (input.customer ?? '').trim();
    let email = (input.email ?? '').trim();
    if (linkedBooking && (!customer || !email)) {
      const stu = await User.findByPk(linkedBooking.studentUserId, {
        attributes: ['name', 'email'],
        transaction: input.transaction,
      });
      if (stu) {
        if (!customer) customer = stu.name.trim() || 'Student';
        if (!email) email = (stu.email ?? '').trim();
      }
    }
    if (!customer) {
      throw new ErrorsUtil.InputValidationError(
        'customer: String must contain at least 1 character(s)',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    let description = (input.description ?? '').trim();
    if (!description) {
      if (linkedBooking) {
        description = financeDescriptionForBooking(linkedBooking);
      } else {
        description = `Payment — ${customer}`;
      }
    }

    const channel: FinanceTxChannel = input.channel ?? 'office';
    const entryType: FinanceTxEntryType = input.entryType ?? 'income';
    const expenseKind = entryType === 'expense' ? (input.expenseKind ?? 'other') : null;
    const employeeName = entryType === 'expense' ? (input.employeeName ?? null) : null;
    const units = entryType === 'expense' ? (input.units ?? null) : null;
    const unitRateAmd = entryType === 'expense' ? (input.unitRateAmd ?? null) : null;
    const feeAmd = input.feeAmd ?? 0;
    const status: FinanceTxStatus =
      linkedBooking && entryType === 'income'
        ? financeStatusFromBooking(linkedBooking)
        : (input.status ?? 'completed');
    const providerRef = (input.providerRef ?? '').trim() || '—';

    const relatedPaymentTxIdRaw = input.relatedPaymentTransactionId;
    const relatedPaymentTransactionId =
      relatedPaymentTxIdRaw != null && Number.isFinite(Number(relatedPaymentTxIdRaw)) && Number(relatedPaymentTxIdRaw) > 0
        ? Number(relatedPaymentTxIdRaw)
        : null;

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
        customer,
        email,
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
        relatedPaymentTransactionId,
      } as never,
      { transaction: input.transaction },
    );
    // Booking-linked ledger rows are notified via booking confirmation / cancellation mail only.
    if (bookingIdNorm == null) {
      void this.sendTransactionEmail(
        row,
        'created',
        'Ձեր գործարքը գրանցվել է։ Նոր կարգավիճակի դեպքում կուղարկենք հաջորդ թարմացումը։',
      ).catch(() => {});
    }
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
      ...(input.customer !== undefined
        ? {
            customer: (() => {
              const trimmed = input.customer.trim();
              if (trimmed) return trimmed;
              // Keep existing customer if an empty string was sent for a booking-linked row.
              return row.customer;
            })(),
          }
        : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.channel !== undefined ? { channel: input.channel } : {}),
      ...(input.method !== undefined ? { method: input.method } : {}),
      ...(input.grossAmd !== undefined ? { grossAmd: input.grossAmd } : {}),
      ...(input.feeAmd !== undefined ? { feeAmd: input.feeAmd } : {}),
      ...(linkedBooking && (input.entryType ?? row.entryType) === 'income'
        ? { status: financeStatusFromBooking(linkedBooking) }
        : input.status !== undefined
          ? { status: input.status }
          : {}),
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

  /**
   * Legacy rows used `income` + `refunded` status. Normalize to `completed` income so gross intake KPIs stay correct;
   * refund is represented only by `booking_refund` expense lines.
   */
  private static async normalizeLegacyRefundedIncomeRowsForBooking(
    bookingId: number,
    transaction: SequelizeTransaction,
  ): Promise<void> {
    const existingRefundExpense = await FinanceTransaction.count({
      where: {
        bookingId,
        entryType: 'expense',
        expenseKind: 'booking_refund',
        status: 'completed',
      },
      transaction,
    });
    if (existingRefundExpense > 0) return;

    const legacy = await FinanceTransaction.findAll({
      where: { bookingId, entryType: 'income', status: 'refunded' },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    const suffix = ' · cancellation refund';
    for (const fin of legacy) {
      const desc = String(fin.description ?? '').trim();
      const restored = desc.endsWith(suffix) ? desc.slice(0, -suffix.length).trim() : desc;
      await fin.update(
        {
          status: 'completed',
          description: restored || desc,
          refundReviewedAt: fin.refundReviewedAt ?? new Date(),
        },
        { transaction },
      );
    }
  }

  private static async sumCompletedIncomeForBooking(
    bookingId: number,
    transaction: SequelizeTransaction,
  ): Promise<number> {
    const row = await FinanceTransaction.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('gross_amd')), 0), 'total']],
      where: { bookingId, entryType: 'income', status: 'completed' },
      transaction,
      raw: true,
    }) as { total?: unknown } | null;
    const v = row?.total;
    if (v == null) return 0;
    const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private static async sumBookingRefundExpensesForBooking(
    bookingId: number,
    transaction: SequelizeTransaction,
  ): Promise<number> {
    const row = await FinanceTransaction.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('gross_amd')), 0), 'total']],
      where: {
        bookingId,
        entryType: 'expense',
        expenseKind: 'booking_refund',
        status: 'completed',
      },
      transaction,
      raw: true,
    }) as { total?: unknown } | null;
    const v = row?.total;
    if (v == null) return 0;
    const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * When a booking is closed with a refund: adds a `booking_refund` **expense** row (money out). Original payment
   * income rows stay `completed`. Idempotent per booking money cap (no duplicate full refunds).
   *
   * @returns `true` when the ledger already contained or now contains the refund line for this approval.
   */
  static async applyBookingCancellationRefundLedgerInTx(opts: {
    booking: Booking;
    customer: string;
    email: string;
    grossAmd: number;
    lessonDescriptionLine: string;
    transaction: SequelizeTransaction;
  }): Promise<boolean> {
    const { booking, customer, email, grossAmd, lessonDescriptionLine, transaction } = opts;
    if (grossAmd <= 0) return false;

    const canonicalBookingRef = `booking-refund:booking:${booking.id}`;
    const syntheticRef = `booking-refund:booking:${booking.id}:synthetic`;

    const existingCanonical = await FinanceTransaction.findOne({
      where: { bookingId: booking.id, providerRef: canonicalBookingRef },
      transaction,
    });
    if (existingCanonical) return true;

    await FinanceService.normalizeLegacyRefundedIncomeRowsForBooking(booking.id, transaction);

    const incomeSum = await FinanceService.sumCompletedIncomeForBooking(booking.id, transaction);
    const refundOut = await FinanceService.sumBookingRefundExpensesForBooking(booking.id, transaction);
    const capFromLedger = Math.max(0, incomeSum - refundOut);

    const hasSynthetic = await FinanceTransaction.findOne({
      where: { bookingId: booking.id, providerRef: syntheticRef },
      transaction,
    });

    let want = Math.min(Math.floor(grossAmd), capFromLedger);
    if (want <= 0 && incomeSum === 0 && refundOut === 0 && !hasSynthetic) {
      want = Math.floor(grossAmd);
    }
    if (want <= 0) return false;

    const template = await FinanceTransaction.findOne({
      where: { bookingId: booking.id, entryType: 'income', status: 'completed' },
      order: [['id', 'ASC']],
      transaction,
    });
    const primaryIncomeId = template?.id ?? null;
    const channel: FinanceTxChannel = (template?.channel as FinanceTxChannel) ?? 'online';
    const method: FinanceTxMethod = (template?.method as FinanceTxMethod) ?? 'card';

    const isSyntheticNoLedger = incomeSum === 0 && refundOut === 0 && template == null;
    const providerRef = isSyntheticNoLedger
      ? syntheticRef
      : want >= capFromLedger && capFromLedger > 0
        ? canonicalBookingRef
        : `${canonicalBookingRef}:p:${Date.now()}`;

    const dup = await FinanceTransaction.findOne({
      where: { bookingId: booking.id, providerRef },
      transaction,
    });
    if (dup) return true;

    await FinanceService.create({
      customer: customer.trim() || 'Student',
      email: email.trim(),
      description: `Refund · ${lessonDescriptionLine} · booking #${booking.id}`,
      branchId: booking.branchId,
      channel,
      method,
      grossAmd: want,
      feeAmd: 0,
      status: 'completed',
      providerRef,
      source: 'system',
      entryType: 'expense',
      expenseKind: 'booking_refund',
      bookingId: booking.id,
      relatedPaymentTransactionId: primaryIncomeId,
      transaction,
    });
    return true;
  }

  static async requestRefundForStudentUser(id: number, studentUserId: number): Promise<FinanceTxDto> {
    let financeTxId = 0;
    let bookingIdForAdminNotify: number | null = null;
    const dto = await sequelize.transaction(async (transaction) => {
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
      financeTxId = tx.id;
      bookingIdForAdminNotify = tx.bookingId;
      void this.sendTransactionEmail(
        tx,
        'refund_requested',
        'Վերադարձի հարցումը ընդունվել է և գտնվում է ստուգման փուլում։',
      ).catch(() => {});
      return toDto(tx);
    });
    if (bookingIdForAdminNotify != null && financeTxId > 0) {
      void BookingNotificationService.notifyAdminFinanceRefundRequestForBooking(
        financeTxId,
        bookingIdForAdminNotify,
      ).catch(() => {});
    }
    return dto;
  }

  static async approveRefundRequest(id: number, refundAmountAmd?: number): Promise<FinanceTxDto> {
    return sequelize.transaction(async (transaction) => {
      const tx = await FinanceTransaction.findByPk(id, { transaction, lock: Transaction.LOCK.UPDATE });
      if (!tx) {
        throw new ErrorsUtil.ResourceNotFoundError('Transaction not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (tx.refundRequestedAt == null || tx.status !== 'pending') {
        throw new ErrorsUtil.InputValidationError('No pending refund request for this payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if ((tx.entryType ?? 'income') !== 'income') {
        throw new ErrorsUtil.InputValidationError('Only payment (income) rows can be refunded here.', HttpStatusCodesUtil.BAD_REQUEST);
      }

      const dup = await FinanceTransaction.findOne({
        where: { providerRef: `booking-refund:payment:${tx.id}` },
        transaction,
      });
      if (dup) {
        throw new ErrorsUtil.ConflictError('This payment has already been refunded in the ledger.', HttpStatusCodesUtil.CONFLICT);
      }

      const paidCap = Number(tx.grossAmd);
      const requested =
        refundAmountAmd !== undefined && refundAmountAmd !== null
          ? Math.floor(Number(refundAmountAmd))
          : paidCap;
      if (!Number.isFinite(requested) || requested <= 0) {
        throw new ErrorsUtil.InputValidationError('Refund amount must be a positive integer (AMD).', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (requested > paidCap) {
        throw new ErrorsUtil.InputValidationError(
          'Refund amount cannot exceed the original payment amount.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }

      const bookingIdNorm = tx.bookingId ?? null;
      if (bookingIdNorm != null) {
        await FinanceService.normalizeLegacyRefundedIncomeRowsForBooking(bookingIdNorm, transaction);
      }

      const channel = tx.channel as FinanceTxChannel;
      const method = tx.method as FinanceTxMethod;

      await FinanceService.create({
        customer: tx.customer.trim() || 'Student',
        email: (tx.email ?? '').trim(),
        description: `Refund · approved request · payment #${tx.id}`,
        branchId: tx.branchId,
        channel,
        method,
        grossAmd: requested,
        feeAmd: 0,
        status: 'completed',
        providerRef: `booking-refund:payment:${tx.id}`,
        source: 'system',
        entryType: 'expense',
        expenseKind: 'booking_refund',
        bookingId: bookingIdNorm,
        relatedPaymentTransactionId: tx.id,
        transaction,
      });

      await tx.update(
        {
          status: 'completed',
          refundReviewedAt: new Date(),
          refundRequestedAt: null,
        },
        { transaction },
      );
      await tx.reload({ transaction });
      void this.sendTransactionEmail(tx, 'refund_approved', 'Վերադարձի հարցումը հաստատվել է։').catch(() => {});
      return toDto(tx);
    });
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
