import { normalizeTimeHHMM, parseTimeToMinutes } from "./booking-slot.util";

export type PracticalSlotPlanRow = { time: string | null };

export const DEFAULT_PRACTICAL_SLOT_PLAN: readonly PracticalSlotPlanRow[] = [
  { time: "07:00" },
  { time: "08:00" },
  { time: "09:00" },
  { time: "10:00" },
  { time: "11:00" },
  { time: "12:10" },
  { time: "13:20" },
  { time: "15:00" },
  { time: "16:10" },
  { time: "17:20" },
  { time: "18:30" },
  { time: "19:40" },
  { time: "20:50" },
];

export function sortPracticalSlotPlanRows(rows: readonly PracticalSlotPlanRow[]): PracticalSlotPlanRow[] {
  const breaks: PracticalSlotPlanRow[] = [];
  const timed: { time: string; mins: number }[] = [];
  for (const r of rows) {
    if (r.time == null || r.time === "") {
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
    if (item == null || typeof item !== "object") continue;
    const tRaw = (item as { time?: unknown }).time;
    if (tRaw == null || tRaw === "") {
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

export function bookableTimesFromPlan(plan: readonly PracticalSlotPlanRow[]): string[] {
  const set = new Set<string>();
  for (const row of plan) {
    if (row.time) set.add(row.time);
  }
  return [...set].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

export function exclusiveEndForPracticalSlot(time: string, plan: readonly PracticalSlotPlanRow[]): string {
  const start = normalizeTimeHHMM(time);
  if (!start) return time;
  const bookable = bookableTimesFromPlan(plan);
  const idx = bookable.indexOf(start);
  if (idx >= 0 && idx < bookable.length - 1) {
    return bookable[idx + 1]!;
  }
  const startM = parseTimeToMinutes(start);
  const h = Math.floor((startM + 70) / 60);
  const m = (startM + 70) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function practicalSlotRangeMinutes(
  time: string,
  plan: readonly PracticalSlotPlanRow[],
): { start: number; end: number } {
  const start = parseTimeToMinutes(normalizeTimeHHMM(time) ?? time);
  const end = parseTimeToMinutes(exclusiveEndForPracticalSlot(time, plan));
  return { start, end: Number.isFinite(end) && end > start ? end : start + 60 };
}

/** True when each time is the next bookable slot after the previous. */
export function areConsecutiveInPracticalPlan(
  sorted: readonly string[],
  plan: readonly PracticalSlotPlanRow[],
): boolean {
  if (sorted.length <= 1) return sorted.length === 1;
  const bookable = bookableTimesFromPlan(plan);
  const indices = sorted.map((t) => bookable.indexOf(normalizeTimeHHMM(t) ?? padTime(t)));
  if (indices.some((i) => i < 0)) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1]! + 1) return false;
  }
  return true;
}

function padTime(t: string): string {
  const n = normalizeTimeHHMM(t);
  return n ?? t;
}

/** Bookable starts = branch school grid ∩ instructor working slots. */
export function effectiveBookableTimes(
  branchPlan: readonly PracticalSlotPlanRow[],
  instructorPlan: readonly PracticalSlotPlanRow[],
): string[] {
  const branch = bookableTimesFromPlan(branchPlan);
  const instructorSet = new Set(bookableTimesFromPlan(instructorPlan));
  return branch.filter((t) => instructorSet.has(t));
}

export function resolveEffectiveBookableTimes(
  branchPlan: readonly PracticalSlotPlanRow[],
  instructorPlan: readonly PracticalSlotPlanRow[],
  instructorCustomized: boolean,
): string[] {
  const branch = bookableTimesFromPlan(branchPlan);
  if (!instructorCustomized) return branch;
  return effectiveBookableTimes(branchPlan, instructorPlan);
}

export function exclusiveEndForBookableTime(time: string, bookableSorted: readonly string[]): string {
  const start = normalizeTimeHHMM(time);
  if (!start) return time;
  const idx = bookableSorted.indexOf(start);
  if (idx >= 0 && idx < bookableSorted.length - 1) {
    return bookableSorted[idx + 1]!;
  }
  const startM = parseTimeToMinutes(start);
  const h = Math.floor((startM + 70) / 60);
  const m = (startM + 70) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function practicalSlotRangeMinutesFromBookable(
  time: string,
  bookableSorted: readonly string[],
): { start: number; end: number } {
  const start = parseTimeToMinutes(normalizeTimeHHMM(time) ?? time);
  const end = parseTimeToMinutes(exclusiveEndForBookableTime(time, bookableSorted));
  return { start, end: Number.isFinite(end) && end > start ? end : start + 60 };
}

export function areConsecutiveInBookableTimes(sorted: readonly string[], bookableSorted: readonly string[]): boolean {
  if (sorted.length <= 1) return sorted.length === 1;
  const indices = sorted.map((t) => bookableSorted.indexOf(normalizeTimeHHMM(t) ?? padTime(t)));
  if (indices.some((i) => i < 0)) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1]! + 1) return false;
  }
  return true;
}
