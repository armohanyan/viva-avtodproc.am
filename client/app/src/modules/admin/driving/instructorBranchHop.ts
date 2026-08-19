import {
  minutesToHHMM,
  normalizeTimeHHMM,
  parseTimeToMinutes,
} from "src/modules/booking/booking-slot.util";

/** Adjacent practical slots are ~70 minutes; under this, travel is especially tight. */
export const TIGHT_BRANCH_HOP_GAP_MINUTES = 90;

const DEFAULT_LESSON_MINUTES = 70;

export type InstructorDayLesson = {
  start: string;
  end: string;
  branchId: string;
  branchName: string;
};

export type BranchHopNeighbor = {
  branchName: string;
  time: string;
  gapMinutes: number;
};

export type BranchHopWarning = {
  previous: BranchHopNeighbor | null;
  next: BranchHopNeighbor | null;
  tight: boolean;
};

export type ClassScheduleHopItem = {
  bookingId: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  instructor?: { id: number | null };
  branch?: { id: number; name: string };
};

function padTime(raw: string | undefined): string | null {
  if (!raw) return null;
  return normalizeTimeHHMM(raw.length >= 5 ? raw.slice(0, 5) : raw);
}

function fallbackEnd(start: string, end: string | null): string {
  if (end && parseTimeToMinutes(end) > parseTimeToMinutes(start)) return end;
  const startM = parseTimeToMinutes(start);
  if (!Number.isFinite(startM)) return start;
  return minutesToHHMM(Math.min(23 * 60 + 59, startM + DEFAULT_LESSON_MINUTES));
}

/** Merge same-booking occurrences into one occupied window per instructor/day. */
export function instructorDayLessons(
  items: readonly ClassScheduleHopItem[],
  instructorId: number,
  dateIso: string,
): InstructorDayLesson[] {
  const day = dateIso.slice(0, 10);
  const id = Number(instructorId);
  if (!day || !Number.isFinite(id) || id <= 0) return [];

  const byBooking = new Map<number, InstructorDayLesson>();
  for (const item of items) {
    if (String(item.date ?? "").slice(0, 10) !== day) continue;
    if (Number(item.instructor?.id) !== id) continue;
    const start = padTime(item.startTime);
    if (!start) continue;
    const branchId = String(item.branch?.id ?? "");
    if (!branchId) continue;
    const branchName = (item.branch?.name ?? "").trim() || branchId;
    const end = fallbackEnd(start, padTime(item.endTime));
    const prev = byBooking.get(item.bookingId);
    if (!prev) {
      byBooking.set(item.bookingId, { start, end, branchId, branchName });
      continue;
    }
    const nextStart =
      parseTimeToMinutes(start) < parseTimeToMinutes(prev.start) ? start : prev.start;
    const nextEnd = parseTimeToMinutes(end) > parseTimeToMinutes(prev.end) ? end : prev.end;
    byBooking.set(item.bookingId, {
      start: nextStart,
      end: nextEnd,
      branchId: prev.branchId,
      branchName: prev.branchName,
    });
  }

  return [...byBooking.values()].sort(
    (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start),
  );
}

export function findBranchHop(
  lessons: readonly InstructorDayLesson[],
  proposed: { start: string; end: string; branchId: string },
): BranchHopWarning | null {
  const start = padTime(proposed.start);
  const end = padTime(proposed.end);
  const branchId = String(proposed.branchId ?? "").trim();
  if (!start || !end || !branchId) return null;
  const startM = parseTimeToMinutes(start);
  const endM = parseTimeToMinutes(end);
  if (!Number.isFinite(startM) || !Number.isFinite(endM) || endM <= startM) return null;

  let prev: InstructorDayLesson | null = null;
  let next: InstructorDayLesson | null = null;
  for (const lesson of lessons) {
    const ls = parseTimeToMinutes(lesson.start);
    const le = parseTimeToMinutes(lesson.end);
    if (!Number.isFinite(ls) || !Number.isFinite(le)) continue;
    if (le > startM && ls < endM) continue;
    if (le <= startM) {
      if (!prev || parseTimeToMinutes(prev.end) < le) prev = lesson;
    } else if (ls >= endM) {
      if (!next || parseTimeToMinutes(next.start) > ls) next = lesson;
    }
  }

  const previous =
    prev && prev.branchId !== branchId
      ? {
          branchName: prev.branchName,
          time: prev.end,
          gapMinutes: startM - parseTimeToMinutes(prev.end),
        }
      : null;
  const nextHop =
    next && next.branchId !== branchId
      ? {
          branchName: next.branchName,
          time: next.start,
          gapMinutes: parseTimeToMinutes(next.start) - endM,
        }
      : null;

  if (!previous && !nextHop) return null;
  const tight = [previous, nextHop].some(
    (n) => n != null && n.gapMinutes < TIGHT_BRANCH_HOP_GAP_MINUTES,
  );
  return { previous, next: nextHop, tight };
}
