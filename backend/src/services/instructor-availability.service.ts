import { Op } from 'sequelize';
import { InstructorScheduleRule, User } from '../models';
import type { InstructorScheduleRuleKind } from '../models/instructor-schedule-rule.model';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Strip seconds, pad hours → HH:MM for DB / TIME_RE. */
function normalizeTimeHHMM(v: string | null | undefined): string | null {
  if (v == null) return null;
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

function requireValidTime(label: string, raw: string | null | undefined): string {
  const n = normalizeTimeHHMM(raw);
  if (n == null || !TIME_RE.test(n)) {
    throw new Error(`Invalid ${label} (use HH:MM)`);
  }
  return n;
}

export type InstructorScheduleRuleDto = {
  id: number;
  ruleKind: InstructorScheduleRuleKind;
  weekday: number | null;
  dateIso: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  allDay: boolean;
};

const RULE_KIND_SET = new Set<string>(['work_hours', 'lunch', 'recurring_busy', 'day_off', 'date_busy']);

function toDto(row: InstructorScheduleRule): InstructorScheduleRuleDto {
  const rawKind = String(row.ruleKind ?? '').trim();
  const ts = normalizeTimeHHMM(row.timeStart != null ? String(row.timeStart) : null);
  const te = normalizeTimeHHMM(row.timeEnd != null ? String(row.timeEnd) : null);
  let ruleKind: InstructorScheduleRuleDto['ruleKind'] = row.ruleKind;
  /** Some MySQL ENUM migrations leave invalid values as ""; recover lunch rows. */
  if (!RULE_KIND_SET.has(rawKind) && ts && te && row.weekday == null && !row.dateIso) {
    ruleKind = 'lunch';
  }
  return {
    id: row.id,
    ruleKind,
    weekday: row.weekday == null ? null : Number(row.weekday),
    dateIso: row.dateIso ? String(row.dateIso).slice(0, 10) : null,
    timeStart: ts,
    timeEnd: te,
    allDay: Boolean(row.allDay),
  };
}

/** 1 = Monday … 7 = Sunday — use calendar Y-M-D (same local day as booking `fmt()`). */
function weekdayMon1ToSun7FromDateIso(dateIso: string): number {
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

function parseTimeToMinutes(t: string): number {
  const s = t.trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return 0;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 0;
  return h * 60 + min;
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
 * True if this hour slot cannot be booked (lunch, day off, busy windows, or outside `work_hours` when any exist).
 * Mirrors `client/src/modules/instructors/instructorAvailability.ts`.
 */
export function isSlotBlockedByScheduleRules(
  dateIso: string,
  timeSlot: string,
  rules: readonly InstructorScheduleRuleDto[],
  slotRangeOverride?: { start: number; end: number },
  options?: { forPracticalPlan?: boolean },
): boolean {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const slotRange = slotRangeOverride ?? slotRangeMinutes(timeSlot);
  const forPracticalPlan = options?.forPracticalPlan === true;

  for (const b of rules) {
    if (!forPracticalPlan && b.ruleKind === 'lunch' && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === 'recurring_busy' && b.weekday === weekday && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === 'date_busy' && b.dateIso === dateIso && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === 'day_off' && b.dateIso === dateIso) {
      if (b.allDay) return true;
      if (b.timeStart && b.timeEnd && rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
  }

  if (!forPracticalPlan) {
    const hasAnyWorkHours = rules.some((b) => b.ruleKind === 'work_hours');
    if (hasAnyWorkHours) {
      const workRows = rules.filter((b) => b.ruleKind === 'work_hours' && b.weekday === weekday && b.timeStart && b.timeEnd);
      if (workRows.length === 0) {
        return true;
      }
      const insideSome = workRows.some((b) => slotFullyInsideWorkWindow(slotRange, b.timeStart!, b.timeEnd!));
      if (!insideSome) return true;
    }
  }

  return false;
}

export default class InstructorAvailabilityService {
  static async listForInstructor(instructorUserId: number): Promise<InstructorScheduleRuleDto[]> {
    const inst = await User.findOne({
      where: { id: instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });

    if (!inst) return [];

    const rows = await InstructorScheduleRule.findAll({
      where: { instructorUserId },
      order: [
        ['ruleKind', 'ASC'],
        ['weekday', 'ASC'],
        ['dateIso', 'ASC'],
        ['timeStart', 'ASC'],
      ],
    });
    return rows.map(toDto);
  }

  /**
   * One row: same lunch window every day of the week (matches booking calendar).
   * Removes prior `lunch` and Mon–Fri `recurring_busy` rows that duplicated the old lunch pattern.
   */
  static async replaceWeekdayLunch(
    instructorUserId: number,
    timeStart: string,
    timeEnd: string,
  ): Promise<InstructorScheduleRuleDto | null> {
    const inst = await User.findOne({
      where: { id: instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });
    if (!inst) return null;

    const sequelize = InstructorScheduleRule.sequelize!;
    let createdId = 0;

    await sequelize.transaction(async (transaction) => {
      await InstructorScheduleRule.destroy({
        where: { instructorUserId, ruleKind: 'lunch' },
        transaction,
      });
      await InstructorScheduleRule.destroy({
        where: {
          instructorUserId,
          ruleKind: 'recurring_busy',
          weekday: { [Op.in]: [1, 2, 3, 4, 5] },
        },
        transaction,
      });
      const row = await InstructorScheduleRule.create(
        {
          instructorUserId,
          ruleKind: 'lunch',
          weekday: null,
          dateIso: null,
          timeStart,
          timeEnd,
          allDay: false,
        },
        { transaction },
      );
      createdId = row.id;
    });

    const row = await InstructorScheduleRule.findByPk(createdId);
    return row ? toDto(row) : null;
  }

  static async create(input: {
    instructorUserId: number;
    ruleKind: InstructorScheduleRuleKind;
    weekday?: number | null;
    dateIso?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
    allDay?: boolean;
  }): Promise<InstructorScheduleRuleDto | null> {
    const inst = await User.findOne({
      where: { id: input.instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });
    if (!inst) return null;

    if (input.ruleKind === 'lunch') {
      const ts = requireValidTime('timeStart', input.timeStart);
      const te = requireValidTime('timeEnd', input.timeEnd);
      if (parseTimeToMinutes(ts) >= parseTimeToMinutes(te)) {
        throw new Error('timeStart must be before timeEnd');
      }
      return this.replaceWeekdayLunch(input.instructorUserId, ts, te);
    }

    const allDay = Boolean(input.allDay);
    let timeStart: string | null = input.timeStart?.trim() || null;
    let timeEnd: string | null = input.timeEnd?.trim() || null;
    let weekday: number | null =
      input.weekday === undefined || input.weekday === null ? null : Number(input.weekday);
    let dateIso = input.dateIso?.trim() || null;

    if (input.ruleKind === 'work_hours' || input.ruleKind === 'recurring_busy') {
      if (weekday == null || weekday < 1 || weekday > 7) {
        throw new Error('weekday must be 1–7 (Mon–Sun) for weekly rules');
      }
      timeStart = requireValidTime('timeStart', timeStart);
      timeEnd = requireValidTime('timeEnd', timeEnd);
      if (parseTimeToMinutes(timeStart) >= parseTimeToMinutes(timeEnd)) {
        throw new Error('timeStart must be before timeEnd');
      }
      dateIso = null;
    } else if (input.ruleKind === 'day_off') {
      if (!dateIso) throw new Error('dateIso required for day off');
      if (allDay) {
        timeStart = '00:00';
        timeEnd = '23:59';
      } else {
        timeStart = requireValidTime('timeStart', timeStart);
        timeEnd = requireValidTime('timeEnd', timeEnd);
        if (parseTimeToMinutes(timeStart) >= parseTimeToMinutes(timeEnd)) {
          throw new Error('timeStart must be before timeEnd');
        }
      }
      weekday = null;
    } else {
      /* date_busy */
      if (!dateIso) throw new Error('dateIso required');
      timeStart = requireValidTime('timeStart', timeStart);
      timeEnd = requireValidTime('timeEnd', timeEnd);
      if (parseTimeToMinutes(timeStart) >= parseTimeToMinutes(timeEnd)) {
        throw new Error('timeStart must be before timeEnd');
      }
      weekday = null;
    }

    const created = await InstructorScheduleRule.create({
      instructorUserId: input.instructorUserId,
      ruleKind: input.ruleKind,
      weekday,
      dateIso,
      timeStart,
      timeEnd,
      allDay: input.ruleKind === 'day_off' ? allDay : false,
    });
    const row = await InstructorScheduleRule.findByPk(created.id);
    return row ? toDto(row) : null;
  }

  static async remove(instructorUserId: number, ruleId: number): Promise<boolean> {
    const n = await InstructorScheduleRule.destroy({
      where: { id: ruleId, instructorUserId },
    });
    return n > 0;
  }

  /** True if the instructor account exists (any type check done at route). */
  static async instructorExists(instructorUserId: number): Promise<boolean> {
    const n = await User.count({
      where: { id: instructorUserId, accountType: 'instructor' },
    });
    return n > 0;
  }

  static async isSlotUnavailableForInstructor(
    instructorUserId: number,
    dateIso: string,
    timeSlot: string,
    slotRangeOverride?: { start: number; end: number },
    options?: { forPracticalPlan?: boolean },
  ): Promise<boolean> {
    const rules = await this.listForInstructor(instructorUserId);
    return isSlotBlockedByScheduleRules(dateIso, timeSlot, rules, slotRangeOverride, options);
  }
}
