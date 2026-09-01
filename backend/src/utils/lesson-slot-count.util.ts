import { Op } from 'sequelize';
import type { Booking } from '../models/booking.model';
import type { BookingSlot } from '../models/booking-slot.model';
import { BookingSlot as BookingSlotModel } from '../models';
import { bookingEndUtcMs, lessonInstantUtcMs } from './lesson-datetime.util';

type SlotRow = Pick<BookingSlot, 'dateIso'>;

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
  row: Pick<Booking, 'dateIso' | 'time' | 'endTime'>,
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
  row: Pick<Booking, 'dateIso' | 'time' | 'endTime'>,
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
