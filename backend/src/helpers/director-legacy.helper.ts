import { Op } from 'sequelize';
import { normalizePetrolPaymentType } from '../constants/petrol-payment-type';
import { petrolTypeLabelAm } from '../constants/petrol-type';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import {
  CarExpense,
  FleetCar,
  FinanceTransaction,
  InstructorBranch,
  InstructorKmLog,
  PetrolExpense,
  SalaryPayment,
  TheoryCohortSession,
} from '../models';
import AdminFinanceExpenseService from '../services/admin-finance-expense.service';
import {
  legacyBookingRevenueAmd,
  slotRevenueAmd,
} from '../utils/booking-admin-payment.util';
import {
  findLegacyBookingsWithoutSlots,
  findSlotsInDateRange,
  legacyBookingCountsForPayableLesson,
  lessonSlotExcludedFromReports,
  loadBookingSlotDetailsByBookingId,
  slotCountFromTimeRange,
  slotCountsForPayableLesson,
} from '../utils/lesson-slot-count.util';

type DateRange = { startDate: string; endDate: string; branchId?: number | null };

export type LegacyDirectorFuelRow = {
  id: number;
  date: string;
  instructorUserId: number;
  carId: number | null;
  fuelType: string;
  liters: number;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
};

export type LegacyDirectorKmRow = {
  id: number;
  date: string;
  instructorUserId: number;
  km: number;
  comment: string | null;
};

export type LegacyDirectorSalaryRow = {
  id: number;
  date: string;
  name: string;
  role: string;
  hours: number | null;
  hourlyRate: number | null;
  totalAmd: number;
  comment: string | null;
};

export type LegacyDirectorExpenseRow = {
  id: number;
  date: string;
  branchId: number | null;
  expType: string;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
  comment: string | null;
};

export type LegacyDirectorRepairRow = {
  id: number;
  date: string;
  carId: number;
  licensePlate: string | null;
  workDone: string;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
  comment: string | null;
};

export type LegacyDirectorInstructorHoursRow = {
  id: number;
  date: string;
  instructorUserId: number;
  hours: number;
  comment: string | null;
};

export type LegacyDirectorRevenueRow = {
  id: number;
  date: string;
  branchId: number;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
  comment: string | null;
};

export function isLegacyDirectorId(id: number): boolean {
  return id < 0;
}

export function legacyDirectorId(sourceId: number): number {
  return -Math.abs(sourceId);
}

function dateBetween(range: DateRange) {
  return { [Op.between]: [range.startDate, range.endDate] };
}

async function branchInstructorUserIds(branchId: number): Promise<number[]> {
  const links = await InstructorBranch.findAll({
    where: { branchId },
    attributes: ['instructorUserId'],
  });
  return [...new Set(links.map((l) => l.instructorUserId))];
}

function salaryKindToRole(kind: string): string {
  if (kind === 'instructor') return 'Հրահանգիչ';
  if (kind === 'theory_teacher') return 'Տեսության ուսուցիչ';
  return 'Այլ';
}

function parseExpenseNumericId(compositeId: string): number {
  const m = /:(\d+)$/.exec(compositeId);
  return m ? Number(m[1]) : Math.abs(compositeId.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}

export async function fetchLegacyFuel(range: DateRange): Promise<LegacyDirectorFuelRow[]> {
  const where: Record<string, unknown> = { date: dateBetween(range) };
  if (range.branchId != null) {
    const instructorIds = await branchInstructorUserIds(range.branchId);
    where.instructorUserId = instructorIds.length === 0 ? -1 : { [Op.in]: instructorIds };
  }

  const rows = await PetrolExpense.findAll({
    where,
    order: [['date', 'DESC'], ['id', 'DESC']],
  });

  return rows.map((row) => ({
    id: legacyDirectorId(row.id),
    date: String(row.date).slice(0, 10),
    instructorUserId: row.instructorUserId,
    carId: row.carId ?? null,
    fuelType: petrolTypeLabelAm(String(row.petrolType)),
    liters: Number(row.petrolCount ?? 0),
    amount: row.price,
    paymentMethod: normalizePetrolPaymentType(row.paymentType) as DirectorPaymentMethod,
  }));
}

export async function fetchLegacyKm(range: DateRange): Promise<LegacyDirectorKmRow[]> {
  const where: Record<string, unknown> = { date: dateBetween(range) };
  if (range.branchId != null) {
    const instructorIds = await branchInstructorUserIds(range.branchId);
    where.instructorUserId = instructorIds.length === 0 ? -1 : { [Op.in]: instructorIds };
  }

  const rows = await InstructorKmLog.findAll({
    where,
    order: [['date', 'DESC'], ['id', 'DESC']],
  });

  return rows.map((row) => ({
    id: legacyDirectorId(row.id),
    date: String(row.date).slice(0, 10),
    instructorUserId: row.instructorUserId,
    km: Number(row.km),
    comment: null as string | null,
  }));
}

export async function fetchLegacySalaries(range: Omit<DateRange, 'branchId'>): Promise<LegacyDirectorSalaryRow[]> {
  const rows = await SalaryPayment.findAll({
    where: {
      periodStartIso: { [Op.lte]: range.endDate },
      periodEndIso: { [Op.gte]: range.startDate },
    },
    order: [['periodEndIso', 'DESC'], ['id', 'DESC']],
  });

  return rows.map((row) => ({
    id: legacyDirectorId(row.id),
    date: String(row.periodEndIso).slice(0, 10),
    name: row.employeeName,
    role: salaryKindToRole(String(row.kind)),
    hours: row.lessonsCount != null ? Number(row.lessonsCount) : null,
    hourlyRate: row.ratePerLessonAmd != null ? Number(row.ratePerLessonAmd) : null,
    totalAmd: row.totalAmd,
    comment: row.notes?.trim() || null,
  }));
}

export async function fetchLegacyExpenses(range: DateRange): Promise<LegacyDirectorExpenseRow[]> {
  const all = await AdminFinanceExpenseService.list(range.branchId ?? undefined);
  const inRange = all.filter((e) => e.date >= range.startDate && e.date <= range.endDate);

  return inRange.map((row) => {
    const branchId =
      row.relatedEntityType === 'branch' && row.relatedEntityId
        ? Number(row.relatedEntityId) || null
        : null;
    const expType = row.expenseSubtype?.trim() || row.purposeLabel?.trim() || row.title?.trim() || 'Այլ';

    return {
      id: legacyDirectorId(parseExpenseNumericId(row.id)),
      date: row.date,
      branchId: Number.isFinite(branchId) && branchId! > 0 ? branchId : null,
      expType,
      amount: row.amount,
      paymentMethod: 'cash' as DirectorPaymentMethod,
      comment: row.notes?.trim() || row.customPurposeText?.trim() || null,
    };
  });
}

export async function fetchLegacyRepairs(range: Omit<DateRange, 'branchId'>): Promise<LegacyDirectorRepairRow[]> {
  const rows = await CarExpense.findAll({
    where: { date: dateBetween(range) },
    order: [['date', 'DESC'], ['id', 'DESC']],
  });

  const carIds = [...new Set(rows.map((r) => r.carId))];
  const cars =
    carIds.length > 0
      ? await FleetCar.findAll({ where: { id: { [Op.in]: carIds } }, attributes: ['id', 'plate'] })
      : [];
  const plateByCarId = new Map(cars.map((c) => [c.id, c.plate?.trim() || null]));

  return rows.map((row) => ({
    id: legacyDirectorId(row.id),
    date: String(row.date).slice(0, 10),
    carId: row.carId,
    licensePlate: plateByCarId.get(row.carId) ?? null,
    workDone: row.purpose?.trim() || row.title?.trim() || '—',
    amount: Math.abs(Math.round(Number(row.amount) || 0)),
    paymentMethod: 'cash' as DirectorPaymentMethod,
    comment: row.note?.trim() || null,
  }));
}

export async function fetchLegacyInstructorHours(range: DateRange): Promise<LegacyDirectorInstructorHoursRow[]> {
  const slotsByKey = new Map<string, { date: string; instructorUserId: number; hours: number }>();

  const bump = (date: string, instructorUserId: number, slots: number) => {
    if (instructorUserId <= 0 || slots <= 0) return;
    const d = date.slice(0, 10);
    if (d < range.startDate || d > range.endDate) return;
    const key = `${d}:${instructorUserId}`;
    const prev = slotsByKey.get(key) ?? { date: d, instructorUserId, hours: 0 };
    prev.hours += slots;
    slotsByKey.set(key, prev);
  };

  const slotQuery = {
    startDate: range.startDate,
    endDate: range.endDate,
    branchId: range.branchId,
    bookingStatuses: undefined as undefined,
  };

  const [slotRows, legacyBookings] = await Promise.all([
    findSlotsInDateRange(slotQuery),
    findLegacyBookingsWithoutSlots(slotQuery),
  ]);

  for (const slot of slotRows) {
    if (!slotCountsForPayableLesson(slot.booking, slot)) continue;
    bump(slot.dateIso, slot.instructorUserId, 1);
  }

  for (const row of legacyBookings) {
    if (!legacyBookingCountsForPayableLesson(row)) continue;
    const d = String(row.dateIso).slice(0, 10);
    bump(d, row.instructorUserId!, slotCountFromTimeRange(d, String(row.time), row.endTime));
  }

  const sessions = await TheoryCohortSession.findAll({
    where: {
      dateIso: dateBetween(range),
      status: { [Op.ne]: 'cancelled' },
      ...(range.branchId != null ? { branchId: range.branchId } : {}),
    },
  });

  for (const session of sessions) {
    const iid = session.instructorUserId ?? 0;
    if (iid <= 0) continue;
    bump(String(session.dateIso).slice(0, 10), iid, 1);
  }

  let seq = 1;
  return [...slotsByKey.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || b.instructorUserId - a.instructorUserId)
    .map((row) => ({
      id: legacyDirectorId(seq++),
      date: row.date,
      instructorUserId: row.instructorUserId,
      hours: Math.round(row.hours),
      comment: null as string | null,
    }));
}

function paymentMethodForBooking(
  bookingId: number,
  txs: ReadonlyArray<{ bookingId: number | null; method: string }>,
): DirectorPaymentMethod {
  const bookingTxs = txs.filter((t) => t.bookingId === bookingId);
  if (bookingTxs.some((t) => t.method === 'card' || t.method === 'idram')) return 'card';
  return 'cash';
}

/** Auto revenue from paid lesson slots on their calendar dates (matches instructor-hours date axis). */
export async function fetchLegacyRevenues(range: DateRange): Promise<LegacyDirectorRevenueRow[]> {
  const revenueByKey = new Map<
    string,
    { date: string; branchId: number; paymentMethod: DirectorPaymentMethod; amount: number }
  >();

  const bump = (
    date: string,
    branchId: number,
    paymentMethod: DirectorPaymentMethod,
    amount: number,
  ) => {
    if (amount <= 0 || branchId <= 0) return;
    const d = date.slice(0, 10);
    if (d < range.startDate || d > range.endDate) return;
    const key = `${d}:${branchId}:${paymentMethod}`;
    const prev = revenueByKey.get(key) ?? { date: d, branchId, paymentMethod, amount: 0 };
    prev.amount += amount;
    revenueByKey.set(key, prev);
  };

  const slotQuery = {
    startDate: range.startDate,
    endDate: range.endDate,
    branchId: range.branchId,
  };

  const [slotRows, legacyBookings] = await Promise.all([
    findSlotsInDateRange(slotQuery),
    findLegacyBookingsWithoutSlots(slotQuery),
  ]);

  const bookingIds = [
    ...new Set([...slotRows.map((s) => s.bookingId), ...legacyBookings.map((b) => b.id)]),
  ];

  const [slotsByBookingId, financeTxs] = await Promise.all([
    loadBookingSlotDetailsByBookingId(bookingIds),
    bookingIds.length > 0
      ? FinanceTransaction.findAll({
          where: {
            bookingId: { [Op.in]: bookingIds },
            entryType: 'income',
            status: 'completed',
          },
          attributes: ['bookingId', 'method'],
        })
      : Promise.resolve([]),
  ]);

  for (const slot of slotRows) {
    const booking = slot.booking;
    if (lessonSlotExcludedFromReports(booking)) continue;
    const allSlots = slotsByBookingId.get(slot.bookingId) ?? [];
    const amt = slotRevenueAmd(booking, slot, allSlots);
    if (amt <= 0) continue;
    bump(
      slot.dateIso,
      booking.branchId,
      paymentMethodForBooking(slot.bookingId, financeTxs),
      amt,
    );
  }

  for (const row of legacyBookings) {
    if (lessonSlotExcludedFromReports(row)) continue;
    const amt = legacyBookingRevenueAmd(row);
    if (amt <= 0) continue;
    const d = String(row.dateIso).slice(0, 10);
    bump(d, row.branchId, paymentMethodForBooking(row.id, financeTxs), amt);
  }

  let seq = 1;
  return [...revenueByKey.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || b.branchId - a.branchId)
    .map((row) => ({
      id: legacyDirectorId(seq++),
      date: row.date,
      branchId: row.branchId,
      amount: Math.round(row.amount),
      paymentMethod: row.paymentMethod,
      comment: null as string | null,
    }));
}

function sortByDateDesc<T extends { date: string; id: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function mergeDirectorRows<T extends { date: string; id: number }>(
  directorRows: T[],
  legacyRows: T[],
): T[] {
  const directorIds = new Set(directorRows.map((r) => r.id));
  const legacyOnly = legacyRows.filter((r) => !directorIds.has(r.id));
  return sortByDateDesc([...directorRows, ...legacyOnly]);
}

function instructorDayKey(date: string, instructorUserId: number | null | undefined): string {
  return `${date}:${instructorUserId ?? 0}`;
}

/** When manual director rows exist for an instructor+day, skip legacy auto-rows for that key. */
export function mergeDirectorRowsPreferManual<
  T extends { id: number; date: string; instructorUserId: number | null },
>(directorRows: T[], legacyRows: T[]): T[] {
  const directorKeys = new Set(
    directorRows.map((r) => instructorDayKey(r.date, r.instructorUserId)),
  );
  const legacyOnly = legacyRows.filter(
    (r) => !directorKeys.has(instructorDayKey(r.date, r.instructorUserId)),
  );
  return sortByDateDesc([...directorRows, ...legacyOnly]);
}
