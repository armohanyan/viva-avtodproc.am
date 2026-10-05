import { Op, UniqueConstraintError } from 'sequelize';
import {
  directorCashEntryType,
  directorCashSignedAmount,
  type DirectorCashDirection,
} from '../constants/director-cash-direction';
import { sequelize } from '../database/sequelize';
import { Branch } from '../models/branch.model';
import { CashShift } from '../models/cash-shift.model';
import { DirectorCashEntry } from '../models/director-cash-entry.model';
import { User } from '../models/user.model';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import DirectorService, { type CashLedgerRow } from './director.service';

const { ConflictError, InputValidationError, ResourceNotFoundError } = ErrorsUtil;

const YEREVAN_OFFSET = '+04:00';

export type CashShiftSummary = {
  id: number;
  adminId: number;
  adminName: string;
  branchId: number;
  branchName: string;
  status: 'OPEN' | 'CLOSED';
  openingBalance: number;
  cashInTotal: number;
  cashOutTotal: number;
  cardInTotal: number;
  cardOutTotal: number;
  expectedBalance: number;
  actualBalance: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
};

export type CashShiftLine = {
  id: number;
  source: CashLedgerRow['source'];
  sourceId: number;
  shiftId: number | null;
  editable: boolean;
  date: string;
  occurredAt: string;
  direction: DirectorCashDirection;
  paymentMethod: 'cash' | 'card';
  amount: number;
  comment: string | null;
  performedByName: string | null;
  countsTowardExpected: boolean;
  unassigned: boolean;
};

export type CashShiftDetail = {
  shift: CashShiftSummary;
  entries: CashShiftLine[];
};

export type CashRegisterMethodTotals = {
  cash: number;
  card: number;
  total: number;
  paymentCount: number;
};

export type CashRegisterManagerRow = CashRegisterMethodTotals & {
  managerName: string;
  branchId: number | null;
  branchName: string;
};

export type CashRegisterBranchRow = CashRegisterMethodTotals & {
  branchId: number | null;
  branchName: string;
};

export type CashRegisterPeriodEntry = {
  id: number;
  source: CashLedgerRow['source'];
  sourceId: number;
  readOnly: boolean;
  date: string;
  occurredAt: string;
  branchId: number | null;
  branchName: string;
  direction: DirectorCashDirection;
  paymentMethod: 'cash' | 'card';
  amount: number;
  comment: string | null;
  performedByName: string | null;
};

export type CashRegisterPeriodSummary = {
  /** Cumulative cash balance through end date (same as director Կասսա `balance`). */
  balance: number;
  totals: {
    periodIn: number;
    periodOut: number;
    periodCashIn: number;
    periodCardIn: number;
    periodCashOut: number;
    periodCardOut: number;
  };
  byManager: CashRegisterManagerRow[];
  byBranch: CashRegisterBranchRow[];
  entries: CashRegisterPeriodEntry[];
};

function yerevanStamp(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')} ${hour || '00'}:${get('minute') || '00'}:${get('second') || '00'}`;
}

function yerevanDay(value: Date): string {
  return yerevanStamp(value).slice(0, 10);
}

function parseStamp(stamp: string): Date {
  return new Date(`${stamp.replace(' ', 'T')}${YEREVAN_OFFSET}`);
}

function rangeBounds(startDate: string, endDate: string): { startAt: Date; endAt: Date } {
  return {
    startAt: new Date(`${startDate}T00:00:00${YEREVAN_OFFSET}`),
    endAt: new Date(`${endDate}T23:59:59.999${YEREVAN_OFFSET}`),
  };
}

type DrawerTotals = {
  cashIn: number;
  cashOut: number;
  cardIn: number;
  cardOut: number;
  expected: number;
};

function totalsFromLines(openingBalance: number, lines: readonly CashShiftLine[]): DrawerTotals {
  let cashIn = 0;
  let cashOut = 0;
  let cardIn = 0;
  let cardOut = 0;
  for (const line of lines) {
    if (line.unassigned) continue;
    if (line.paymentMethod === 'card') {
      if (line.direction === 'out') cardOut += line.amount;
      else cardIn += line.amount;
      continue;
    }
    if (!line.countsTowardExpected) continue;
    if (line.direction === 'out') cashOut += line.amount;
    else cashIn += line.amount;
  }
  return {
    cashIn,
    cashOut,
    cardIn,
    cardOut,
    expected: openingBalance + cashIn - cashOut,
  };
}

async function namesFor(shifts: readonly CashShift[]): Promise<{
  adminName: Map<number, string>;
  branchName: Map<number, string>;
}> {
  const adminIds = [...new Set(shifts.map((s) => s.adminId))];
  const branchIds = [...new Set(shifts.map((s) => s.branchId))];
  const [users, branches] = await Promise.all([
    adminIds.length
      ? User.findAll({ where: { id: { [Op.in]: adminIds } }, attributes: ['id', 'name'] })
      : [],
    branchIds.length
      ? Branch.findAll({ where: { id: { [Op.in]: branchIds } }, attributes: ['id', 'name'] })
      : [],
  ]);
  return {
    adminName: new Map(users.map((u) => [u.id, (u.name ?? '').trim() || `User #${u.id}`])),
    branchName: new Map(branches.map((b) => [b.id, b.name])),
  };
}

function toSummary(
  shift: CashShift,
  adminName: string,
  branchName: string,
  live: DrawerTotals | null,
): CashShiftSummary {
  const closedSnapshot = shift.status === 'CLOSED' && shift.expectedBalance != null;
  const cashInTotal = closedSnapshot ? (shift.cashInTotal ?? 0) : (live?.cashIn ?? 0);
  const cashOutTotal = closedSnapshot ? (shift.cashOutTotal ?? 0) : (live?.cashOut ?? 0);
  const expectedBalance = closedSnapshot ? shift.expectedBalance! : (live?.expected ?? shift.openingBalance);
  const actualBalance = shift.actualBalance ?? null;
  return {
    id: shift.id,
    adminId: shift.adminId,
    adminName,
    branchId: shift.branchId,
    branchName,
    status: shift.status,
    openingBalance: shift.openingBalance,
    cashInTotal,
    cashOutTotal,
    cardInTotal: live?.cardIn ?? 0,
    cardOutTotal: live?.cardOut ?? 0,
    expectedBalance,
    actualBalance,
    difference: actualBalance != null ? actualBalance - expectedBalance : null,
    openedAt: new Date(shift.openedAt).toISOString(),
    closedAt: shift.closedAt ? new Date(shift.closedAt).toISOString() : null,
  };
}

async function attributeLines(shift: CashShift, rows: CashLedgerRow[]): Promise<CashShiftLine[]> {
  const fuelRepair = rows.filter((r) => r.source === 'fuel' || r.source === 'repair');
  const rest = rows.filter((r) => r.source !== 'fuel' && r.source !== 'repair');
  let covers: CashShift[] = [];
  if (fuelRepair.length > 0) {
    const stamps = fuelRepair.map((r) => parseStamp(r.occurredAt).getTime()).filter((n) => Number.isFinite(n));
    const min = new Date(Math.min(...stamps));
    const max = new Date(Math.max(...stamps));
    covers = await CashShift.findAll({
      where: {
        openedAt: { [Op.lte]: max },
        [Op.or]: [{ closedAt: null }, { closedAt: { [Op.gte]: min } }],
      },
      attributes: ['id', 'openedAt', 'closedAt'],
    });
  }

  const toLine = (row: CashLedgerRow, unassigned: boolean): CashShiftLine => ({
    id: row.sourceId,
    source: row.source,
    sourceId: row.sourceId,
    shiftId: row.shiftId,
    editable: shift.status === 'OPEN' && row.source === 'manual' && row.shiftId === shift.id,
    date: row.date,
    occurredAt: row.occurredAt,
    direction: row.direction,
    paymentMethod: row.paymentMethod,
    amount: row.amount,
    comment: row.comment,
    performedByName: row.performedByName,
    unassigned,
    countsTowardExpected: !unassigned && row.paymentMethod === 'cash',
  });

  const lines = rest.map((row) => toLine(row, false));
  for (const row of fuelRepair) {
    const ts = parseStamp(row.occurredAt).getTime();
    const owners = covers.filter((s) => {
      const open = new Date(s.openedAt).getTime();
      const close = s.closedAt ? new Date(s.closedAt).getTime() : Date.now();
      return open <= ts && ts <= close;
    });
    if (owners.length === 1 && owners[0]!.id !== shift.id) continue;
    lines.push(toLine(row, owners.length !== 1));
  }
  lines.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.sourceId - a.sourceId);
  return lines;
}

async function linesForShift(shift: CashShift, endAt: Date): Promise<CashShiftLine[]> {
  /** Same calendar-day scope as director Կասսա (not time-of-day after «Բացել գրաֆիկ»). */
  const rows = await DirectorService.periodEntries({
    startDate: yerevanDay(new Date(shift.openedAt)),
    endDate: yerevanDay(endAt),
    branchId: shift.branchId,
  });
  const scoped = rows.filter((r) => {
    if (r.source === 'fuel' || r.source === 'repair') return true;
    return r.branchId === shift.branchId;
  });
  return attributeLines(shift, scoped);
}

async function requireShift(id: number): Promise<CashShift> {
  if (!(id > 0)) throw new ResourceNotFoundError('Shift not found', HttpStatusCodesUtil.NOT_FOUND);
  const shift = await CashShift.findByPk(id);
  if (!shift) throw new ResourceNotFoundError('Shift not found', HttpStatusCodesUtil.NOT_FOUND);
  return shift;
}

async function detailOf(shift: CashShift, endAt?: Date): Promise<CashShiftDetail> {
  const end = endAt ?? shift.closedAt ?? new Date();
  const entries = await linesForShift(shift, end);
  const live = totalsFromLines(shift.openingBalance, entries);
  const maps = await namesFor([shift]);
  return {
    shift: toSummary(
      shift,
      maps.adminName.get(shift.adminId) ?? `User #${shift.adminId}`,
      maps.branchName.get(shift.branchId) ?? `Branch #${shift.branchId}`,
      live,
    ),
    entries,
  };
}

export default class CashRegisterService {
  static async list(input: {
    startDate: string;
    endDate: string;
    branchId?: number;
    allowAllBranches: boolean;
  }): Promise<CashShiftSummary[]> {
    if (!input.allowAllBranches && input.branchId == null) {
      throw new InputValidationError('Select a branch.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const { startAt, endAt } = rangeBounds(input.startDate, input.endDate);
    const branchWhere = input.branchId != null ? { branchId: input.branchId } : {};
    const shifts = await CashShift.findAll({
      where: {
        ...branchWhere,
        [Op.or]: [
          { openedAt: { [Op.between]: [startAt, endAt] } },
          { status: 'OPEN' },
        ],
      },
      order: [['openedAt', 'DESC'], ['id', 'DESC']],
    });
    const maps = await namesFor(shifts);
    const summaries: CashShiftSummary[] = [];
    for (const shift of shifts) {
      const live =
        shift.status === 'OPEN' ? totalsFromLines(shift.openingBalance, await linesForShift(shift, new Date())) : null;
      summaries.push(
        toSummary(
          shift,
          maps.adminName.get(shift.adminId) ?? `User #${shift.adminId}`,
          maps.branchName.get(shift.branchId) ?? `Branch #${shift.branchId}`,
          live,
        ),
      );
    }
    return summaries;
  }

  static async detail(id: number): Promise<CashShiftDetail> {
    return detailOf(await requireShift(id));
  }

  static async open(
    input: { branchId: number; openingBalance: number },
    adminId: number,
  ): Promise<CashShiftDetail> {
    const branch = await Branch.findByPk(input.branchId);
    if (!branch) throw new InputValidationError('Branch not found.', HttpStatusCodesUtil.BAD_REQUEST);
    try {
      const shift = await sequelize.transaction(async (transaction) => {
        const existing = await CashShift.findOne({
          where: { branchId: input.branchId, status: 'OPEN' },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (existing) {
          throw new ConflictError(
            'This branch already has an open cash register.',
            HttpStatusCodesUtil.CONFLICT,
          );
        }
        return CashShift.create(
          {
            adminId,
            branchId: input.branchId,
            openingBalance: input.openingBalance,
            status: 'OPEN',
            openedAt: new Date(),
            openBranchKey: input.branchId,
          },
          { transaction },
        );
      });
      return detailOf(shift);
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        throw new ConflictError(
          'This branch already has an open cash register.',
          HttpStatusCodesUtil.CONFLICT,
        );
      }
      throw e;
    }
  }

  static async close(id: number, actualBalance: number, closedByUserId: number): Promise<CashShiftDetail> {
    const now = new Date();
    const shift = await sequelize.transaction(async (transaction) => {
      const row = await CashShift.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) throw new ResourceNotFoundError('Shift not found', HttpStatusCodesUtil.NOT_FOUND);
      if (row.status !== 'OPEN') {
        throw new ConflictError('This cash register is already closed.', HttpStatusCodesUtil.CONFLICT);
      }
      const entries = await linesForShift(row, now);
      const live = totalsFromLines(row.openingBalance, entries);
      await row.update(
        {
          status: 'CLOSED',
          closedAt: now,
          closedByUserId,
          openBranchKey: null,
          cashInTotal: live.cashIn,
          cashOutTotal: live.cashOut,
          expectedBalance: live.expected,
          actualBalance,
        },
        { transaction },
      );
      return row;
    });
    return detailOf(shift, now);
  }

  static async createEntry(
    shiftId: number,
    input: { direction: DirectorCashDirection; amount: number; comment?: string | null },
    createdByUserId: number,
  ): Promise<CashShiftDetail> {
    const shift = await requireShift(shiftId);
    if (shift.status !== 'OPEN') {
      throw new ConflictError('Open a shift before adding cash entries.', HttpStatusCodesUtil.CONFLICT);
    }
    await DirectorCashEntry.create({
      date: yerevanDay(new Date()),
      branchId: shift.branchId,
      entryType: directorCashEntryType(input.direction),
      amount: directorCashSignedAmount(input.direction, input.amount),
      comment: input.comment ?? null,
      createdByUserId,
      shiftId: shift.id,
    });
    return detailOf(shift);
  }

  static async updateEntry(
    shiftId: number,
    entryId: number,
    input: { direction: DirectorCashDirection; amount: number; comment?: string | null },
  ): Promise<CashShiftDetail> {
    const shift = await requireShift(shiftId);
    if (shift.status !== 'OPEN') {
      throw new ConflictError('Closed shift entries cannot be changed.', HttpStatusCodesUtil.CONFLICT);
    }
    const row = await DirectorCashEntry.findByPk(entryId);
    if (!row || row.shiftId !== shift.id) {
      throw new ResourceNotFoundError('Entry not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    await row.update({
      entryType: directorCashEntryType(input.direction),
      amount: directorCashSignedAmount(input.direction, input.amount),
      comment: input.comment ?? null,
    });
    return detailOf(shift);
  }

  static async deleteEntry(shiftId: number, entryId: number): Promise<void> {
    const shift = await requireShift(shiftId);
    if (shift.status !== 'OPEN') {
      throw new ConflictError('Closed shift entries cannot be changed.', HttpStatusCodesUtil.CONFLICT);
    }
    const row = await DirectorCashEntry.findByPk(entryId);
    if (!row || row.shiftId !== shift.id) {
      throw new ResourceNotFoundError('Entry not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    await row.destroy();
  }

  static async periodSummary(input: {
    startDate: string;
    endDate: string;
    branchId?: number;
    adminUserId?: number | null;
    allowAllBranches: boolean;
  }): Promise<CashRegisterPeriodSummary> {
    if (!input.allowAllBranches && input.branchId == null && input.adminUserId == null) {
      throw new InputValidationError('Select a branch or admin filter.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const ledger = await DirectorService.listCash({
      startDate: input.startDate,
      endDate: input.endDate,
      branchId: input.branchId ?? null,
      adminUserId: input.adminUserId ?? null,
    });

    const branchIds = [
      ...new Set(
        ledger.entries
          .map((e) => e.branchId)
          .filter((id): id is number => id != null && Number.isFinite(id) && id > 0),
      ),
    ];
    const branchRows =
      branchIds.length > 0
        ? await Branch.findAll({ where: { id: { [Op.in]: branchIds } }, attributes: ['id', 'name', 'label'] })
        : [];
    const branchNameById = new Map(
      branchRows.map((b) => [b.id, (b.label ?? b.name ?? '').trim() || `Branch #${b.id}`]),
    );
    const branchLabel = (id: number | null | undefined): string => {
      if (id == null || !Number.isFinite(id) || id <= 0) return '—';
      return branchNameById.get(id) ?? `Branch #${id}`;
    };

    const byManagerKey = new Map<string, CashRegisterManagerRow>();
    const byBranchKey = new Map<string, CashRegisterBranchRow>();

    for (const row of ledger.entries) {
      if (row.direction !== 'in') continue;
      const amount = Math.abs(row.amount);
      if (amount <= 0) continue;

      const managerName = (row.performedByName ?? '').trim() || '—';
      const branchId = row.branchId;
      const branchName = branchLabel(branchId);

      const managerKey = `${row.performedByUserId ?? 0}:${branchId ?? 0}`;
      let managerRow = byManagerKey.get(managerKey);
      if (!managerRow) {
        managerRow = {
          managerName,
          branchId,
          branchName,
          ...emptyMethodTotals(),
        };
        byManagerKey.set(managerKey, managerRow);
      }
      addMethodTotals(managerRow, row.paymentMethod, amount);

      const branchKey = String(branchId ?? 0);
      let branchRow = byBranchKey.get(branchKey);
      if (!branchRow) {
        branchRow = {
          branchId,
          branchName,
          ...emptyMethodTotals(),
        };
        byBranchKey.set(branchKey, branchRow);
      }
      addMethodTotals(branchRow, row.paymentMethod, amount);
    }

    const entries: CashRegisterPeriodEntry[] = ledger.entries.map((row) => ({
      id: row.id,
      source: row.source,
      sourceId: row.sourceId,
      readOnly: row.readOnly,
      date: row.date,
      occurredAt: row.occurredAt,
      branchId: row.branchId,
      branchName: branchLabel(row.branchId),
      direction: row.direction,
      paymentMethod: row.paymentMethod,
      amount: Math.abs(row.amount),
      comment: row.comment,
      performedByName: row.performedByName,
    }));

    return {
      balance: ledger.balance,
      totals: {
        periodIn: ledger.periodIn,
        periodOut: ledger.periodOut,
        periodCashIn: ledger.periodCashIn,
        periodCardIn: ledger.periodCardIn,
        periodCashOut: ledger.periodCashOut,
        periodCardOut: ledger.periodCardOut,
      },
      byManager: [...byManagerKey.values()].sort(
        (a, b) => b.total - a.total || a.managerName.localeCompare(b.managerName, 'hy'),
      ),
      byBranch: [...byBranchKey.values()].sort(
        (a, b) => b.total - a.total || a.branchName.localeCompare(b.branchName, 'hy'),
      ),
      entries,
    };
  }
}

function emptyMethodTotals(): CashRegisterMethodTotals {
  return { cash: 0, card: 0, total: 0, paymentCount: 0 };
}

function addMethodTotals(
  target: CashRegisterMethodTotals,
  paymentMethod: 'cash' | 'card',
  amount: number,
): void {
  const n = Math.abs(amount);
  if (n <= 0) return;
  target.paymentCount += 1;
  target.total += n;
  if (paymentMethod === 'cash') target.cash += n;
  else target.card += n;
}
