import { Op, type WhereOptions } from 'sequelize';
import type { DirectorOptionCategory } from '../constants/director-option-category';
import {
  DIRECTOR_OPTION_CATEGORIES,
  DIRECTOR_OPTION_DEFAULTS,
} from '../constants/director-option-category';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
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
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import {
  fetchLegacyExpenses,
  fetchLegacyFuel,
  fetchLegacyInstructorHours,
  fetchLegacyKm,
  fetchLegacyRepairs,
  fetchLegacySalaries,
  mergeDirectorRows,
} from '../helpers/director-legacy.helper';

const { ResourceNotFoundError } = ErrorsUtil;

type DateRange = { startDate: string; endDate: string; branchId?: number | null };

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
    const rows = await DirectorCashEntry.findAll({
      where: dateWhere(range),
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    return rowJson(rows);
  }

  static async createCash(
    input: {
      date: string;
      branchId: number | null;
      entryType: string;
      amount: number;
      comment?: string | null;
    },
    createdByUserId?: number,
  ) {
    return DirectorCashEntry.create({ ...input, createdByUserId: createdByUserId ?? null });
  }

  static async deleteCash(id: number) {
    const row = await DirectorCashEntry.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.destroy();
  }

  static async updateCash(
    id: number,
    input: {
      date: string;
      branchId: number | null;
      entryType: string;
      amount: number;
      comment?: string | null;
    },
  ) {
    const row = await DirectorCashEntry.findByPk(id);
    if (!row) throw new ResourceNotFoundError('Record not found', HttpStatusCodesUtil.NOT_FOUND);
    await row.update(input);
    return row;
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
    return mergeDirectorRows(rowJson(directorRows), legacyRows);
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
    return mergeDirectorRows(rowJson(directorRows), legacyRows);
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
    return mergeDirectorRows(rowJson(directorRows), legacyRows);
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

    const [
      revenues,
      legacyRevenues,
      expenses,
      fuel,
      salaries,
      instructorHours,
      cashEntries,
      financeTxs,
      legacyExpenses,
      legacyFuel,
      legacySalaries,
      legacyInstructorHours,
    ] = await Promise.all([
      DirectorRevenue.findAll({ where: { ...dateFilter, isLegacy: false, ...revenueBranchFilter } }),
      DirectorRevenue.findAll({ where: { ...dateFilter, isLegacy: true, ...revenueBranchFilter } }),
      DirectorExpense.findAll({ where: cashExpenseWhere }),
      DirectorFuel.findAll({ where: dateFilter }),
      DirectorSalary.findAll({ where: dateFilter }),
      DirectorInstructorHours.findAll({ where: dateFilter }),
      DirectorCashEntry.findAll({ where: cashExpenseWhere }),
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

    const rangeStart = new Date(`${range.startDate}T00:00:00`);
    const rangeEnd = new Date(`${range.endDate}T23:59:59`);

    const financeTxsInRange = financeTxs.filter((tx) => {
      const raw = (tx as unknown as { createdAt?: Date | string }).createdAt;
      const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      return d != null && d >= rangeStart && d <= rangeEnd;
    });

    const directorRevenueTotal = sumField(revenues, 'amount') + sumField(legacyRevenues, 'amount');
    const systemRevenueTotal = financeTxsInRange.reduce((s, tx) => s + tx.grossAmd, 0);
    const totalRevenue = directorRevenueTotal + systemRevenueTotal;

    const cardFromTx = financeTxsInRange
      .filter((tx) => tx.method === 'card' || tx.method === 'idram')
      .reduce((s, tx) => s + tx.grossAmd, 0);
    const cashFromTx = financeTxsInRange
      .filter((tx) => tx.method === 'cash')
      .reduce((s, tx) => s + tx.grossAmd, 0);
    const cardFromDirector = [...revenues, ...legacyRevenues]
      .filter((r) => r.paymentMethod === 'card')
      .reduce((s, r) => s + r.amount, 0);
    const cashFromDirector = [...revenues, ...legacyRevenues]
      .filter((r) => r.paymentMethod === 'cash')
      .reduce((s, r) => s + r.amount, 0);

    const totalExpense =
      sumField(expenses, 'amount') + legacyExpenses.reduce((s, e) => s + e.amount, 0);
    const fuelTotal = sumField(fuel, 'amount') + legacyFuel.reduce((s, f) => s + f.amount, 0);
    const salaryTotal =
      sumField(salaries, 'totalAmd') + legacySalaries.reduce((s, r) => s + r.totalAmd, 0);
    const instructorHoursTotal =
      instructorHours.reduce((s, h) => s + Number(h.hours), 0) +
      legacyInstructorHours.reduce((s, h) => s + Number(h.hours), 0);
    const instructorSalaryTotal =
      salaries.filter((s) => s.role === 'Հրահանգիչ').reduce((acc, s) => acc + s.totalAmd, 0) +
      legacySalaries
        .filter((s) => s.role === 'Հրահանգիչ')
        .reduce((acc, s) => acc + s.totalAmd, 0);
    const incashmentTotal = cashEntries
      .filter((c) => c.entryType.includes('Ինկասացի'))
      .reduce((s, c) => s + Math.abs(c.amount), 0);
    const fuelLiters =
      fuel.reduce((s, f) => s + Number(f.liters), 0) +
      legacyFuel.reduce((s, f) => s + Number(f.liters), 0);
    const cashBalance = cashEntries.reduce((s, c) => s + c.amount, 0);

    const netProfit = totalRevenue - totalExpense - fuelTotal - salaryTotal;

    return {
      totalRevenue,
      cardPos: cardFromTx + cardFromDirector,
      cash: cashFromTx + cashFromDirector,
      netProfit,
      totalExpense,
      fuel: fuelTotal,
      salaryTotal,
      cashBalance,
      instructorHours: instructorHoursTotal,
      instructorSalary: instructorSalaryTotal,
      incashment: incashmentTotal,
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

    const mergedHours = [
      ...hours.map((h) => h.toJSON()),
      ...legacyHours.filter((h) => h.instructorUserId === instructorId),
    ];
    const mergedKm = [
      ...kmRows.map((k) => k.toJSON()),
      ...legacyKm.filter((k) => k.instructorUserId === instructorId),
    ];
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
      d.hours += Number(h.hours);
    }
    for (const k of mergedKm) {
      const d = ensureDay(k.date);
      d.km += Number(k.km);
    }
    for (const f of mergedFuel) {
      const d = ensureDay(f.date);
      const liters = Number(f.liters);
      d.totalLiters += liters;
      d.amount += f.amount;
      if (f.fuelType.includes('Գազ')) d.gasLiters += liters;
      else d.petrolLiters += liters;
      if (f.paymentMethod === 'card') d.card += f.amount;
      else d.cash += f.amount;
    }

    const rows = [...days.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((d) => {
        const lPer100 = d.km > 0 ? (d.totalLiters / d.km) * 100 : 0;
        const amdPerKm = d.km > 0 ? d.amount / d.km : 0;
        const kmPerHour = d.hours > 0 ? d.km / d.hours : 0;
        return { ...d, lPer100, amdPerKm, kmPerHour };
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
    const rangeStart = new Date(`${range.startDate}T00:00:00`);
    const rangeEnd = new Date(`${range.endDate}T23:59:59`);

    const [revenues, expenses, fuel, salaries, financeTxs, legacyExpenses, legacyFuel, legacySalaries] =
      await Promise.all([
        DirectorRevenue.findAll({ where: { ...dateFilter, ...revenueBranchFilter } }),
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
    for (const e of expenses) bump(expensesByMonth, e.date, e.amount);
    for (const e of legacyExpenses) bump(expensesByMonth, e.date, e.amount);
    for (const f of fuel) bump(fuelByMonth, f.date, f.amount);
    for (const f of legacyFuel) bump(fuelByMonth, f.date, f.amount);
    for (const s of salaries) bump(salaryByMonth, s.date, s.totalAmd);
    for (const s of legacySalaries) bump(salaryByMonth, s.date, s.totalAmd);

    for (const tx of financeTxs) {
      const raw = (tx as unknown as { createdAt?: Date | string }).createdAt;
      const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      if (d == null || d < rangeStart || d > rangeEnd) continue;
      bump(revenueByMonth, d.toISOString().slice(0, 10), tx.grossAmd);
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
