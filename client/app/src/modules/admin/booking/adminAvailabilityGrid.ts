import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import { branchDisplayLabel, branchMinimalLabel } from "src/modules/branches";
import {
  branchIdsEffectiveOnAnyDate,
  type BranchMembershipInstructor,
} from "src/modules/instructors/instructorTemporaryTransfer";
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
  /**
   * From busy-slots API. Theory-group sessions use `theory_group` (not a booking type).
   * Practical matrix cells should count only `practical`.
   */
  lessonType?: "practical" | "theory" | "theory_personal" | "theory_group" | string | null;
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

/** One instructor × branch column in the availability / day grids (all columns are bookable). */
export type DayGridInstructorColumn = {
  instructor: Instructor;
  bookingBranchId: string;
  bookingBranchName: string;
  /** Compact branch label for multi-branch instructor headers (from branch.label, else derived). */
  branchCode: string;
  showBranchCode: boolean;
};

/** @deprecated Import from `src/modules/branches` instead. */
export { branchMinimalLabel, branchDisplayLabel };

/** @deprecated Prefer {@link branchMinimalLabel}. */
export function branchShortCode(name: string): string {
  return branchMinimalLabel(name);
}

export type InstructorBranchColumnOptions = {
  /** When set, a column is included only if that branch is effective on at least one of these dates. */
  dateIsos?: readonly string[];
  /**
   * Keep a column when a lesson is already booked on a branch this instructor is
   * attached to, even if a temporary transfer moved them off it for these dates.
   * Bookings on any other branch do not add a column.
   */
  bookedColumns?: readonly { instructorId: string; branchId: string }[];
};

/** Permanent branch links only. A booking elsewhere must not look like an attachment. */
function linkedBranchIds(instructor: BranchMembershipInstructor): Set<string> {
  return new Set((instructor.availableBranchIds ?? []).map((id) => String(id).trim()).filter(Boolean));
}

/** Empty / missing filter means every branch. A string or a non-empty list limits columns. */
export function branchIdFilterSet(
  branchIdFilter?: string | readonly string[] | null,
): Set<string> | null {
  if (branchIdFilter == null) return null;
  const raw = typeof branchIdFilter === "string" ? [branchIdFilter] : branchIdFilter;
  const ids = [...raw].map((id) => String(id).trim()).filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
}

/**
 * Flat instructor columns: one column per instructor × served branch.
 * Multi-branch instructors are listed first (adjacent columns per branch), then single-branch.
 * Labels come from each branch’s `label` (else {@link branchMinimalLabel} on `name`).
 * When `branchIdFilter` is a branch id or a list of ids, only those columns are included.
 * When `options.dateIsos` is set, membership follows temporary transfers for those dates.
 */
export function buildInstructorBranchColumns(
  branches: readonly Branch[],
  instructors: readonly Instructor[],
  branchIdFilter?: string | readonly string[] | null,
  options?: InstructorBranchColumnOptions,
): DayGridInstructorColumn[] {
  const filterIds = branchIdFilterSet(branchIdFilter);
  const byId = new Map(branches.map((b) => [String(b.id), b]));
  const dateIsos = (options?.dateIsos ?? []).map((day) => day.slice(0, 10)).filter(Boolean);
  const bookedByInstructor = new Map<string, Set<string>>();
  for (const booked of options?.bookedColumns ?? []) {
    const instructorId = String(booked.instructorId);
    const branchId = String(booked.branchId).trim();
    if (!instructorId || !branchId) continue;
    const set = bookedByInstructor.get(instructorId) ?? new Set<string>();
    set.add(branchId);
    bookedByInstructor.set(instructorId, set);
  }

  const withServed = instructors.map((ins) => {
    const servedIds = new Set(
      dateIsos.length > 0
        ? branchIdsEffectiveOnAnyDate(ins, dateIsos)
        : (ins.availableBranchIds ?? []).map(String),
    );
    const linked = linkedBranchIds(ins);
    for (const branchId of bookedByInstructor.get(String(ins.id)) ?? []) {
      if (linked.has(branchId)) servedIds.add(branchId);
    }
    const allServed = [...servedIds]
      .map((id) => byId.get(String(id)))
      .filter((b): b is Branch => Boolean(b))
      .sort((a, b) => a.name.localeCompare(b.name, "hy"));
    const served = filterIds ? allServed.filter((b) => filterIds.has(String(b.id))) : allServed;
    return { ins, allServed, served };
  });

  withServed.sort((a, b) => {
    const aMulti = a.allServed.length > 1 ? 0 : 1;
    const bMulti = b.allServed.length > 1 ? 0 : 1;
    if (aMulti !== bMulti) return aMulti - bMulti;
    return a.ins.name.localeCompare(b.ins.name, "hy");
  });

  const columns: DayGridInstructorColumn[] = [];
  for (const { ins, allServed, served } of withServed) {
    if (served.length === 0) continue;
    const showBranchCode = allServed.length > 1;
    for (const b of served) {
      columns.push({
        instructor: ins,
        bookingBranchId: String(b.id),
        bookingBranchName: b.name,
        branchCode: branchDisplayLabel(b),
        showBranchCode,
      });
    }
  }
  return columns;
}

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
  options?: {
    /** When set, only slots whose `lessonType` is in this list are counted. */
    lessonTypes?: readonly string[];
  },
): Map<string, number> {
  const allow = options?.lessonTypes?.length ? new Set(options.lessonTypes) : null;
  const counts = new Map<string, number>();
  for (const instructorId of instructorIds) {
    const rows = busyByInstructor.get(instructorId) ?? [];
    for (const row of rows) {
      if (allow) {
        // Missing lessonType: treat group placeholders (studentUserId 0) as theory_group;
        // otherwise assume practical for older API payloads.
        const lt =
          row.lessonType ?? (row.studentUserId === 0 ? "theory_group" : "practical");
        if (!allow.has(lt)) continue;
      }
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
