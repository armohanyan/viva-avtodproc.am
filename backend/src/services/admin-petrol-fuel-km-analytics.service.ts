import { Op } from 'sequelize';
import type { PetrolType } from '../constants/petrol-type';
import {
  Booking,
  InstructorBranch,
  InstructorKmLog,
  PetrolExpense,
  User,
} from '../models';
import { yerevanTodayIso } from '../utils/booking-slot.util';

export type PetrolFuelKmAnalyticsRowDto = {
  date: string;
  instructorUserId: number;
  instructorName: string;
  lessonCount: number;
  totalKm: number;
  hasPetrolExpense: boolean;
  totalBenzinLiters: number;
  totalLpgLiters: number;
  avgKmPerLesson: number;
  avgBenzinPerLesson: number;
  avgLpgPerLesson: number;
};

export type PetrolFuelKmAnalyticsResult = {
  items: PetrolFuelKmAnalyticsRowDto[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateRange(startDate?: string, endDate?: string): { start: string; end: string } {
  const today = yerevanTodayIso();
  let start = startDate && DATE_RE.test(startDate) ? startDate : today;
  let end = endDate && DATE_RE.test(endDate) ? endDate : today;
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return { start, end };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value.trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dateKey(date: string, instructorUserId: number): string {
  return `${date}:${instructorUserId}`;
}

async function branchInstructorUserIds(branchId: number): Promise<number[]> {
  const links = await InstructorBranch.findAll({
    where: { branchId },
    attributes: ['instructorUserId'],
  });
  return [...new Set(links.map((l) => l.instructorUserId))];
}

type RowAccumulator = {
  date: string;
  instructorUserId: number;
  instructorName: string;
  lessonCount: number;
  totalKm: number;
  hasPetrolExpense: boolean;
  totalBenzinLiters: number;
  totalLpgLiters: number;
};

export default class AdminPetrolFuelKmAnalyticsService {
  static async build(
    startDate?: string,
    endDate?: string,
    branchId?: number,
  ): Promise<PetrolFuelKmAnalyticsResult> {
    const { start, end } = parseDateRange(startDate, endDate);

    let instructorFilter: number[] | undefined;
    if (branchId !== undefined) {
      instructorFilter = await branchInstructorUserIds(branchId);
      if (instructorFilter.length === 0) {
        return { items: [] };
      }
    }

    const instructorWhere =
      instructorFilter !== undefined ? { instructorUserId: { [Op.in]: instructorFilter } } : {};

    const [bookings, kmLogs, expenses] = await Promise.all([
      Booking.findAll({
        where: {
          lessonType: 'practical',
          lessonCompletionStatus: 'completed',
          dateIso: { [Op.between]: [start, end] },
          ...instructorWhere,
        },
        attributes: ['dateIso', 'instructorUserId'],
        include: [
          { model: User, as: 'instructor', required: false, attributes: ['id', 'name'] },
        ],
      }),
      InstructorKmLog.findAll({
        where: {
          date: { [Op.between]: [start, end] },
          ...instructorWhere,
        },
        include: [
          { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
        ],
      }),
      PetrolExpense.findAll({
        where: {
          date: { [Op.between]: [start, end] },
          ...instructorWhere,
        },
        include: [
          { model: User, as: 'instructor', required: true, attributes: ['id', 'name'] },
        ],
      }),
    ]);

    const map = new Map<string, RowAccumulator>();

    const ensureRow = (date: string, instructorUserId: number, instructorName: string): RowAccumulator => {
      const key = dateKey(date, instructorUserId);
      const prev = map.get(key) ?? {
        date,
        instructorUserId,
        instructorName,
        lessonCount: 0,
        totalKm: 0,
        hasPetrolExpense: false,
        totalBenzinLiters: 0,
        totalLpgLiters: 0,
      };
      if (!prev.instructorName && instructorName) {
        prev.instructorName = instructorName;
      }
      map.set(key, prev);
      return prev;
    };

    for (const booking of bookings) {
      const date =
        typeof booking.dateIso === 'string' ? booking.dateIso : String(booking.dateIso).slice(0, 10);
      const instructorUserId = booking.instructorUserId ?? 0;
      if (instructorUserId <= 0) continue;
      const instructor = booking.get('instructor') as User | undefined;
      const row = ensureRow(date, instructorUserId, instructor?.name?.trim() || `Instructor #${instructorUserId}`);
      row.lessonCount += 1;
    }

    for (const log of kmLogs) {
      const date = typeof log.date === 'string' ? log.date : String(log.date).slice(0, 10);
      const instructor = log.get('instructor') as User;
      const row = ensureRow(date, log.instructorUserId, instructor.name);
      row.totalKm += toNumber(log.km);
    }

    for (const expense of expenses) {
      const date = typeof expense.date === 'string' ? expense.date : String(expense.date).slice(0, 10);
      const instructor = expense.get('instructor') as User;
      const row = ensureRow(date, expense.instructorUserId, instructor.name);
      row.hasPetrolExpense = true;
      const liters = toNumber(expense.petrolCount);
      const petrolType = expense.petrolType as PetrolType;
      if (petrolType === 'lpg') {
        row.totalLpgLiters += liters;
      } else {
        row.totalBenzinLiters += liters;
      }
    }

    const items = [...map.values()]
      .map((row) => {
        const lessonCount = row.lessonCount;
        const divisor = lessonCount > 0 ? lessonCount : 0;
        return {
          date: row.date,
          instructorUserId: row.instructorUserId,
          instructorName: row.instructorName,
          lessonCount,
          totalKm: round2(row.totalKm),
          hasPetrolExpense: row.hasPetrolExpense,
          totalBenzinLiters: round2(row.totalBenzinLiters),
          totalLpgLiters: round2(row.totalLpgLiters),
          avgKmPerLesson: divisor > 0 ? round2(row.totalKm / divisor) : 0,
          avgBenzinPerLesson: divisor > 0 ? round2(row.totalBenzinLiters / divisor) : 0,
          avgLpgPerLesson: divisor > 0 ? round2(row.totalLpgLiters / divisor) : 0,
        };
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.instructorName.localeCompare(b.instructorName, 'hy');
      });

    return { items };
  }
}
