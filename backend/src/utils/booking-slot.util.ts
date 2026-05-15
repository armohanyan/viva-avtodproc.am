/**
 * Shared booking slot time logic (Asia/Yerevan, UTC+4 — matches lesson start parsing in booking.service).
 */

export const BOOKING_SLOT_TZ = 'Asia/Yerevan';
export const BOOKING_SLOT_TZ_OFFSET = '+04:00';

const YEREVAN_TZ = BOOKING_SLOT_TZ;

export type BranchScheduleRuleKind = 'work_hours' | 'day_off';

export type BranchScheduleRuleDto = {
  ruleKind: BranchScheduleRuleKind;
  weekday: number | null;
  dateIso: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  allDay: boolean;
};

export type SlotUnavailabilityReason = 'past' | 'outside_hours' | 'branch_closed' | 'unavailable';

export const DEFAULT_BRANCH_OPEN = '09:00';
export const DEFAULT_BRANCH_CLOSE = '18:00';

/** Calendar today in Yerevan (YYYY-MM-DD). */
export function yerevanTodayIso(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

export function normalizeTimeHHMM(v: string): string | null {
  const t = v.trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function parseTimeToMinutes(t: string): number {
  const n = normalizeTimeHHMM(t);
  if (n == null) return NaN;
  const m = /^(\d{1,2}):(\d{2})/.exec(n);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** UTC ms when the hour slot starts (lesson semantics). */
export function slotStartUtcMs(dateIso: string, timeHHMM: string): number {
  const t = normalizeTimeHHMM(timeHHMM) ?? timeHHMM.trim();
  return Date.parse(`${dateIso.slice(0, 10)}T${t}:00${BOOKING_SLOT_TZ_OFFSET}`);
}

/** True when the slot start is strictly before `now` (Yerevan calendar + slot offset). */
export function isSlotStartInPast(dateIso: string, timeHHMM: string, now = new Date()): boolean {
  const ms = slotStartUtcMs(dateIso, timeHHMM);
  if (!Number.isFinite(ms)) return true;
  return ms <= now.getTime();
}

export function isSlotDateBeforeToday(dateIso: string, now = new Date()): boolean {
  return dateIso.slice(0, 10) < yerevanTodayIso(now);
}

/** 1 = Monday … 7 = Sunday — calendar Y-M-D parts (same as booking grid). */
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

/**
 * Branch / booking grid: `timeEnd` is the last bookable hour start (inclusive), e.g. 09:00–18:00 → slots 09:00 … 18:00.
 */
function slotStartInsideBranchWorkWindow(
  slot: { start: number; end: number },
  workStart: string,
  workEnd: string,
): boolean {
  const w = blockRangeMinutes(workStart, workEnd);
  return slot.start >= w.start && slot.start <= w.end;
}

/** Parse display text like "09:00-18:00" or "9:00 – 18:00". */
export function parseBranchWorkHoursText(text: string | null | undefined): { start: string; end: string } | null {
  if (!text?.trim()) return null;
  const m = /(\d{1,2}):?(\d{2})\s*[-–—]\s*(\d{1,2}):?(\d{2})/.exec(text.trim());
  if (!m) return null;
  const start = normalizeTimeHHMM(`${m[1]}:${m[2]}`);
  const end = normalizeTimeHHMM(`${m[3]}:${m[4]}`);
  if (!start || !end) return null;
  if (parseTimeToMinutes(start) >= parseTimeToMinutes(end)) return null;
  return { start, end };
}

export function defaultBranchWorkHoursRules(): BranchScheduleRuleDto[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    ruleKind: 'work_hours' as const,
    weekday,
    dateIso: null,
    timeStart: DEFAULT_BRANCH_OPEN,
    timeEnd: DEFAULT_BRANCH_CLOSE,
    allDay: false,
  }));
}

export function branchWorkHoursRulesFromText(text: string | null | undefined): BranchScheduleRuleDto[] | null {
  const parsed = parseBranchWorkHoursText(text);
  if (!parsed) return null;
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    ruleKind: 'work_hours' as const,
    weekday,
    dateIso: null,
    timeStart: parsed.start,
    timeEnd: parsed.end,
    allDay: false,
  }));
}

/**
 * True if the hour cannot be booked at this branch (closed day or outside work windows).
 */
export function isSlotBlockedByBranchScheduleRules(
  dateIso: string,
  timeSlot: string,
  rules: readonly BranchScheduleRuleDto[],
): boolean {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const slotRange = slotRangeMinutes(timeSlot);

  for (const b of rules) {
    if (b.ruleKind === 'day_off' && b.dateIso === dateIso.slice(0, 10)) {
      if (b.allDay) return true;
      if (b.timeStart && b.timeEnd && rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
  }

  const hasAnyWorkHours = rules.some((b) => b.ruleKind === 'work_hours');
  if (!hasAnyWorkHours) return false;

  const workRows = rules.filter((b) => b.ruleKind === 'work_hours' && b.weekday === weekday && b.timeStart && b.timeEnd);
  if (workRows.length === 0) return true;

  return !workRows.some((b) => slotStartInsideBranchWorkWindow(slotRange, b.timeStart!, b.timeEnd!));
}

/** Hour starts on `dateIso` that fit branch work windows (excludes closed days). */
export function hourlySlotStartsForBranchDate(dateIso: string, rules: readonly BranchScheduleRuleDto[]): string[] {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const d = dateIso.slice(0, 10);

  for (const b of rules) {
    if (b.ruleKind === 'day_off' && b.dateIso === d && b.allDay) return [];
  }

  const workRows = rules.filter((b) => b.ruleKind === 'work_hours' && b.weekday === weekday && b.timeStart && b.timeEnd);
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

/** Union of bookable hour rows for a set of calendar dates (week grid). */
export function hourlySlotStartsForBranchDates(
  dateIsos: readonly string[],
  rules: readonly BranchScheduleRuleDto[],
): string[] {
  const set = new Set<string>();
  for (const d of dateIsos) {
    for (const t of hourlySlotStartsForBranchDate(d, rules)) {
      set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function branchScheduleBlockReason(
  dateIso: string,
  timeSlot: string,
  rules: readonly BranchScheduleRuleDto[],
): 'branch_closed' | 'outside_hours' | null {
  const d = dateIso.slice(0, 10);
  const weekday = weekdayMon1ToSun7FromDateIso(d);

  for (const b of rules) {
    if (b.ruleKind === 'day_off' && b.dateIso === d) {
      if (b.allDay) return 'branch_closed';
      if (b.timeStart && b.timeEnd) {
        const slotRange = slotRangeMinutes(timeSlot);
        if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
          return 'branch_closed';
        }
      }
    }
  }

  const hasWork = rules.some((r) => r.ruleKind === 'work_hours');
  if (!hasWork) return null;

  const workRows = rules.filter((r) => r.ruleKind === 'work_hours' && r.weekday === weekday && r.timeStart && r.timeEnd);
  if (workRows.length === 0) return 'branch_closed';

  const slotRange = slotRangeMinutes(timeSlot);
  const inside = workRows.some((r) => slotStartInsideBranchWorkWindow(slotRange, r.timeStart!, r.timeEnd!));
  return inside ? null : 'outside_hours';
}
