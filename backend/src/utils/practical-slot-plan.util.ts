import { normalizeTimeHHMM, parseTimeToMinutes, minutesToHHMM } from './booking-slot.util';

/** One row in the daily practical schedule (empty time = break / not bookable). */
export type PracticalSlotPlanRow = { time: string | null };

export const PRACTICAL_SLOT_PLAN_SETTING_KEY = 'practical_slot_plan';

/** Default schedule: 13:20 is a bookable slot; gap until 15:00 is lunch (no empty row). */
export const DEFAULT_PRACTICAL_SLOT_PLAN: readonly PracticalSlotPlanRow[] = [
  { time: '07:00' },
  { time: '08:00' },
  { time: '09:00' },
  { time: '10:00' },
  { time: '11:00' },
  { time: '12:10' },
  { time: '13:20' },
  { time: '15:00' },
  { time: '16:10' },
  { time: '17:20' },
  { time: '18:30' },
  { time: '19:40' },
  { time: '20:50' },
];

/** Sort bookable rows by time; break rows (null) stay at the end in listed order. */
export function sortPracticalSlotPlanRows(rows: readonly PracticalSlotPlanRow[]): PracticalSlotPlanRow[] {
  const breaks: PracticalSlotPlanRow[] = [];
  const timed: { time: string; mins: number }[] = [];
  for (const r of rows) {
    if (r.time == null || r.time === '') {
      breaks.push({ time: null });
      continue;
    }
    const n = normalizeTimeHHMM(String(r.time));
    if (!n) continue;
    timed.push({ time: n, mins: parseTimeToMinutes(n) });
  }
  timed.sort((a, b) => a.mins - b.mins);
  return [...timed.map((t) => ({ time: t.time })), ...breaks];
}

export function normalizePracticalSlotPlan(raw: unknown): PracticalSlotPlanRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
  }
  const out: PracticalSlotPlanRow[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const tRaw = (item as { time?: unknown }).time;
    if (tRaw == null || tRaw === '') {
      out.push({ time: null });
      continue;
    }
    const n = normalizeTimeHHMM(String(tRaw));
    if (n) out.push({ time: n });
  }
  if (out.length === 0) {
    return DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
  }
  return sortPracticalSlotPlanRows(out);
}

/** Sorted unique bookable start times from the plan. */
export function bookableTimesFromPlan(plan: readonly PracticalSlotPlanRow[]): string[] {
  const set = new Set<string>();
  for (const row of plan) {
    if (row.time) set.add(row.time);
  }
  return [...set].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

export function isTimeInPracticalPlan(time: string, plan: readonly PracticalSlotPlanRow[]): boolean {
  const n = normalizeTimeHHMM(time);
  if (!n) return false;
  return bookableTimesFromPlan(plan).includes(n);
}

/** Exclusive end for a lesson starting at `time` (next plan slot, or +70 min after last). */
export function exclusiveEndForPracticalSlot(time: string, plan: readonly PracticalSlotPlanRow[]): string {
  const start = normalizeTimeHHMM(time);
  if (!start) return time;
  const bookable = bookableTimesFromPlan(plan);
  const idx = bookable.indexOf(start);
  if (idx >= 0 && idx < bookable.length - 1) {
    return bookable[idx + 1]!;
  }
  const startM = parseTimeToMinutes(start);
  return minutesToHHMM(startM + 70);
}

/** Half-open [start, end) in minutes for overlap checks. */
export function practicalSlotRangeMinutes(
  time: string,
  plan: readonly PracticalSlotPlanRow[],
): { start: number; end: number } {
  const start = parseTimeToMinutes(normalizeTimeHHMM(time) ?? time);
  const end = parseTimeToMinutes(exclusiveEndForPracticalSlot(time, plan));
  return { start, end: Number.isFinite(end) && end > start ? end : start + 60 };
}

export function normalizePracticalSlotStarts(
  slots: readonly string[],
  plan: readonly PracticalSlotPlanRow[],
): string[] {
  const allowed = new Set(bookableTimesFromPlan(plan));
  const set = new Set<string>();
  for (const raw of slots) {
    const n = normalizeTimeHHMM(raw);
    if (!n || !allowed.has(n)) {
      throw new Error(`Slot ${raw} is not in the practical schedule.`);
    }
    set.add(n);
  }
  return [...set].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

export function exclusiveEndFromPracticalStarts(
  sorted: readonly string[],
  plan: readonly PracticalSlotPlanRow[],
): string {
  if (sorted.length === 0) return '00:00';
  const last = sorted[sorted.length - 1]!;
  return exclusiveEndForPracticalSlot(last, plan);
}

/** True when each time is the next bookable slot after the previous (same-day multi-lesson). */
export function areConsecutiveInPracticalPlan(
  sorted: readonly string[],
  plan: readonly PracticalSlotPlanRow[],
): boolean {
  return areConsecutiveInBookableTimes(sorted, bookableTimesFromPlan(plan));
}

/** Intersection: school branch grid ∩ instructor working slots. */
export function effectiveBookableTimes(
  branchPlan: readonly PracticalSlotPlanRow[],
  instructorPlan: readonly PracticalSlotPlanRow[],
): string[] {
  const branch = bookableTimesFromPlan(branchPlan);
  const instructorSet = new Set(bookableTimesFromPlan(instructorPlan));
  return branch.filter((t) => instructorSet.has(t));
}

/**
 * When the instructor has no saved plan, use the full branch grid (includes custom branch slots).
 * After they save a working-slots plan, only times in both branch and instructor lists apply.
 */
export function resolveEffectiveBookableTimes(
  branchPlan: readonly PracticalSlotPlanRow[],
  instructorPlan: readonly PracticalSlotPlanRow[],
  instructorCustomized: boolean,
): string[] {
  const branch = bookableTimesFromPlan(branchPlan);
  if (!instructorCustomized) return branch;
  return effectiveBookableTimes(branchPlan, instructorPlan);
}

export function isTimeInEffectivePracticalPlan(
  time: string,
  branchPlan: readonly PracticalSlotPlanRow[],
  instructorPlan: readonly PracticalSlotPlanRow[],
): boolean {
  const n = normalizeTimeHHMM(time);
  if (!n) return false;
  return effectiveBookableTimes(branchPlan, instructorPlan).includes(n);
}

export function exclusiveEndForBookableTime(time: string, bookableSorted: readonly string[]): string {
  const start = normalizeTimeHHMM(time);
  if (!start) return time;
  const idx = bookableSorted.indexOf(start);
  if (idx >= 0 && idx < bookableSorted.length - 1) {
    return bookableSorted[idx + 1]!;
  }
  return minutesToHHMM(parseTimeToMinutes(start) + 70);
}

export function practicalSlotRangeMinutesFromBookable(
  time: string,
  bookableSorted: readonly string[],
): { start: number; end: number } {
  const start = parseTimeToMinutes(normalizeTimeHHMM(time) ?? time);
  const end = parseTimeToMinutes(exclusiveEndForBookableTime(time, bookableSorted));
  return { start, end: Number.isFinite(end) && end > start ? end : start + 60 };
}

export function normalizePracticalSlotStartsFromBookable(
  slots: readonly string[],
  bookableSorted: readonly string[],
): string[] {
  const allowed = new Set(bookableSorted);
  const set = new Set<string>();
  for (const raw of slots) {
    const n = normalizeTimeHHMM(raw);
    if (!n || !allowed.has(n)) {
      throw new Error(`Slot ${raw} is not in the practical schedule.`);
    }
    set.add(n);
  }
  return [...set].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

export function exclusiveEndFromBookableStarts(sorted: readonly string[], bookableSorted: readonly string[]): string {
  if (sorted.length === 0) return '00:00';
  return exclusiveEndForBookableTime(sorted[sorted.length - 1]!, bookableSorted);
}

export function areConsecutiveInBookableTimes(sorted: readonly string[], bookableSorted: readonly string[]): boolean {
  if (sorted.length <= 1) return sorted.length === 1;
  const indices = sorted.map((t) => bookableSorted.indexOf(normalizeTimeHHMM(t) ?? t));
  if (indices.some((i) => i < 0)) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1]! + 1) return false;
  }
  return true;
}
