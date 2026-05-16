import { BOOKING_SLOT_TZ_OFFSET } from './booking-slot.util';

function normalizeHm(v: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(v.trim());
  if (!m) return v.trim().slice(0, 5);
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`;
}

/** UTC ms at the start of an HH:MM slot on `dateIso` (Asia/Yerevan offset). */
export function lessonInstantUtcMs(dateIso: string, timeHHMM: string): number {
  const d = dateIso.slice(0, 10);
  const t = normalizeHm(timeHHMM);
  return Date.parse(`${d}T${t}:00${BOOKING_SLOT_TZ_OFFSET}`);
}

/** UTC ms when a lesson ends (exclusive end time on the same calendar day). */
export function lessonEndUtcMs(dateIso: string, endTimeHHMM: string): number {
  return lessonInstantUtcMs(dateIso, endTimeHHMM);
}

/** End of a booking row: `endTime` exclusive, or one hour after `time`. */
export function bookingEndUtcMs(dateIso: string, timeStart: string, endTimeExclusive: string | null | undefined): number {
  if (endTimeExclusive?.trim()) {
    return lessonEndUtcMs(dateIso, endTimeExclusive);
  }
  const startMs = lessonInstantUtcMs(dateIso, timeStart);
  if (!Number.isFinite(startMs)) return Number.NaN;
  return startMs + 3_600_000;
}

export function isLessonEndInPast(dateIso: string, endTimeHHMM: string, now = new Date()): boolean {
  const ms = lessonEndUtcMs(dateIso, endTimeHHMM);
  if (!Number.isFinite(ms)) return false;
  return ms <= now.getTime();
}

export function isBookingEndInPast(
  dateIso: string,
  timeStart: string,
  endTimeExclusive: string | null | undefined,
  now = new Date(),
): boolean {
  const ms = bookingEndUtcMs(dateIso, timeStart, endTimeExclusive);
  if (!Number.isFinite(ms)) return false;
  return ms <= now.getTime();
}
