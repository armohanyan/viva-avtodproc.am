import { Op } from 'sequelize';
import {
  BOOKING_STATUSES_COUNTED_FOR_PROGRESS,
  type LessonCompletionStatus,
} from '../constants/lesson-completion';
import { normalizePetrolPaymentType } from '../constants/petrol-payment-type';
import { petrolTypeLabelAm } from '../constants/petrol-type';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import {
  Booking,
  CarExpense,
  FleetCar,
  InstructorBranch,
  InstructorKmLog,
  PetrolExpense,
  SalaryPayment,
  TheoryCohortSession,
} from '../models';
import AdminFinanceExpenseService from '../services/admin-finance-expense.service';
import { bookingEndUtcMs, lessonEndUtcMs } from '../utils/lesson-datetime.util';
import {
  completedLessonSlotsByDateFromBooking,
  loadBookingSlotsByBookingId,
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

function normalizeLifecycleStatus(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'pending_prebook') return 'pending';
  if (s === 'completed') return 'confirmed';
  return s;
}

function isBookingActiveForProgress(row: Booking): boolean {
  const st = normalizeLifecycleStatus(String(row.status ?? ''));
  if (!BOOKING_STATUSES_COUNTED_FOR_PROGRESS.has(st)) return false;
  if (st === 'pending_payment') {
    const paid = row.paidAt != null || row.paymentStatus === 'paid';
    if (!paid) return false;
  }
  return true;
}

function bookingCountsAsCompleted(row: Booking, now: Date): boolean {
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed') return true;
  if (cs === 'missed' || cs === 'cancelled' || cs === 'refunded' || cs === 'cancelled_no_refund') {
    return false;
  }
  if (row.lessonPassedSuccessfully === false) return false;
  return (
    isBookingActiveForProgress(row) &&
    bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime) <= now.getTime()
  );
}

function sessionCountsAsCompleted(session: TheoryCohortSession, now: Date): boolean {
  if (session.status === 'cancelled') return false;
  if (session.status === 'completed') return true;
  return lessonEndUtcMs(String(session.dateIso), String(session.endTime)) <= now.getTime();
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
  const now = new Date();
  const slotsByKey = new Map<string, { date: string; instructorUserId: number; hours: number }>();

  const bump = (date: string, instructorUserId: number, slots: number) => {
    if (instructorUserId <= 0 || slots <= 0) return;
    const key = `${date}:${instructorUserId}`;
    const prev = slotsByKey.get(key) ?? { date, instructorUserId, hours: 0 };
    prev.hours += slots;
    slotsByKey.set(key, prev);
  };

  const bookings = await Booking.findAll({
    where: {
      dateIso: dateBetween(range),
      instructorUserId: { [Op.ne]: null },
      ...(range.branchId != null ? { branchId: range.branchId } : {}),
    },
  });

  const slotsByBookingId = await loadBookingSlotsByBookingId(bookings.map((b) => b.id));

  for (const row of bookings) {
    if (!bookingCountsAsCompleted(row, now)) continue;
    const slotRows = slotsByBookingId.get(row.id);
    const byDate = completedLessonSlotsByDateFromBooking(row, slotRows);
    for (const [date, count] of byDate) {
      if (date >= range.startDate && date <= range.endDate) {
        bump(date, row.instructorUserId!, count);
      }
    }
  }

  const sessions = await TheoryCohortSession.findAll({
    where: {
      dateIso: dateBetween(range),
      ...(range.branchId != null ? { branchId: range.branchId } : {}),
    },
  });

  for (const session of sessions) {
    if (!sessionCountsAsCompleted(session, now)) continue;
    bump(String(session.dateIso).slice(0, 10), session.instructorUserId ?? 0, 1);
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
