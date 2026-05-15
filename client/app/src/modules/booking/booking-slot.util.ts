/**
 * Booking slot helpers — mirrors backend `booking-slot.util.ts` (Asia/Yerevan).
 */

export type BranchScheduleRule = {
  ruleKind: "work_hours" | "day_off";
  weekday: number | null;
  dateIso: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  allDay: boolean;
};

export type SlotUnavailabilityReason = "past" | "outside_hours" | "branch_closed" | "unavailable";

export const DEFAULT_BRANCH_OPEN = "09:00";
export const DEFAULT_BRANCH_CLOSE = "18:00";

const SLOT_OFFSET = "+04:00";

export function normalizeTimeHHMM(v: string): string | null {
  const t = v.trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseTimeToMinutes(t: string): number {
  const n = normalizeTimeHHMM(t);
  if (n == null) return NaN;
  const m = /^(\d{1,2}):(\d{2})/.exec(n);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function slotStartUtcMs(dateIso: string, timeHHMM: string): number {
  const t = normalizeTimeHHMM(timeHHMM) ?? timeHHMM.trim();
  return Date.parse(`${dateIso.slice(0, 10)}T${t}:00${SLOT_OFFSET}`);
}

export function isSlotStartInPast(dateIso: string, timeHHMM: string, now = new Date()): boolean {
  const ms = slotStartUtcMs(dateIso, timeHHMM);
  if (!Number.isFinite(ms)) return true;
  return ms <= now.getTime();
}

export function isSlotDateBeforeToday(dateIso: string, todayIso: string): boolean {
  return dateIso.slice(0, 10) < todayIso.slice(0, 10);
}

export function weekdayMon1ToSun7FromDateIso(dateIso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!m) return 1;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return 1;
  const dt = new Date(y, mo - 1, d);
  const js = dt.getDay();
  return js === 0 ? 7 : js;
}

function slotRangeMinutes(timeSlot: string): { start: number; end: number } {
  const start = parseTimeToMinutes(timeSlot);
  return { start, end: start + 60 };
}

function blockRangeMinutes(timeStart: string, timeEnd: string): { start: number; end: number } {
  return { start: parseTimeToMinutes(timeStart), end: parseTimeToMinutes(timeEnd) };
}

function rangesOverlapHalfOpen(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && a.end > b.start;
}

/** `timeEnd` = last bookable hour start (inclusive): 09:00–18:00 → 09:00 … 18:00. */
function slotStartInsideBranchWorkWindow(
  slot: { start: number; end: number },
  workStart: string,
  workEnd: string,
): boolean {
  const w = blockRangeMinutes(workStart, workEnd);
  return slot.start >= w.start && slot.start <= w.end;
}

export function isSlotBlockedByBranchScheduleRules(
  dateIso: string,
  timeSlot: string,
  rules: readonly BranchScheduleRule[],
): boolean {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const slotRange = slotRangeMinutes(timeSlot);
  const d = dateIso.slice(0, 10);

  for (const b of rules) {
    if (b.ruleKind === "day_off" && b.dateIso === d) {
      if (b.allDay) return true;
      if (b.timeStart && b.timeEnd && rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
  }

  const hasAnyWorkHours = rules.some((b) => b.ruleKind === "work_hours");
  if (!hasAnyWorkHours) return false;

  const workRows = rules.filter((b) => b.ruleKind === "work_hours" && b.weekday === weekday && b.timeStart && b.timeEnd);
  if (workRows.length === 0) return true;

  return !workRows.some((b) => slotStartInsideBranchWorkWindow(slotRange, b.timeStart!, b.timeEnd!));
}

export function branchScheduleBlockReason(
  dateIso: string,
  timeSlot: string,
  rules: readonly BranchScheduleRule[],
): "branch_closed" | "outside_hours" | null {
  const d = dateIso.slice(0, 10);
  const weekday = weekdayMon1ToSun7FromDateIso(d);

  for (const b of rules) {
    if (b.ruleKind === "day_off" && b.dateIso === d) {
      if (b.allDay) return "branch_closed";
      if (b.timeStart && b.timeEnd) {
        const slotRange = slotRangeMinutes(timeSlot);
        if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
          return "branch_closed";
        }
      }
    }
  }

  const hasWork = rules.some((r) => r.ruleKind === "work_hours");
  if (!hasWork) return null;

  const workRows = rules.filter((r) => r.ruleKind === "work_hours" && r.weekday === weekday && r.timeStart && r.timeEnd);
  if (workRows.length === 0) return "branch_closed";

  const slotRange = slotRangeMinutes(timeSlot);
  const inside = workRows.some((r) => slotStartInsideBranchWorkWindow(slotRange, r.timeStart!, r.timeEnd!));
  return inside ? null : "outside_hours";
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hourlySlotStartsForBranchDate(dateIso: string, rules: readonly BranchScheduleRule[]): string[] {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const d = dateIso.slice(0, 10);

  for (const b of rules) {
    if (b.ruleKind === "day_off" && b.dateIso === d && b.allDay) return [];
  }

  const workRows = rules.filter((b) => b.ruleKind === "work_hours" && b.weekday === weekday && b.timeStart && b.timeEnd);
  if (workRows.length === 0) return [];

  const starts = new Set<string>();
  for (const row of workRows) {
    const open = parseTimeToMinutes(row.timeStart!);
    const close = parseTimeToMinutes(row.timeEnd!);
    if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) continue;
    for (let m = open; m <= close; m += 60) {
      const slot = minutesToHHMM(m);
      if (!isSlotBlockedByBranchScheduleRules(d, slot, rules)) {
        starts.add(slot);
      }
    }
  }
  return [...starts].sort((a, b) => a.localeCompare(b));
}

export function hourlySlotStartsForBranchDates(
  dateIsos: readonly string[],
  rules: readonly BranchScheduleRule[],
): string[] {
  const set = new Set<string>();
  for (const d of dateIsos) {
    for (const t of hourlySlotStartsForBranchDate(d, rules)) {
      set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function defaultBranchScheduleRules(): BranchScheduleRule[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    ruleKind: "work_hours" as const,
    weekday,
    dateIso: null,
    timeStart: DEFAULT_BRANCH_OPEN,
    timeEnd: DEFAULT_BRANCH_CLOSE,
    allDay: false,
  }));
}

export function normalizeBranchScheduleFromApi(raw: unknown): BranchScheduleRule[] {
  if (!Array.isArray(raw)) return defaultBranchScheduleRules();
  const out: BranchScheduleRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const kind = String(r.ruleKind ?? "").trim();
    if (kind !== "work_hours" && kind !== "day_off") continue;
    const weekdayRaw = r.weekday;
    const weekday =
      weekdayRaw === null || weekdayRaw === undefined || weekdayRaw === "" ? null : Number(weekdayRaw);
    let dateIso: string | null = null;
    if (r.dateIso != null && r.dateIso !== "") dateIso = String(r.dateIso).slice(0, 10);
    out.push({
      ruleKind: kind,
      weekday: weekday != null && Number.isFinite(weekday) ? weekday : null,
      dateIso,
      timeStart: normalizeTimeHHMM(String(r.timeStart ?? "")),
      timeEnd: normalizeTimeHHMM(String(r.timeEnd ?? "")),
      allDay: Boolean(r.allDay),
    });
  }
  return out.length > 0 ? out : defaultBranchScheduleRules();
}
