/**
 * Client-side rules matching backend `InstructorAvailabilityBlock` (see GET /instructors/:id/availability-blocks).
 */

export type AvailabilityBlock = {
  id: string;
  ruleKind: "weekly_work" | "weekly_break" | "weekday_lunch" | "date_off" | "date_break";
  weekday: number | null;
  dateIso: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  allDay: boolean;
};

function parseTimeToMinutes(t: string): number {
  const s = t.trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return 0;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 0;
  return h * 60 + min;
}

/** 1 = Monday … 7 = Sunday — calendar parts (matches booking grid local dates). */
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

const RULE_KINDS: readonly AvailabilityBlock["ruleKind"][] = [
  "weekly_work",
  "weekly_break",
  "weekday_lunch",
  "date_off",
  "date_break",
];

function isRuleKind(x: string): x is AvailabilityBlock["ruleKind"] {
  return (RULE_KINDS as readonly string[]).includes(x);
}

/**
 * Normalize API / Sequelize quirks (snake_case, time with seconds, empty ENUM).
 */
export function normalizeAvailabilityBlockFromApi(raw: Record<string, unknown>): AvailabilityBlock | null {
  const id = String(raw.id ?? "");
  if (!id) return null;
  const rkRaw = String(raw.ruleKind ?? raw.rule_kind ?? "").trim();
  const weekdayRaw = raw.weekday ?? raw.week_day;
  const weekday =
    weekdayRaw === null || weekdayRaw === undefined || weekdayRaw === "" ? null : Number(weekdayRaw);
  let dateIso: string | null = null;
  const di = raw.dateIso ?? raw.date_iso;
  if (di != null && di !== "") {
    dateIso = String(di).slice(0, 10);
  }
  const tsRaw = raw.timeStart ?? raw.time_start;
  const teRaw = raw.timeEnd ?? raw.time_end;
  const pad = (n: number) => String(n).padStart(2, "0");
  const normTime = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(s);
    if (!m) return null;
    const h = Math.min(23, Math.max(0, Number(m[1])));
    const min = Math.min(59, Math.max(0, Number(m[2])));
    return `${pad(h)}:${pad(min)}`;
  };
  const timeStart = normTime(tsRaw);
  const timeEnd = normTime(teRaw);
  let ruleKind: AvailabilityBlock["ruleKind"] | null = isRuleKind(rkRaw) ? rkRaw : null;
  if (
    ruleKind == null &&
    timeStart &&
    timeEnd &&
    (weekday == null || Number.isNaN(weekday)) &&
    !dateIso
  ) {
    ruleKind = "weekday_lunch";
  }
  if (ruleKind == null) return null;
  const allDay = Boolean(raw.allDay ?? raw.all_day);
  return {
    id,
    ruleKind,
    weekday: weekday != null && Number.isFinite(weekday) ? weekday : null,
    dateIso,
    timeStart,
    timeEnd,
    allDay,
  };
}

export function normalizeAvailabilityBlocksFromApi(raw: unknown): AvailabilityBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => normalizeAvailabilityBlockFromApi(x as Record<string, unknown>))
    .filter((b): b is AvailabilityBlock => b != null);
}

/** Slot is one hour starting at `timeSlot` (e.g. "14:00" → [14:00, 15:00)). */
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

function slotFullyInsideWorkWindow(
  slot: { start: number; end: number },
  workStart: string,
  workEnd: string,
): boolean {
  const w = blockRangeMinutes(workStart, workEnd);
  return slot.start >= w.start && slot.end <= w.end;
}

/**
 * Returns true if this hour slot cannot be booked due to admin-defined availability rules.
 */
export function isSlotBlockedByAvailabilityRules(dateIso: string, timeSlot: string, blocks: readonly AvailabilityBlock[]): boolean {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const slotRange = slotRangeMinutes(timeSlot);

  for (const b of blocks) {
    if (
      b.ruleKind === "weekday_lunch" &&
      b.timeStart &&
      b.timeEnd &&
      weekday >= 1 &&
      weekday <= 5
    ) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === "weekly_break" && b.weekday === weekday && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === "date_break" && b.dateIso === dateIso && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === "date_off" && b.dateIso === dateIso) {
      if (b.allDay) return true;
      if (b.timeStart && b.timeEnd && rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
  }

  const hasAnyWeeklyWork = blocks.some((b) => b.ruleKind === "weekly_work");
  if (hasAnyWeeklyWork) {
    const workRows = blocks.filter((b) => b.ruleKind === "weekly_work" && b.weekday === weekday && b.timeStart && b.timeEnd);
    if (workRows.length === 0) {
      return true;
    }
    const insideSome = workRows.some((b) => slotFullyInsideWorkWindow(slotRange, b.timeStart!, b.timeEnd!));
    if (!insideSome) return true;
  }

  return false;
}

export function isSlotInPastDate(dateIso: string, todayIso: string): boolean {
  return dateIso < todayIso;
}
