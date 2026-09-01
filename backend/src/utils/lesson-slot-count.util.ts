import { literal, Op } from 'sequelize';
import {
  BOOKING_STATUSES_COUNTED_FOR_PROGRESS,
  type LessonCompletionStatus,
} from '../constants/lesson-completion';
import { Booking, BookingSlot as BookingSlotModel } from '../models';
import type { Booking as BookingType } from '../models/booking.model';
import type { BookingSlot } from '../models/booking-slot.model';
import { bookingEndUtcMs, lessonInstantUtcMs } from './lesson-datetime.util';

export const SLOT_RESERVING_BOOKING_STATUSES = [
  'confirmed',
  'pending',
  'pending_prebook',
  'pending_payment',
  'completed',
] as const;

const EXCLUDED_LESSON_COMPLETION = new Set<LessonCompletionStatus>([
  'missed',
  'cancelled',
  'cancelled_no_refund',
  'refunded',
]);

export type SlotInRangeQuery = {
  startDate: string;
  endDate: string;
  branchId?: number | null;
  instructorUserId?: number;
  lessonTypes?: readonly string[];
  /** When set, only bookings with these raw `status` values are included. */
  bookingStatuses?: readonly string[];
};

export type SlotWithBooking = {
  slotId: number;
  bookingId: number;
  dateIso: string;
  slotTime: string;
  instructorUserId: number;
  booking: BookingType;
};

type SlotRow = Pick<BookingSlot, 'dateIso'>;
export type BookingSlotDetail = Pick<BookingSlot, 'dateIso' | 'slotTime' | 'paymentCovered'>;

function dateBetween(range: Pick<SlotInRangeQuery, 'startDate' | 'endDate'>) {
  return { [Op.between]: [range.startDate, range.endDate] };
}

function bookingWhereFromQuery(query: SlotInRangeQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (query.branchId != null) where.branchId = query.branchId;
  if (query.lessonTypes != null && query.lessonTypes.length > 0) {
    where.lessonType = { [Op.in]: [...query.lessonTypes] };
  }
  if (query.bookingStatuses != null && query.bookingStatuses.length > 0) {
    where.status = { [Op.in]: [...query.bookingStatuses] };
  }
  return where;
}

/** All `booking_slots` in range (primary source for lesson counts across reports). */
export async function findSlotsInDateRange(query: SlotInRangeQuery): Promise<SlotWithBooking[]> {
  const slotWhere: Record<string, unknown> = {
    dateIso: dateBetween(query),
    instructorUserId: { [Op.ne]: null },
  };
  if (query.instructorUserId != null && query.instructorUserId > 0) {
    slotWhere.instructorUserId = query.instructorUserId;
  }

  const bookingWhere = bookingWhereFromQuery(query);

  const rows = await BookingSlotModel.findAll({
    where: slotWhere,
    include: [
      {
        model: Booking,
        as: 'booking',
        required: true,
        ...(Object.keys(bookingWhere).length > 0 ? { where: bookingWhere } : {}),
      },
    ],
    order: [
      ['dateIso', 'ASC'],
      ['slotTime', 'ASC'],
    ],
  });

  return rows
    .filter((slot) => slot.instructorUserId != null && slot.instructorUserId > 0)
    .map((slot) => ({
      slotId: slot.id,
      bookingId: slot.bookingId,
      dateIso: String(slot.dateIso).slice(0, 10),
      slotTime: slot.slotTime,
      instructorUserId: slot.instructorUserId!,
      booking: (slot as unknown as { booking: BookingType }).booking,
    }));
}

/** Bookings in range that predate per-slot rows (expanded via time range). */
export async function findLegacyBookingsWithoutSlots(query: SlotInRangeQuery): Promise<BookingType[]> {
  const where: Record<string, unknown> = {
    dateIso: dateBetween(query),
    instructorUserId: { [Op.ne]: null },
    [Op.and]: literal(
      'NOT EXISTS (SELECT 1 FROM `booking_slots` AS `s` WHERE s.`booking_id` = `Booking`.`id`)',
    ),
    ...bookingWhereFromQuery(query),
  };
  if (query.instructorUserId != null && query.instructorUserId > 0) {
    where.instructorUserId = query.instructorUserId;
  }

  return Booking.findAll({
    where,
    order: [
      ['dateIso', 'ASC'],
      ['time', 'ASC'],
    ],
  });
}

export function bookingStatusReservesSlot(status: unknown): boolean {
  const s = String(status ?? '').trim();
  return (SLOT_RESERVING_BOOKING_STATUSES as readonly string[]).includes(s);
}

function normalizeLifecycleStatus(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'pending_prebook') return 'pending';
  if (s === 'completed') return 'confirmed';
  return s;
}

function isBookingActiveForProgress(
  row: Pick<BookingType, 'status' | 'paidAt' | 'paymentStatus'>,
): boolean {
  const st = normalizeLifecycleStatus(String(row.status ?? ''));
  if (!BOOKING_STATUSES_COUNTED_FOR_PROGRESS.has(st)) return false;
  if (st === 'pending_payment') {
    const paid = row.paidAt != null || row.paymentStatus === 'paid';
    if (!paid) return false;
  }
  return true;
}

export function slotEndUtcMs(dateIso: string, slotTime: string): number {
  const startMs = lessonInstantUtcMs(dateIso, slotTime);
  if (!Number.isFinite(startMs)) return Number.NaN;
  return startMs + 3_600_000;
}

/** Active calendar slot that should count toward director instructor-hours (matches day graphic). */
export function bookingCountsForDirectorHours(
  row: Pick<BookingType, 'status' | 'lessonCompletionStatus' | 'lessonPassedSuccessfully'>,
): boolean {
  if (!bookingStatusReservesSlot(row.status)) return false;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs && EXCLUDED_LESSON_COMPLETION.has(cs)) return false;
  if (row.lessonPassedSuccessfully === false) return false;
  return true;
}

/** Confirmed practical slot eligible for instructor salary. */
export function bookingCountsForSalary(
  row: Pick<
    BookingType,
    'instructorUserId' | 'status' | 'lessonCompletionStatus' | 'lessonPassedSuccessfully'
  >,
): boolean {
  if (row.instructorUserId == null || row.instructorUserId <= 0) return false;
  if (normalizeLifecycleStatus(String(row.status ?? '')) !== 'confirmed') return false;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs && EXCLUDED_LESSON_COMPLETION.has(cs)) return false;
  if (row.lessonPassedSuccessfully === false) return false;
  return true;
}

export function slotCountsAsCompleted(
  dateIso: string,
  slotTime: string,
  row: Pick<
    BookingType,
    'status' | 'lessonCompletionStatus' | 'lessonPassedSuccessfully' | 'paidAt' | 'paymentStatus'
  >,
  now: Date,
): boolean {
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed') return true;
  if (cs && EXCLUDED_LESSON_COMPLETION.has(cs)) return false;
  if (row.lessonPassedSuccessfully === false) return false;
  if (!isBookingActiveForProgress(row)) return false;
  const endMs = slotEndUtcMs(dateIso, slotTime);
  return Number.isFinite(endMs) && endMs <= now.getTime();
}

export function slotCountsAsCancelled(
  row: Pick<BookingType, 'status' | 'lessonCompletionStatus'>,
): boolean {
  const st = normalizeLifecycleStatus(String(row.status ?? ''));
  if (st === 'cancelled' || st === 'refunded') return true;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  return (
    cs === 'cancelled' ||
    cs === 'cancelled_no_refund' ||
    cs === 'refunded' ||
    cs === 'missed'
  );
}

export function slotCountsAsUpcoming(
  dateIso: string,
  slotTime: string,
  row: Pick<
    BookingType,
    'status' | 'lessonCompletionStatus' | 'lessonPassedSuccessfully' | 'paidAt' | 'paymentStatus'
  >,
  now: Date,
): boolean {
  if (!isBookingActiveForProgress(row)) return false;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed' || cs === 'missed') return false;
  const endMs = slotEndUtcMs(dateIso, slotTime);
  return Number.isFinite(endMs) && endMs > now.getTime();
}

/** Legacy bookings without `booking_slots` rows — completion uses the full booking window. */
export function legacyBookingCountsAsCompleted(
  row: Pick<
    BookingType,
    'dateIso' | 'time' | 'endTime' | 'status' | 'lessonCompletionStatus' | 'lessonPassedSuccessfully' | 'paidAt' | 'paymentStatus'
  >,
  now: Date,
): boolean {
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed') return true;
  if (cs && EXCLUDED_LESSON_COMPLETION.has(cs)) return false;
  if (row.lessonPassedSuccessfully === false) return false;
  if (!isBookingActiveForProgress(row)) return false;
  const endMs = bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime);
  return Number.isFinite(endMs) && endMs <= now.getTime();
}

export function legacyBookingCountsAsUpcoming(
  row: Pick<
    BookingType,
    'dateIso' | 'time' | 'endTime' | 'status' | 'lessonCompletionStatus' | 'lessonPassedSuccessfully' | 'paidAt' | 'paymentStatus'
  >,
  now: Date,
): boolean {
  if (!isBookingActiveForProgress(row)) return false;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed' || cs === 'missed') return false;
  const endMs = bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime);
  return Number.isFinite(endMs) && endMs > now.getTime();
}

/** Hour slots between start (inclusive) and end (exclusive); legacy rows without endTime count as 1. */
export function slotCountFromTimeRange(
  dateIso: string,
  timeStart: string,
  endTimeExclusive: string | null | undefined,
): number {
  const startMs = lessonInstantUtcMs(dateIso, timeStart);
  const endMs = bookingEndUtcMs(dateIso, timeStart, endTimeExclusive);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 1;
  return Math.max(1, Math.round((endMs - startMs) / 3_600_000));
}

/** Completed lesson slots grouped by calendar date (for daily instructor totals). */
export function completedLessonSlotsByDateFromBooking(
  row: Pick<BookingType, 'dateIso' | 'time' | 'endTime'>,
  slotRows?: readonly SlotRow[],
): Map<string, number> {
  const byDate = new Map<string, number>();
  if (slotRows && slotRows.length > 0) {
    for (const s of slotRows) {
      const d = String(s.dateIso).slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + 1);
    }
    return byDate;
  }
  const d = String(row.dateIso).slice(0, 10);
  byDate.set(d, slotCountFromTimeRange(d, String(row.time), row.endTime));
  return byDate;
}

/** Total completed lesson slots on a booking (all dates). */
export function completedLessonSlotCountFromBooking(
  row: Pick<BookingType, 'dateIso' | 'time' | 'endTime'>,
  slotRows?: readonly SlotRow[],
): number {
  let total = 0;
  for (const n of completedLessonSlotsByDateFromBooking(row, slotRows).values()) total += n;
  return total;
}

export async function loadBookingSlotsByBookingId(
  bookingIds: readonly number[],
): Promise<Map<number, SlotRow[]>> {
  const map = new Map<number, SlotRow[]>();
  if (bookingIds.length === 0) return map;
  const rows = await BookingSlotModel.findAll({
    where: { bookingId: { [Op.in]: [...bookingIds] } },
    attributes: ['bookingId', 'dateIso'],
  });
  for (const s of rows) {
    const list = map.get(s.bookingId) ?? [];
    list.push(s);
    map.set(s.bookingId, list);
  }
  return map;
}

export async function loadBookingSlotDetailsByBookingId(
  bookingIds: readonly number[],
): Promise<Map<number, BookingSlotDetail[]>> {
  const map = new Map<number, BookingSlotDetail[]>();
  if (bookingIds.length === 0) return map;
  const rows = await BookingSlotModel.findAll({
    where: { bookingId: { [Op.in]: [...bookingIds] } },
    attributes: ['bookingId', 'dateIso', 'slotTime', 'paymentCovered'],
    order: [
      ['dateIso', 'ASC'],
      ['slotTime', 'ASC'],
    ],
  });
  for (const s of rows) {
    const list = map.get(s.bookingId) ?? [];
    list.push({
      dateIso: String(s.dateIso).slice(0, 10),
      slotTime: s.slotTime,
      paymentCovered: Boolean(s.paymentCovered),
    });
    map.set(s.bookingId, list);
  }
  return map;
}
