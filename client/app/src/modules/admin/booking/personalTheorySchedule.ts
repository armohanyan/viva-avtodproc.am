import type { AvailabilityBlock } from "src/modules/instructors/instructorAvailability";
import { isSlotBlockedByAvailabilityRules } from "src/modules/instructors/instructorAvailability";
import { normalizeTimeHHMM, parseTimeToMinutes } from "src/modules/booking/booking-slot.util";

/** A lesson this close to the new start or end is a warning, not a hard block. */
export const PERSONAL_THEORY_NEAR_SLOT_MINUTES = 60;
export const PERSONAL_THEORY_MIN_DURATION_MINUTES = 15;

export type OccupiedRange = {
  dateIso: string;
  /** Inclusive HH:MM. */
  start: string;
  /** Exclusive HH:MM. `24:00` is allowed. */
  end: string;
  lessonType?: string | null;
};

export type NearOccupiedRange = OccupiedRange & { gapMinutes: number };

export type PersonalTheoryWindowAssessment = {
  valid: boolean;
  durationMinutes: number;
  billableHours: number;
  unavailable: boolean;
  overlap: OccupiedRange | null;
  near: NearOccupiedRange[];
};

function clockMinutes(raw: string): number {
  const t = String(raw ?? "").trim();
  if (/^24:00/.test(t)) return 24 * 60;
  return parseTimeToMinutes(t);
}

/** Each started hour of one personal-theory window, minimum 1 when the window is valid. */
export function theoryPersonalBillableHours(start: string, end: string): number {
  const a = clockMinutes(start);
  const b = clockMinutes(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.max(1, Math.ceil((b - a) / 60));
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Minutes between two half-open ranges. `0` when they touch. Negative when they overlap. */
function gapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  if (rangesOverlap(aStart, aEnd, bStart, bEnd)) return -1;
  if (aEnd <= bStart) return bStart - aEnd;
  return aStart - bEnd;
}

export function assessPersonalTheoryWindow(input: {
  dateIso: string;
  start: string;
  end: string;
  ranges: readonly OccupiedRange[];
  blocks: readonly AvailabilityBlock[];
}): PersonalTheoryWindowAssessment {
  const startNorm = normalizeTimeHHMM(input.start) ?? "";
  const endNorm = /^24:00/.test(String(input.end ?? "").trim()) ? "24:00" : (normalizeTimeHHMM(input.end) ?? "");
  const startM = clockMinutes(startNorm);
  const endM = clockMinutes(endNorm);
  const duration = Number.isFinite(startM) && Number.isFinite(endM) ? endM - startM : 0;
  const valid =
    Boolean(input.dateIso) &&
    Boolean(startNorm) &&
    Boolean(endNorm) &&
    duration >= PERSONAL_THEORY_MIN_DURATION_MINUTES;

  if (!valid) {
    return {
      valid: false,
      durationMinutes: Math.max(0, duration),
      billableHours: 0,
      unavailable: false,
      overlap: null,
      near: [],
    };
  }

  const unavailable = isSlotBlockedByAvailabilityRules(
    input.dateIso.slice(0, 10),
    startNorm,
    input.blocks,
    { start: startM, end: endM },
    { skipLunch: true, skipWorkHours: true },
  );

  const day = input.dateIso.slice(0, 10);
  let overlap: OccupiedRange | null = null;
  const near: NearOccupiedRange[] = [];
  for (const range of input.ranges) {
    if (range.dateIso.slice(0, 10) !== day) continue;
    const rs = clockMinutes(range.start);
    const re = clockMinutes(range.end);
    if (!Number.isFinite(rs) || !Number.isFinite(re) || re <= rs) continue;
    if (rangesOverlap(startM, endM, rs, re)) {
      overlap = overlap ?? range;
      continue;
    }
    const gap = gapMinutes(startM, endM, rs, re);
    if (gap >= 0 && gap <= PERSONAL_THEORY_NEAR_SLOT_MINUTES) {
      near.push({ ...range, gapMinutes: gap });
    }
  }
  near.sort((a, b) => a.gapMinutes - b.gapMinutes || a.start.localeCompare(b.start));

  return {
    valid: true,
    durationMinutes: duration,
    billableHours: theoryPersonalBillableHours(startNorm, endNorm),
    unavailable,
    overlap,
    near,
  };
}

export function formatOccupiedRangeLabel(range: { start: string; end: string }): string {
  const start = normalizeTimeHHMM(range.start) ?? range.start;
  const end = /^24:00/.test(String(range.end).trim()) ? "24:00" : (normalizeTimeHHMM(range.end) ?? range.end);
  return `${start}–${end}`;
}
