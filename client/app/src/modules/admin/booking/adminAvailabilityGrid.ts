import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import { yerevanAddCalendarDays, yerevanAddCalendarMonths, yerevanTodayIso } from "src/lib/yerevanLessonCalendar";

/** Each grid page covers a calendar month — from `start` through the same day-of-month next month, inclusive. */
export const ADMIN_AVAILABILITY_GRID_MONTHS = 1;

const ARMENIAN_WEEKDAY_SHORT = ["Կիր", "Երկ", "Երք", "Չրք", "Հնգ", "Ուրբ", "Շբթ"] as const;

export type InstructorBusySlotRow = {
  dateIso: string;
  time: string;
  studentUserId: number;
  /** Booking branch — used so matrix cells count lessons per instructor × branch. */
  branchId?: number | string;
};

export type GridInstructorColumn = {
  instructor: Instructor;
  branchId: string;
};

export type GridBranchGroup = {
  branchId: string;
  branchName: string;
  instructors: Instructor[];
};

export function padSlotTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}`;
}

export function slotEntryKey(dateIso: string, time: string): string {
  return `${dateIso.slice(0, 10)}\t${padSlotTime(time)}`;
}

export function sortSlotEntriesChrono(
  entries: readonly { dateIso: string; time: string }[],
): { dateIso: string; time: string }[] {
  return [...entries].sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || padSlotTime(a.time).localeCompare(padSlotTime(b.time)),
  );
}

export function sortTimesUnique(times: readonly string[]): string[] {
  const set = new Set(times.map((x) => padSlotTime(x)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Grid date rows from `startIso` through `startIso + months` months (inclusive of the same
 * day-of-month in the target month). E.g. `2026-05-19` → through `2026-06-19` inclusive.
 */
export function gridDateRange(startIso: string, months = ADMIN_AVAILABILITY_GRID_MONTHS): string[] {
  const start = startIso.slice(0, 10);
  const end = yerevanAddCalendarMonths(start, months);
  const out: string[] = [];
  let cur = start;
  // Safety cap so a misordered range can't infinite-loop.
  const SAFETY_MAX = 400;
  let i = 0;
  while (cur <= end && i < SAFETY_MAX) {
    out.push(cur);
    cur = yerevanAddCalendarDays(cur, 1);
    i++;
  }
  return out;
}

export function defaultGridRangeStart(): string {
  return yerevanTodayIso();
}

/** DD.MM.YYYY for the grid date column. */
export function formatGridDateLabel(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  if (!y || !m || !d) return dateIso;
  return `${d}.${m}.${y}`;
}

export function armenianWeekdayShort(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return "";
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return "";
  return ARMENIAN_WEEKDAY_SHORT[date.getDay()] ?? "";
}

/** Instructors grouped under each branch they serve (may appear under multiple branches). */
export function buildBranchInstructorGroups(
  branches: readonly Branch[],
  instructors: readonly Instructor[],
  /** When set (admin global branch filter), only that branch column is shown. */
  branchIdFilter?: string | null,
): GridBranchGroup[] {
  const filterId = branchIdFilter?.trim() || null;
  const sortedBranches = [...branches]
    .filter((b) => !filterId || String(b.id) === filterId)
    .sort((a, b) => a.name.localeCompare(b.name, "hy"));
  const groups: GridBranchGroup[] = [];
  for (const branch of sortedBranches) {
    const cols = instructors
      .filter((ins) => (ins.availableBranchIds ?? []).includes(branch.id))
      .sort((a, b) => a.name.localeCompare(b.name, "hy"));
    if (cols.length === 0) continue;
    groups.push({ branchId: branch.id, branchName: branch.name, instructors: cols });
  }
  return groups;
}

/** Count key: `instructorId|branchId|dateIso` (branch-scoped matrix cells). */
export function busyCountCellKey(instructorId: string, branchId: string, dateIso: string): string {
  return `${instructorId}|${String(branchId).trim()}|${dateIso.slice(0, 10)}`;
}

export function aggregateBusyCountsByInstructorDay(
  instructorIds: readonly string[],
  busyByInstructor: ReadonlyMap<string, InstructorBusySlotRow[]>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const instructorId of instructorIds) {
    const rows = busyByInstructor.get(instructorId) ?? [];
    for (const row of rows) {
      const branchId = row.branchId != null ? String(row.branchId).trim() : "";
      if (!branchId) continue;
      const key = busyCountCellKey(instructorId, branchId, row.dateIso);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export function mergeSlotEntries(
  existing: readonly { dateIso: string; time: string }[],
  added: readonly { dateIso: string; time: string }[],
): { dateIso: string; time: string }[] {
  const map = new Map<string, { dateIso: string; time: string }>();
  for (const e of [...existing, ...added]) {
    map.set(slotEntryKey(e.dateIso, e.time), { dateIso: e.dateIso.slice(0, 10), time: padSlotTime(e.time) });
  }
  return sortSlotEntriesChrono([...map.values()]);
}

export function lessonCountForCell(
  counts: ReadonlyMap<string, number>,
  instructorId: string,
  dateIso: string,
  branchId?: string,
): number {
  const bid = branchId?.trim();
  if (bid) {
    return counts.get(busyCountCellKey(instructorId, bid, dateIso)) ?? 0;
  }
  // Legacy / pending keys without branch: instructorId|dateIso
  return counts.get(`${instructorId}|${dateIso.slice(0, 10)}`) ?? 0;
}

/** Pending admin picks (not yet saved) for one instructor, keyed like {@link lessonCountForCell}. */
export function aggregatePendingCountsByInstructorDay(
  instructorId: string,
  entries: readonly { dateIso: string; time: string }[],
  branchId?: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!instructorId) return counts;
  const bid = branchId?.trim() || "";
  for (const e of entries) {
    const d = e.dateIso.slice(0, 10);
    const key = bid ? busyCountCellKey(instructorId, bid, d) : `${instructorId}|${d}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
