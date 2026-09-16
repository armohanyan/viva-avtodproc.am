import { Op, type WhereOptions } from 'sequelize';
import type { DirectorOptionCategory } from '../constants/director-option-category';
import {
  DIRECTOR_OPTION_CATEGORIES,
  DIRECTOR_OPTION_DEFAULTS,
} from '../constants/director-option-category';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import {
  directorCashDirectionFromAmount,
  directorCashEntryType,
  directorCashSignedAmount,
  type DirectorCashDirection,
} from '../constants/director-cash-direction';
import { DirectorCashEntry } from '../models/director-cash-entry.model';
import { DirectorExpense } from '../models/director-expense.model';
import { DirectorFuel } from '../models/director-fuel.model';
import { DirectorInstructorHours } from '../models/director-instructor-hours.model';
import { DirectorKm } from '../models/director-km.model';
import { DirectorOption } from '../models/director-option.model';
import { DirectorRepair } from '../models/director-repair.model';
import { DirectorRevenue } from '../models/director-revenue.model';
import { DirectorSalary } from '../models/director-salary.model';
import { FinanceTransaction } from '../models/finance-transaction.model';
import { FleetCar } from '../models/fleet-car.model';
import { User } from '../models/user.model';
import { Booking } from '../models/booking.model';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import {
  fetchCashBookingRevenues,
  fetchLegacyExpenses,
  fetchLegacyFuel,
  fetchLegacyInstructorHours,
  fetchLegacyKm,
  fetchLegacyRepairs,
  fetchLegacyRevenues,
  fetchLegacySalaries,
  mergeDirectorRows,
  mergeDirectorRowsPreferManual,
  type CashBookingRevenueRow,
  type LegacyDirectorFuelRow,
  type LegacyDirectorInstructorHoursRow,
  type LegacyDirectorKmRow,
} from '../helpers/director-legacy.helper';

const { ResourceNotFoundError } = ErrorsUtil;

const YEREVAN_OFFSET = '+04:00';
/** Inclusive lower bound when summing cash balance through the selected day. */
const CASH_BALANCE_START_DATE = '2000-01-01';

type DateRange = { startDate: string; endDate: string; branchId?: number | null };

function yerevanRangeBounds(startDate: string, endDate: string): { startAt: Date; endAt: Date } {
  return {
    startAt: new Date(`${startDate}T00:00:00${YEREVAN_OFFSET}`),
    endAt: new Date(`${endDate}T23:59:59.999${YEREVAN_OFFSET}`),
  };
}

function financeTxInYerevanRange(
  tx: FinanceTransaction,
  startAt: Date,
  endAt: Date,
): boolean {
  const raw = (tx as unknown as { createdAt?: Date | string }).createdAt;
  const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
  return d != null && d >= startAt && d <= endAt;
}

function dateWhere(range: DateRange): WhereOptions {
  const base: WhereOptions = {
    date: { [Op.between]: [range.startDate, range.endDate] },
  };
  if (range.branchId != null) {
    return {
      ...base,
      [Op.or]: [{ branchId: range.branchId }, { branchId: null }],
    };
  }
  return base;
}

function cashBranchWhere(branchId?: number | null): WhereOptions {
  if (branchId == null) return {};
  return { [Op.or]: [{ branchId }, { branchId: null }] };
}

function yerevanDateIso(value: Date | string | null | undefined): string | null {
  const d = value instanceof Date ? value : value ? new Date(value) : null;
  if (d == null || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Yerevan local `YYYY-MM-DD HH:mm:ss` for cash ledger display/sort. */
function yerevanDateTimeIso(value: Date | string | null | undefined): string | null {
  const d = value instanceof Date ? value : value ? new Date(value) : null;
  if (d == null || Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  const h = get('hour');
  const min = get('minute');
  const s = get('second');
  if (!y || !m || !day) return null;
  return `${y}-${m}-${day} ${h || '00'}:${min || '00'}:${s || '00'}`;
}

function occurredAtFromDateOnly(dateIso: string, createdAt?: Date | string | null): string {
  const fromCreated = yerevanDateTimeIso(createdAt ?? null);
  if (fromCreated && fromCreated.slice(0, 10) === dateIso.slice(0, 10)) return fromCreated;
  return `${dateIso.slice(0, 10)} 00:00:00`;
}

type CashLedgerPaymentMethod = 'card' | 'cash';

type CashLedgerRow = {
  id: number;
  source: 'manual' | 'finance' | 'expense' | 'fuel' | 'repair';
  sourceId: number;
  readOnly: boolean;
  /** Calendar day in Yerevan (`YYYY-MM-DD`) used for day filters. */
  date: string;
  /** Full payment/event time in Yerevan (`YYYY-MM-DD HH:mm:ss`). */
  occurredAt: string;
  branchId: number | null;
  direction: DirectorCashDirection;
  paymentMethod: CashLedgerPaymentMethod;
  amount: number;
  comment: string | null;
  performedByUserId: number | null;
  performedByName: string | null;
};

function normalizeCashLedgerPayment(raw: unknown): CashLedgerPaymentMethod {
  return raw === 'cash' ? 'cash' : 'card';
}

function serializeManualCashEntry(row: {
  id: number;
  date: string;
  branchId: number | null;
  amount: number;
  comment: string | null;
  createdByUserId?: number | null;
  createdAt?: Date | string | null;
}): CashLedgerRow {
  const signed = num(row.amount);
  const performedByUserId =
    row.createdByUserId != null && Number.isFinite(Number(row.createdByUserId)) && Number(row.createdByUserId) > 0
      ? Number(row.createdByUserId)
      : null;
  const date = row.date.slice(0, 10);
  return {
    id: row.id,
    source: 'manual',
    sourceId: row.id,
    readOnly: false,
    date,
    occurredAt: occurredAtFromDateOnly(date, row.createdAt ?? null),
    branchId: row.branchId,
    direction: directorCashDirectionFromAmount(signed),
    paymentMethod: 'cash',
    amount: Math.abs(signed),
    comment: row.comment,
    performedByUserId,
    performedByName: null,
  };
}

function serializeFinanceCashTx(tx: FinanceTransaction): CashLedgerRow | null {
  const createdRaw = (tx as unknown as { createdAt?: Date | string }).createdAt;
  const date = yerevanDateIso(createdRaw);
  const occurredAt = yerevanDateTimeIso(createdRaw);
  if (!date || !occurredAt) return null;
  const amount = Math.abs(num(tx.grossAmd));
  if (amount <= 0) return null;
  const direction: DirectorCashDirection = tx.entryType === 'expense' ? 'out' : 'in';
  const customer = (tx.customer ?? '').trim();
  const description = (tx.description ?? '').trim();
  const comment = [customer, description].filter(Boolean).join(' · ') || null;
  const performedByUserId =
    tx.createdByUserId != null && Number.isFinite(Number(tx.createdByUserId)) && Number(tx.createdByUserId) > 0
      ? Number(tx.createdByUserId)
      : null;
  return {
    id: -tx.id,
    source: 'finance',
    sourceId: tx.id,
    readOnly: true,
    date,
    occurredAt,
    branchId: tx.branchId ?? null,
    direction,
    paymentMethod: normalizeCashLedgerPayment(tx.method),
    amount,
    comment,
    performedByUserId,
    performedByName: null,
  };
}

/** Paid / partial booking income fallback when no finance transaction exists yet. */
function serializeBookingSlotCashRevenue(row: CashBookingRevenueRow): CashLedgerRow | null {
  const amount = Math.abs(num(row.amount));
  if (amount <= 0) return null;
  return {
    id: row.id,
    source: 'finance',
    sourceId: row.bookingId,
    readOnly: true,
    date: row.date,
    occurredAt: row.occurredAt,
    branchId: row.branchId,
    direction: 'in',
    paymentMethod: normalizeCashLedgerPayment(row.paymentMethod),
    amount,
    comment: row.comment?.trim() || 'Դասերի վճարում',
    performedByUserId: row.performedByUserId,
    performedByName: null,
  };
}

function serializeDirectorCashExpense(row: {
  id: number;
  date: string;
  branchId: number | null;
  expType: string;
  amount: number;
  paymentMethod?: string | null;
  comment: string | null;
  createdByUserId?: number | null;
  createdAt?: Date | string | null;
}): CashLedgerRow | null {
  const amount = Math.abs(num(row.amount));
  if (amount <= 0) return null;
  const note = (row.comment ?? '').trim();
  const performedByUserId =
    row.createdByUserId != null && Number.isFinite(Number(row.createdByUserId)) && Number(row.createdByUserId) > 0
      ? Number(row.createdByUserId)
      : null;
  const date = row.date.slice(0, 10);
  return {
    id: -(1_000_000_000 + row.id),
    source: 'expense',
    sourceId: row.id,
    readOnly: true,
    date,
    occurredAt: occurredAtFromDateOnly(date, row.createdAt ?? null),
    branchId: row.branchId,
    direction: 'out',
    paymentMethod: normalizeCashLedgerPayment(row.paymentMethod),
    amount,
    comment: note ? `${row.expType} · ${note}` : row.expType,
    performedByUserId,
    performedByName: null,
  };
}

function serializeDirectorCashFuel(row: {
  id: number;
  date: string;
  fuelType: string;
  amount: number;
  paymentMethod?: string | null;
  createdByUserId?: number | null;
  createdAt?: Date | string | null;
}): CashLedgerRow | null {
  const amount = Math.abs(num(row.amount));
  if (amount <= 0) return null;
  const performedByUserId =
    row.createdByUserId != null && Number.isFinite(Number(row.createdByUserId)) && Number(row.createdByUserId) > 0
      ? Number(row.createdByUserId)
      : null;
  const date = row.date.slice(0, 10);
  return {
    id: -(2_000_000_000 + row.id),
    source: 'fuel',
    sourceId: row.id,
    readOnly: true,
    date,
    occurredAt: occurredAtFromDateOnly(date, row.createdAt ?? null),
    branchId: null,
    direction: 'out',
    paymentMethod: normalizeCashLedgerPayment(row.paymentMethod),
    amount,
    comment: `Վառելիք · ${row.fuelType}`,
    performedByUserId,
    performedByName: null,
  };
}

function serializeDirectorCashRepair(row: {
  id: number;
  date: string;
  workDone: string;
  licensePlate: string | null;
  amount: number;
  paymentMethod?: string | null;
  comment: string | null;
  createdByUserId?: number | null;
  createdAt?: Date | string | null;
}): CashLedgerRow | null {
  const amount = Math.abs(num(row.amount));
  if (amount <= 0) return null;
  const plate = (row.licensePlate ?? '').trim();
  const work = (row.workDone ?? '').trim() || 'Վերանորոգում';
  const note = (row.comment ?? '').trim();
  const parts = [plate ? `Վերանորոգում · ${plate}` : 'Վերանորոգում', work, note].filter(Boolean);
  const performedByUserId =
    row.createdByUserId != null && Number.isFinite(Number(row.createdByUserId)) && Number(row.createdByUserId) > 0
      ? Number(row.createdByUserId)
      : null;
  const date = row.date.slice(0, 10);
  return {
    id: -(3_000_000_000 + row.id),
    source: 'repair',
    sourceId: row.id,
    readOnly: true,
    date,
    occurredAt: occurredAtFromDateOnly(date, row.createdAt ?? null),
    branchId: null,
    direction: 'out',
    paymentMethod: normalizeCashLedgerPayment(row.paymentMethod),
    amount,
    comment: parts.join(' · '),
    performedByUserId,
    performedByName: null,
  };
}

function sortCashLedger(a: CashLedgerRow, b: CashLedgerRow): number {
  const byTime = b.occurredAt.localeCompare(a.occurredAt);
  if (byTime !== 0) return byTime;
  return b.sourceId - a.sourceId;
}

function sumCashDirections(rows: readonly CashLedgerRow[]): {
  periodIn: number;
  periodOut: number;
  periodCashIn: number;
  periodCardIn: number;
  periodCashOut: number;
  periodCardOut: number;
} {
  let periodIn = 0;
  let periodOut = 0;
  let periodCashIn = 0;
  let periodCardIn = 0;
  let periodCashOut = 0;
  let periodCardOut = 0;
  for (const e of rows) {
    if (e.direction === 'out') {
      periodOut += e.amount;
      if (e.paymentMethod === 'cash') periodCashOut += e.amount;
      else periodCardOut += e.amount;
    } else {
      periodIn += e.amount;
      if (e.paymentMethod === 'cash') periodCashIn += e.amount;
      else periodCardIn += e.amount;
    }
  }
  return { periodIn, periodOut, periodCashIn, periodCardIn, periodCashOut, periodCardOut };
}

function signedCashAmount(row: CashLedgerRow): number {
  if (row.paymentMethod !== 'cash') return 0;
  return row.direction === 'out' ? -row.amount : row.amount;
}

function monthsBetween(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  let y = Number(startDate.slice(0, 4));
  let m = Number(startDate.slice(5, 7));
  const endY = Number(endDate.slice(0, 4));
  const endM = Number(endDate.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function monthLabelAm(key: string): string {
  const labels = ['Հնվ', 'Փտվ', 'Մար', 'Ապր', 'Մայ', 'Հուն', 'Հուլ', 'Օգս', 'Սեպ', 'Հոկ', 'Նոյ', 'Դեկ'];
  const m = Number(key.slice(5, 7));
  return `${labels[m - 1] ?? key.slice(5, 7)} ${key.slice(2, 4)}`;
}

function rowJson<T extends { date: string; id: number }>(
  rows: readonly { toJSON: () => T }[],
): T[] {
  return rows.map((r) => r.toJSON());
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumField(rows: readonly { amount?: number; totalAmd?: number }[], key: 'amount' | 'totalAmd'): number {
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0);
}

export default class DirectorService {
  static async ensureDefaultOptions(): Promise<void> {
    for (const category of DIRECTOR_OPTION_CATEGORIES) {
      const defaults = DIRECTOR_OPTION_DEFAULTS[category];
      for (let i = 0; i < defaults.length; i++) {
        const value = defaults[i]!;
        await DirectorOption.findOrCreate({
          where: { category, value },
          defaults: { category, value, sortOrder: i },
        });
      }
    }
  }

  static async listOptions(category: DirectorOptionCategory): Promise<string[]> {
    await this.ensureDefaultOptions();
    const rows = await DirectorOption.findAll({
      where: { category },
      order: [['sortOrder', 'ASC'], ['value', 'ASC']],
    });
    return rows.map((r) => r.value);
  }

  static async addOption(category: DirectorOptionCategory, value: string): Promise<string[]> {
    const trimmed = value.trim();
    if (!trimmed) throw new Error('Value is required');
    await this.ensureDefaultOptions();
    const maxOrder = (await DirectorOption.max('sortOrder', { where: { category } })) as number | null;
    await DirectorOption.findOrCreate({
      where: { category, value: trimmed },
      defaults: { category, value: trimmed, sortOrder: (maxOrder ?? -1) + 1 },
    });
    return this.listOptions(category);
  }

  static async listCash(range: DateRange) {
    const { startAt, endAt } = yerevanRangeBounds(range.startDate, range.endDate);
    const financeBranch =
      range.branchId != null ? { branchId: range.branchId } : {};
    const dateOnly = { date: { [Op.between]: [range.startDate, range.endDate] } };
    const dateUntilEnd = { date: { [Op.lte]: range.endDate } };
    const bookingRevenueBalanceRange: DateRange = {
      startDate: CASH_BALANCE_START_DATE,
      endDate: range.endDate,
      branchId: range.branchId,
    };

    const [
      manualPeriod,
      manualBalance,
      financeTxs,
      expensesPeriod,
      expensesBalance,
      fuelPeriodRows,
      fuelBalanceRows,
      repairPeriodRows,
      repairBalanceRows,
      bookingRevenuesThroughEnd,
    ] = await Promise.all([
      DirectorCashEntry.findAll({
        where: dateWhere(range),
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      DirectorCashEntry.findAll({
        where: {
          date: { [Op.lte]: range.endDate },
          ...cashBranchWhere(range.branchId),
        },
      }),
      FinanceTransaction.findAll({
        where: {
          status: 'completed',
          ...financeBranch,
        },
      }),
      DirectorExpense.findAll({
        where: dateWhere(range),
      }),
      DirectorExpense.findAll({
        where: {
          ...dateUntilEnd,
          ...cashBranchWhere(range.branchId),
        },
      }),
      DirectorFuel.findAll({ where: dateOnly }),
      DirectorFuel.findAll({ where: dateUntilEnd }),
      DirectorRepair.findAll({ where: dateOnly }),
      DirectorRepair.findAll({ where: dateUntilEnd }),
      fetchCashBookingRevenues(bookingRevenueBalanceRange),
    ]);

    const financePeriod: CashLedgerRow[] = [];
    let financeCashBalanceSigned = 0;
    for (const tx of financeTxs) {
      const row = serializeFinanceCashTx(tx);
      if (!row) continue;
      const createdRaw = (tx as unknown as { createdAt?: Date | string }).createdAt;
      const created = createdRaw instanceof Date ? createdRaw : createdRaw ? new Date(createdRaw) : null;
      if (created != null && !Number.isNaN(created.getTime()) && created <= endAt) {
        financeCashBalanceSigned += signedCashAmount(row);
      }
      if (created != null && financeTxInYerevanRange(tx, startAt, endAt)) {
        financePeriod.push(row);
      }
    }

    const bookingPeriodRows = bookingRevenuesThroughEnd
      .filter((r) => r.date >= range.startDate && r.date <= range.endDate)
      .map(serializeBookingSlotCashRevenue)
      .filter((r): r is CashLedgerRow => r != null);
    const bookingCashBalanceIn = bookingRevenuesThroughEnd
      .filter((r) => normalizeCashLedgerPayment(r.paymentMethod) === 'cash')
      .reduce((s, r) => s + Math.abs(num(r.amount)), 0);

    const expensePeriod = expensesPeriod
      .map((r) => serializeDirectorCashExpense(r.toJSON()))
      .filter((r): r is CashLedgerRow => r != null);
    const fuelPeriod = fuelPeriodRows
      .map((r) => serializeDirectorCashFuel(r.toJSON()))
      .filter((r): r is CashLedgerRow => r != null);
    const repairPeriod = repairPeriodRows
      .map((r) => serializeDirectorCashRepair(r.toJSON()))
      .filter((r): r is CashLedgerRow => r != null);

    const expenseCashBalanceOut = expensesBalance
      .filter((r) => normalizeCashLedgerPayment(r.paymentMethod) === 'cash')
      .reduce((s, r) => s + Math.abs(num(r.amount)), 0);
    const fuelCashBalanceOut = fuelBalanceRows
      .filter((r) => normalizeCashLedgerPayment(r.paymentMethod) === 'cash')
      .reduce((s, r) => s + Math.abs(num(r.amount)), 0);
    const repairCashBalanceOut = repairBalanceRows
      .filter((r) => normalizeCashLedgerPayment(r.paymentMethod) === 'cash')
      .reduce((s, r) => s + Math.abs(num(r.amount)), 0);

    const manualPeriodRows = manualPeriod.map((r) => serializeManualCashEntry(r.toJSON()));
    const entries = [
      ...financePeriod,
      ...bookingPeriodRows,
      ...expensePeriod,
      ...fuelPeriod,
      ...repairPeriod,
      ...manualPeriodRows,
    ].sort(sortCashLedger);

    const financeBookingIds = [
      ...new Set(
        financeTxs
          .map((tx) => (tx.bookingId != null ? Number(tx.bookingId) : 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    const bookingCreatorById = new Map<number, number>();
    if (financeBookingIds.length > 0) {
      const linkedBookings = await Booking.findAll({
        where: { id: { [Op.in]: financeBookingIds } },
        attributes: ['id', 'createdByUserId'],
      });
      for (const b of linkedBookings) {
        const uid = b.createdByUserId != null ? Number(b.createdByUserId) : 0;
        if (Number.isFinite(uid) && uid > 0) bookingCreatorById.set(b.id, uid);
      }
    }

    for (const entry of entries) {
      if (entry.performedByUserId != null) continue;
      if (entry.source !== 'finance') continue;
      const tx = financeTxs.find((t) => t.id === entry.sourceId);
      const bookingId = tx?.bookingId != null ? Number(tx.bookingId) : 0;
      if (!Number.isFinite(bookingId) || bookingId <= 0) continue;
      const creatorId = bookingCreatorById.get(bookingId);
      if (creatorId != null) entry.performedByUserId = creatorId;
    }

    const performerIds = [
      ...new Set(
        entries
          .map((e) => e.performedByUserId)
          .filter((id): id is number => id != null && Number.isFinite(id) && id > 0),
      ),
    ];
    if (performerIds.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: performerIds } },
        attributes: ['id', 'name'],
      });
      const nameById = new Map(users.map((u) => [u.id, (u.name ?? '').trim() || `User #${u.id}`]));
      for (const entry of entries) {
        if (entry.performedByUserId == null) continue;
        entry.performedByName = nameById.get(entry.performedByUserId) ?? `User #${entry.performedByUserId}`;
      }
    }

    const totals = sumCashDirections(entries);
    const manualBalanceSigned = manualBalance.reduce((s, r) => s + num(r.amount), 0);
    const balance =
      manualBalanceSigned +
      financeCashBalanceSigned +
      bookingCashBalanceIn -
      expenseCashBalanceOut -
      fuelCashBalanceOut -
      repairCashBalanceOut;

    return {
      entries,
      balance,
      ...totals,
    };
  }

  static async createCash(
    input: {
      date: string;
      branchId: number | null;
      direction: DirectorCashDirection;
      amount: number;
      comment?: string | null;
    },
    createdByUserId?: number,
  ) {
    const row = await DirectorCashEntry.create({
      date: input.date,
      branchId: input.branchId,
      entryType: directorCashEntryType(input.direction),
      amount: directorCashSignedAmount(input.direction, input.amount),
      comment: input.comment ?? null,
      createdByUserId: createdByUserId ?? null,
    });
    return serializeManualCashEntry(row.toJSON());
  }

  static async deleteCash(id: number) {
    if (!(id > 0)) {
      throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const row = await DirectorCashEntry.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateCash(
    id: number,
    input: {
      date: string;
      branchId: number | null;
      direction: DirectorCashDirection;
      amount: number;
      comment?: string | null;
    },
  ) {
    if (!(id > 0)) {
      throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const row = await DirectorCashEntry.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update({
      date: input.date,
      branchId: input.branchId,
      entryType: directorCashEntryType(input.direction),
      amount: directorCashSignedAmount(input.direction, input.amount),
      comment: input.comment ?? null,
    });
    return serializeManualCashEntry(row.toJSON());
  }

  static async listExpenses(range: DateRange) {
    const [directorRows, legacyRows] = await Promise.all([
      DirectorExpense.findAll({
        where: dateWhere(range),
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      fetchLegacyExpenses(range),
    ]);
    return mergeDirectorRows(rowJson(directorRows), legacyRows);
  }

  static async createExpense(
    input: {
      date: string;
      branchId: number | null;
      expType: string;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
      comment?: string | null;
    },
    createdByUserId?: number,
  ) {
    return DirectorExpense.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteExpense(id: number) {
    const row = await DirectorExpense.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateExpense(
    id: number,
    input: {
      date: string;
      branchId: number | null;
      expType: string;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
      comment?: string | null;
    },
  ) {
    const row = await DirectorExpense.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
  }

  static async listRepairs(range: Omit<DateRange, 'branchId'>) {
    const [directorRows, legacyRows] = await Promise.all([
      DirectorRepair.findAll({
        where: { date: { [Op.between]: [range.startDate, range.endDate] } },
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      fetchLegacyRepairs(range),
    ]);
    return mergeDirectorRows(rowJson(directorRows), legacyRows);
  }

  static async createRepair(
    input: {
      date: string;
      carId?: number | null;
      licensePlate?: string | null;
      workDone: string;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
      comment?: string | null;
    },
    createdByUserId?: number,
  ) {
    return DirectorRepair.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteRepair(id: number) {
    const row = await DirectorRepair.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateRepair(
    id: number,
    input: {
      date: string;
      carId?: number | null;
      licensePlate?: string | null;
      workDone: string;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
      comment?: string | null;
    },
  ) {
    const row = await DirectorRepair.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
  }

  static async listFuel(range: Omit<DateRange, 'branchId'> & { branchId?: number | null }) {
    const [directorRows, legacyRows] = await Promise.all([
      DirectorFuel.findAll({
        where: { date: { [Op.between]: [range.startDate, range.endDate] } },
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      fetchLegacyFuel(range),
    ]);
    return mergeDirectorRows<LegacyDirectorFuelRow>(
      rowJson(directorRows) as LegacyDirectorFuelRow[],
      legacyRows,
    ).map((row) => ({
      ...row,
      liters: num(row.liters),
      amount: num(row.amount),
    }));
  }

  static async createFuel(
    input: {
      date: string;
      instructorUserId: number | null;
      carId?: number | null;
      fuelType: string;
      liters: number;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
    },
    createdByUserId?: number,
  ) {
    return DirectorFuel.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteFuel(id: number) {
    const row = await DirectorFuel.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateFuel(
    id: number,
    input: {
      date: string;
      instructorUserId: number | null;
      carId?: number | null;
      fuelType: string;
      liters: number;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
    },
  ) {
    const row = await DirectorFuel.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
  }

  static async listKm(range: Omit<DateRange, 'branchId'> & { branchId?: number | null }) {
    const [directorRows, legacyRows] = await Promise.all([
      DirectorKm.findAll({
        where: { date: { [Op.between]: [range.startDate, range.endDate] } },
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      fetchLegacyKm(range),
    ]);
    return mergeDirectorRowsPreferManual<LegacyDirectorKmRow>(
      rowJson(directorRows) as LegacyDirectorKmRow[],
      legacyRows,
    ).map((row) => ({
      ...row,
      km: num(row.km),
    }));
  }

  static async createKm(
    input: { date: string; instructorUserId: number | null; km: number; comment?: string | null },
    createdByUserId?: number,
  ) {
    return DirectorKm.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteKm(id: number) {
    const row = await DirectorKm.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateKm(
    id: number,
    input: { date: string; instructorUserId: number | null; km: number; comment?: string | null },
  ) {
    const row = await DirectorKm.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
  }

  static async listInstructorHours(range: Omit<DateRange, 'branchId'> & { branchId?: number | null }) {
    const [directorRows, legacyRows] = await Promise.all([
      DirectorInstructorHours.findAll({
        where: { date: { [Op.between]: [range.startDate, range.endDate] } },
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      fetchLegacyInstructorHours(range),
    ]);
    return mergeDirectorRowsPreferManual<LegacyDirectorInstructorHoursRow>(
      rowJson(directorRows) as LegacyDirectorInstructorHoursRow[],
      legacyRows,
    ).map((row) => ({
      ...row,
      hours: Math.round(num(row.hours)),
    }));
  }

  static async createInstructorHours(
    input: { date: string; instructorUserId: number | null; hours: number; comment?: string | null },
    createdByUserId?: number,
  ) {
    return DirectorInstructorHours.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteInstructorHours(id: number) {
    const row = await DirectorInstructorHours.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateInstructorHours(
    id: number,
    input: { date: string; instructorUserId: number | null; hours: number; comment?: string | null },
  ) {
    const row = await DirectorInstructorHours.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
  }

  static async listSalaries(range: Omit<DateRange, 'branchId'>) {
    const [directorRows, legacyRows] = await Promise.all([
      DirectorSalary.findAll({
        where: { date: { [Op.between]: [range.startDate, range.endDate] } },
        order: [['date', 'DESC'], ['id', 'DESC']],
      }),
      fetchLegacySalaries(range),
    ]);
    return mergeDirectorRows(rowJson(directorRows), legacyRows);
  }

  static async createSalary(
    input: {
      date: string;
      name: string;
      role: string;
      hours?: number | null;
      hourlyRate?: number | null;
      totalAmd: number;
      comment?: string | null;
    },
    createdByUserId?: number,
  ) {
    return DirectorSalary.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteSalary(id: number) {
    const row = await DirectorSalary.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateSalary(
    id: number,
    input: {
      date: string;
      name: string;
      role: string;
      hours?: number | null;
      hourlyRate?: number | null;
      totalAmd: number;
      comment?: string | null;
    },
  ) {
    const row = await DirectorSalary.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
  }

  static async listRevenues(range: DateRange & { isLegacy?: boolean }) {
    const where: WhereOptions = { ...dateWhere(range) };
    if (range.isLegacy != null) Object.assign(where, { isLegacy: range.isLegacy });
    return DirectorRevenue.findAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
  }

  static async createRevenue(
    input: {
      date: string;
      branchId: number;
      amount: number;
      paymentMethod: DirectorPaymentMethod;
      isLegacy?: boolean;
      comment?: string | null;
    },
    createdByUserId?: number,
  ) {
    return DirectorRevenue.create({
      ...input,
      isLegacy: input.isLegacy ?? false,
      createdByUserId: createdByUserId ?? null,
    });
  }

  static async deleteRevenue(id: number) {
    const row = await DirectorRevenue.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async dashboard(range: DateRange) {
    const dateFilter = { date: { [Op.between]: [range.startDate, range.endDate] } };
    const cashExpenseWhere = dateWhere(range);
    const revenueBranchFilter = range.branchId != null ? { branchId: range.branchId } : {};
    const { startAt, endAt } = yerevanRangeBounds(range.startDate, range.endDate);

    const [
      revenues,
      legacyManualRevenues,
      legacyBookingRevenues,
      expenses,
      fuel,
      salaries,
      instructorHours,
      financeTxs,
      legacyExpenses,
      legacyFuel,
      legacySalaries,
      legacyInstructorHours,
    ] = await Promise.all([
      DirectorRevenue.findAll({ where: { ...dateFilter, isLegacy: false, ...revenueBranchFilter } }),
      DirectorRevenue.findAll({ where: { ...dateFilter, isLegacy: true, ...revenueBranchFilter } }),
      fetchLegacyRevenues(range),
      DirectorExpense.findAll({ where: cashExpenseWhere }),
      DirectorFuel.findAll({ where: dateFilter }),
      DirectorSalary.findAll({ where: dateFilter }),
      DirectorInstructorHours.findAll({ where: dateFilter }),
      FinanceTransaction.findAll({
        where: {
          entryType: 'income',
          status: 'completed',
          ...(range.branchId != null ? { branchId: range.branchId } : {}),
        },
      }),
      fetchLegacyExpenses(range),
      fetchLegacyFuel(range),
      fetchLegacySalaries(range),
      fetchLegacyInstructorHours(range),
    ]);

    const financeTxsInRange = financeTxs.filter((tx) => financeTxInYerevanRange(tx, startAt, endAt));
    const nonBookingFinanceTxs = financeTxsInRange.filter(
      (tx) => tx.bookingId == null || tx.bookingId <= 0,
    );

    const directorRevenueTotal =
      sumField(revenues, 'amount') +
      sumField(legacyManualRevenues, 'amount') +
      legacyBookingRevenues.reduce((s, r) => s + r.amount, 0);
    const nonBookingFinanceTotal = nonBookingFinanceTxs.reduce((s, tx) => s + num(tx.grossAmd), 0);
    const totalRevenue = directorRevenueTotal + nonBookingFinanceTotal;

    const cardFromTx = nonBookingFinanceTxs
      .filter((tx) => tx.method === 'card' || tx.method === 'idram')
      .reduce((s, tx) => s + num(tx.grossAmd), 0);
    const cashFromTx = nonBookingFinanceTxs
      .filter((tx) => tx.method === 'cash')
      .reduce((s, tx) => s + num(tx.grossAmd), 0);
    const cardFromDirector = [...revenues, ...legacyManualRevenues, ...legacyBookingRevenues]
      .filter((r) => r.paymentMethod === 'card')
      .reduce((s, r) => s + r.amount, 0);
    const cashFromDirector = [...revenues, ...legacyManualRevenues, ...legacyBookingRevenues]
      .filter((r) => r.paymentMethod === 'cash')
      .reduce((s, r) => s + r.amount, 0);

    const totalExpense =
      sumField(expenses, 'amount') + legacyExpenses.reduce((s, e) => s + e.amount, 0);
    const fuelTotal = sumField(fuel, 'amount') + legacyFuel.reduce((s, f) => s + f.amount, 0);
    const salaryTotal =
      sumField(salaries, 'totalAmd') + legacySalaries.reduce((s, r) => s + r.totalAmd, 0);
    const mergedInstructorHours = mergeDirectorRowsPreferManual(
      rowJson(instructorHours) as LegacyDirectorInstructorHoursRow[],
      legacyInstructorHours,
    );
    const instructorHoursTotal = mergedInstructorHours.reduce((s, h) => s + num(h.hours), 0);
    const instructorSalaryTotal =
      salaries.filter((s) => s.role === 'Հրահանգիչ').reduce((acc, s) => acc + s.totalAmd, 0) +
      legacySalaries
        .filter((s) => s.role === 'Հրահանգիչ')
        .reduce((acc, s) => acc + s.totalAmd, 0);
    const fuelLiters =
      fuel.reduce((s, f) => s + Number(f.liters), 0) +
      legacyFuel.reduce((s, f) => s + Number(f.liters), 0);

    const netProfit = totalRevenue - totalExpense - fuelTotal - salaryTotal;

    return {
      totalRevenue,
      cardPos: cardFromTx + cardFromDirector,
      cash: cashFromTx + cashFromDirector,
      netProfit,
      totalExpense,
      fuel: fuelTotal,
      salaryTotal,
      instructorHours: instructorHoursTotal,
      instructorSalary: instructorSalaryTotal,
      fuelLiters,
    };
  }

  static async driverProfile(range: DateRange & { instructorUserId: number }) {
    const dateFilter = { date: { [Op.between]: [range.startDate, range.endDate] } };
    const instructorId = range.instructorUserId;

    const [hours, kmRows, fuelRows, legacyHours, legacyKm, legacyFuel] = await Promise.all([
      DirectorInstructorHours.findAll({ where: { ...dateFilter, instructorUserId: instructorId } }),
      DirectorKm.findAll({ where: { ...dateFilter, instructorUserId: instructorId } }),
      DirectorFuel.findAll({ where: { ...dateFilter, instructorUserId: instructorId } }),
      fetchLegacyInstructorHours(range),
      fetchLegacyKm(range),
      fetchLegacyFuel(range),
    ]);

    const mergedHours = mergeDirectorRowsPreferManual(
      rowJson(hours) as LegacyDirectorInstructorHoursRow[],
      legacyHours.filter((h) => h.instructorUserId === instructorId),
    );
    const mergedKm = mergeDirectorRowsPreferManual(
      rowJson(kmRows) as LegacyDirectorKmRow[],
      legacyKm.filter((k) => k.instructorUserId === instructorId),
    );
    const mergedFuel = [
      ...fuelRows.map((f) => f.toJSON()),
      ...legacyFuel.filter((f) => f.instructorUserId === instructorId),
    ];

    const days = new Map<
      string,
      {
        date: string;
        hours: number;
        km: number;
        gasLiters: number;
        petrolLiters: number;
        totalLiters: number;
        amount: number;
        card: number;
        cash: number;
      }
    >();

    const ensureDay = (date: string) => {
      if (!days.has(date)) {
        days.set(date, {
          date,
          hours: 0,
          km: 0,
          gasLiters: 0,
          petrolLiters: 0,
          totalLiters: 0,
          amount: 0,
          card: 0,
          cash: 0,
        });
      }
      return days.get(date)!;
    };

    for (const h of mergedHours) {
      const d = ensureDay(h.date);
      d.hours += num(h.hours);
    }
    for (const k of mergedKm) {
      const d = ensureDay(k.date);
      d.km += num(k.km);
    }
    for (const f of mergedFuel) {
      const d = ensureDay(f.date);
      const liters = num(f.liters);
      const amount = num(f.amount);
      d.totalLiters += liters;
      d.amount += amount;
      if (f.fuelType.includes('Գազ')) d.gasLiters += liters;
      else d.petrolLiters += liters;
      if (f.paymentMethod === 'card') d.card += amount;
      else d.cash += amount;
    }

    const rows = [...days.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((d) => {
        const hours = Math.round(d.hours);
        const lPer100 = d.km > 0 ? (d.totalLiters / d.km) * 100 : 0;
        const amdPerKm = d.km > 0 ? d.amount / d.km : 0;
        const kmPerHour = hours > 0 ? d.km / hours : 0;
        return { ...d, hours, lPer100, amdPerKm, kmPerHour };
      });

    const summary = {
      hours: rows.reduce((s, r) => s + r.hours, 0),
      km: rows.reduce((s, r) => s + r.km, 0),
      liters: rows.reduce((s, r) => s + r.totalLiters, 0),
      amount: rows.reduce((s, r) => s + r.amount, 0),
    };

    const instructor = await User.findByPk(instructorId, { attributes: ['id', 'name'] });

    return { instructorName: instructor?.name ?? '', summary, rows };
  }

  static async monthlyReport(range: DateRange) {
    const months = monthsBetween(range.startDate, range.endDate);
    const revenueByMonth = new Map<string, number>(months.map((m) => [m, 0]));
    const expensesByMonth = new Map<string, number>(months.map((m) => [m, 0]));
    const fuelByMonth = new Map<string, number>(months.map((m) => [m, 0]));
    const salaryByMonth = new Map<string, number>(months.map((m) => [m, 0]));

    const bump = (map: Map<string, number>, dateIso: string, amount: number) => {
      const key = dateIso.slice(0, 7);
      if (!map.has(key)) return;
      map.set(key, (map.get(key) ?? 0) + amount);
    };

    const dateFilter = { date: { [Op.between]: [range.startDate, range.endDate] } };
    const cashExpenseWhere = dateWhere(range);
    const revenueBranchFilter = range.branchId != null ? { branchId: range.branchId } : {};
    const { startAt, endAt } = yerevanRangeBounds(range.startDate, range.endDate);

    const [revenues, legacyBookingRevenues, expenses, fuel, salaries, financeTxs, legacyExpenses, legacyFuel, legacySalaries] =
      await Promise.all([
        DirectorRevenue.findAll({ where: { ...dateFilter, ...revenueBranchFilter } }),
        fetchLegacyRevenues(range),
        DirectorExpense.findAll({ where: cashExpenseWhere }),
        DirectorFuel.findAll({ where: dateFilter }),
        DirectorSalary.findAll({ where: dateFilter }),
        FinanceTransaction.findAll({
          where: {
            entryType: 'income',
            status: 'completed',
            ...(range.branchId != null ? { branchId: range.branchId } : {}),
          },
        }),
        fetchLegacyExpenses(range),
        fetchLegacyFuel(range),
        fetchLegacySalaries(range),
      ]);

    for (const r of revenues) bump(revenueByMonth, r.date, r.amount);
    for (const r of legacyBookingRevenues) bump(revenueByMonth, r.date, r.amount);
    for (const e of expenses) bump(expensesByMonth, e.date, e.amount);
    for (const e of legacyExpenses) bump(expensesByMonth, e.date, e.amount);
    for (const f of fuel) bump(fuelByMonth, f.date, f.amount);
    for (const f of legacyFuel) bump(fuelByMonth, f.date, f.amount);
    for (const s of salaries) bump(salaryByMonth, s.date, s.totalAmd);
    for (const s of legacySalaries) bump(salaryByMonth, s.date, s.totalAmd);

    for (const tx of financeTxs) {
      if (tx.bookingId != null && tx.bookingId > 0) continue;
      if (!financeTxInYerevanRange(tx, startAt, endAt)) continue;
      const raw = (tx as unknown as { createdAt?: Date | string }).createdAt;
      const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      if (d == null) continue;
      bump(revenueByMonth, d.toISOString().slice(0, 10), num(tx.grossAmd));
    }

    const labels = months.map(monthLabelAm);
    const revenue = months.map((m) => revenueByMonth.get(m) ?? 0);
    const expenseTotals = months.map((m) => expensesByMonth.get(m) ?? 0);
    const fuelTotals = months.map((m) => fuelByMonth.get(m) ?? 0);
    const salaryTotals = months.map((m) => salaryByMonth.get(m) ?? 0);
    const netProfit = months.map(
      (_, i) => (revenue[i] ?? 0) - (expenseTotals[i] ?? 0) - (fuelTotals[i] ?? 0) - (salaryTotals[i] ?? 0),
    );

    return { labels, revenue, expenses: expenseTotals, fuel: fuelTotals, salary: salaryTotals, netProfit };
  }

  static async expenseChart(range: DateRange) {
    const [expenses, legacyExpenses] = await Promise.all([
      DirectorExpense.findAll({ where: dateWhere(range) }),
      fetchLegacyExpenses(range),
    ]);
    const byType = new Map<string, number>();
    for (const e of expenses) {
      byType.set(e.expType, (byType.get(e.expType) ?? 0) + e.amount);
    }
    for (const e of legacyExpenses) {
      byType.set(e.expType, (byType.get(e.expType) ?? 0) + e.amount);
    }
    return [...byType.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  static async revenueChart(range: DateRange & { isLegacy?: boolean }) {
    const revenues = await this.listRevenues(range);
    const byMonth = new Map<string, number>();
    for (const r of revenues) {
      const month = r.date.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + r.amount);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }

  static async listCarsForSelect(): Promise<{ id: number; label: string }[]> {
    const cars = await FleetCar.findAll({ order: [['plate', 'ASC']] });
    return cars.map((c) => ({ id: c.id, label: c.plate || c.model || `#${c.id}` }));
  }
}
