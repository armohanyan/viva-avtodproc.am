import { Op } from 'sequelize';
import { InstructorAvailabilityBlock, User } from '../models';
import type { InstructorAvailabilityRuleKind } from '../models/instructor-availability-block.model';

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

export type InstructorAvailabilityBlockDto = {
  id: string;
  ruleKind: InstructorAvailabilityRuleKind;
  weekday: number | null;
  dateIso: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  allDay: boolean;
};

const RULE_KIND_SET = new Set<string>(['weekly_work', 'weekly_break', 'weekday_lunch', 'date_off', 'date_break']);

function toDto(row: InstructorAvailabilityBlock): InstructorAvailabilityBlockDto {
  const rawKind = String(row.ruleKind ?? '').trim();
  const ts = normalizeTimeHHMM(row.timeStart != null ? String(row.timeStart) : null);
  const te = normalizeTimeHHMM(row.timeEnd != null ? String(row.timeEnd) : null);
  let ruleKind: InstructorAvailabilityBlockDto['ruleKind'] = row.ruleKind;
  /** Some MySQL ENUM migrations leave invalid values as ""; recover Mon–Fri lunch rows. */
  if (!RULE_KIND_SET.has(rawKind) && ts && te && row.weekday == null && !row.dateIso) {
    ruleKind = 'weekday_lunch';
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
 * True if this hour slot cannot be booked (lunch, day off, date break, or outside weekly_work when any exists).
 * Mirrors `client/src/modules/instructors/instructorAvailability.ts`.
 */
export function isSlotBlockedByAvailabilityBlocks(
  dateIso: string,
  timeSlot: string,
  blocks: readonly InstructorAvailabilityBlockDto[],
): boolean {
  const weekday = weekdayMon1ToSun7FromDateIso(dateIso);
  const slotRange = slotRangeMinutes(timeSlot);

  for (const b of blocks) {
    if (
      b.ruleKind === 'weekday_lunch' &&
      b.timeStart &&
      b.timeEnd &&
      weekday >= 1 &&
      weekday <= 5
    ) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === 'weekly_break' && b.weekday === weekday && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === 'date_break' && b.dateIso === dateIso && b.timeStart && b.timeEnd) {
      if (rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
    if (b.ruleKind === 'date_off' && b.dateIso === dateIso) {
      if (b.allDay) return true;
      if (b.timeStart && b.timeEnd && rangesOverlapHalfOpen(slotRange, blockRangeMinutes(b.timeStart, b.timeEnd))) {
        return true;
      }
    }
  }

  const hasAnyWeeklyWork = blocks.some((b) => b.ruleKind === 'weekly_work');
  if (hasAnyWeeklyWork) {
    const workRows = blocks.filter((b) => b.ruleKind === 'weekly_work' && b.weekday === weekday && b.timeStart && b.timeEnd);
    if (workRows.length === 0) {
      return true;
    }
    const insideSome = workRows.some((b) => slotFullyInsideWorkWindow(slotRange, b.timeStart!, b.timeEnd!));
    if (!insideSome) return true;
  }

  return false;
}

export default class InstructorAvailabilityService {
  static async listForInstructor(instructorUserId: string): Promise<InstructorAvailabilityBlockDto[]> {
    const inst = await User.findOne({
      where: { id: instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });

    if (!inst) return [];

    const rows = await InstructorAvailabilityBlock.findAll({
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
   * One row: same lunch window Mon–Fri (matches booking calendar).
   * Removes prior `weekday_lunch` and Mon–Fri `weekly_break` rows for this instructor to avoid duplicates.
   */
  static async replaceWeekdayLunch(
    instructorUserId: string,
    timeStart: string,
    timeEnd: string,
    preferredId?: string,
  ): Promise<InstructorAvailabilityBlockDto | null> {
    const inst = await User.findOne({
      where: { id: instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });
    if (!inst) return null;

    const sequelize = InstructorAvailabilityBlock.sequelize!;
    const id =
      preferredId && preferredId.length > 0
        ? preferredId
        : `IAB-${String((await InstructorAvailabilityBlock.count()) + 1).padStart(4, '0')}`;

    await sequelize.transaction(async (transaction) => {
      await InstructorAvailabilityBlock.destroy({
        where: { instructorUserId, ruleKind: 'weekday_lunch' },
        transaction,
      });
      await InstructorAvailabilityBlock.destroy({
        where: {
          instructorUserId,
          ruleKind: 'weekly_break',
          weekday: { [Op.in]: [1, 2, 3, 4, 5] },
        },
        transaction,
      });
      await InstructorAvailabilityBlock.create(
        {
          id,
          instructorUserId,
          ruleKind: 'weekday_lunch',
          weekday: null,
          dateIso: null,
          timeStart,
          timeEnd,
          allDay: false,
        },
        { transaction },
      );
    });

    const row = await InstructorAvailabilityBlock.findByPk(id);
    return row ? toDto(row) : null;
  }

  static async create(input: {
    id?: string;
    instructorUserId: string;
    ruleKind: InstructorAvailabilityRuleKind;
    weekday?: number | null;
    dateIso?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
    allDay?: boolean;
  }): Promise<InstructorAvailabilityBlockDto | null> {
    const inst = await User.findOne({
      where: { id: input.instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });
    if (!inst) return null;

    if (input.ruleKind === 'weekday_lunch') {
      const ts = requireValidTime('timeStart', input.timeStart);
      const te = requireValidTime('timeEnd', input.timeEnd);
      if (parseTimeToMinutes(ts) >= parseTimeToMinutes(te)) {
        throw new Error('timeStart must be before timeEnd');
      }
      return this.replaceWeekdayLunch(input.instructorUserId, ts, te, input.id?.trim());
    }

    const allDay = Boolean(input.allDay);
    let timeStart: string | null = input.timeStart?.trim() || null;
    let timeEnd: string | null = input.timeEnd?.trim() || null;
    let weekday: number | null =
      input.weekday === undefined || input.weekday === null ? null : Number(input.weekday);
    let dateIso = input.dateIso?.trim() || null;

    if (input.ruleKind === 'weekly_work' || input.ruleKind === 'weekly_break') {
      if (weekday == null || weekday < 1 || weekday > 7) {
        throw new Error('weekday must be 1–7 (Mon–Sun) for weekly rules');
      }
      timeStart = requireValidTime('timeStart', timeStart);
      timeEnd = requireValidTime('timeEnd', timeEnd);
      if (parseTimeToMinutes(timeStart) >= parseTimeToMinutes(timeEnd)) {
        throw new Error('timeStart must be before timeEnd');
      }
      dateIso = null;
    } else if (input.ruleKind === 'date_off') {
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
      /* date_break */
      if (!dateIso) throw new Error('dateIso required');
      timeStart = requireValidTime('timeStart', timeStart);
      timeEnd = requireValidTime('timeEnd', timeEnd);
      if (parseTimeToMinutes(timeStart) >= parseTimeToMinutes(timeEnd)) {
        throw new Error('timeStart must be before timeEnd');
      }
      weekday = null;
    }

    const id =
      input.id?.trim() ||
      `IAB-${String((await InstructorAvailabilityBlock.count()) + 1).padStart(4, '0')}`;
    await InstructorAvailabilityBlock.create({
      id,
      instructorUserId: input.instructorUserId,
      ruleKind: input.ruleKind,
      weekday,
      dateIso,
      timeStart,
      timeEnd,
      allDay: input.ruleKind === 'date_off' ? allDay : false,
    });
    const row = await InstructorAvailabilityBlock.findByPk(id);
    return row ? toDto(row) : null;
  }

  static async remove(instructorUserId: string, blockId: string): Promise<boolean> {
    const n = await InstructorAvailabilityBlock.destroy({
      where: { id: blockId, instructorUserId },
    });
    return n > 0;
  }

  /** True if the instructor account exists (any type check done at route). */
  static async instructorExists(instructorUserId: string): Promise<boolean> {
    const n = await User.count({
      where: { id: instructorUserId, accountType: 'instructor' },
    });
    return n > 0;
  }

  static async isSlotUnavailableForInstructor(instructorUserId: string, dateIso: string, timeSlot: string): Promise<boolean> {
    const blocks = await this.listForInstructor(instructorUserId);
    return isSlotBlockedByAvailabilityBlocks(dateIso, timeSlot, blocks);
  }
}
