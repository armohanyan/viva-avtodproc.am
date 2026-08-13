import { Op } from 'sequelize';
import { Booking, BookingSlot } from '../models';
import BranchScheduleService from './branch-schedule.service';
import InstructorAvailabilityService from './instructor-availability.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import {
  branchScheduleBlockReason,
  isSlotBlockedByBranchScheduleRules,
  isSlotDateBeforeToday,
  isSlotStartInPast,
  minutesToHHMM,
  normalizeTimeHHMM,
  parseTimeToMinutes,
  rangesOverlapHalfOpen,
} from '../utils/booking-slot.util';
import PracticalSlotPlanService from './practical-slot-plan.service';
import { practicalSlotRangeMinutesFromBookable } from '../utils/practical-slot-plan.util';

const { InputValidationError } = ErrorsUtil;

/** Must match {@link BookingService} slot occupancy — only these booking statuses block a slot. */
const SLOT_RESERVING_STATUSES = [
  'confirmed',
  'pending',
  'pending_prebook',
  'pending_payment',
  'completed',
] as const;

/** Minimum custom practical lesson length (minutes). */
export const MIN_CUSTOM_PRACTICAL_DURATION_MINUTES = 30;

export type SlotValidationFailureReason = 'past' | 'outside_hours' | 'branch_closed' | 'instructor_unavailable' | 'booked';

function messageForReason(reason: SlotValidationFailureReason): string {
  switch (reason) {
    case 'past':
      return 'This time slot is in the past and cannot be booked.';
    case 'outside_hours':
      return 'This time is outside branch business hours.';
    case 'branch_closed':
      return 'The branch is closed at this time.';
    case 'instructor_unavailable':
      return 'Instructor is not available at this time (day off, break, or outside work hours).';
    case 'booked':
      return 'This time slot is no longer available.';
    default:
      return 'This time slot cannot be booked.';
  }
}

function resolveOccupiedRangeMinutes(
  bookingTime: string,
  bookingEndTime: string | null | undefined,
  bookingDateIso: string,
  dateIso: string,
  slotTimesOnDate: readonly string[],
): { start: number; end: number } | null {
  const starts = slotTimesOnDate
    .map((t) => parseTimeToMinutes(normalizeTimeHHMM(t) ?? t))
    .filter((m) => Number.isFinite(m))
    .sort((a, b) => a - b);
  if (starts.length === 0) {
    const start = parseTimeToMinutes(normalizeTimeHHMM(bookingTime) ?? bookingTime);
    if (!Number.isFinite(start)) return null;
    const endRaw = bookingEndTime ? parseTimeToMinutes(normalizeTimeHHMM(bookingEndTime) ?? bookingEndTime) : start + 60;
    return { start, end: Number.isFinite(endRaw) && endRaw > start ? endRaw : start + 60 };
  }
  const start = starts[0]!;
  const sameDayEnd =
    bookingDateIso.slice(0, 10) === dateIso.slice(0, 10) && bookingEndTime
      ? parseTimeToMinutes(normalizeTimeHHMM(bookingEndTime) ?? bookingEndTime)
      : NaN;
  if (Number.isFinite(sameDayEnd) && sameDayEnd > start) {
    return { start, end: sameDayEnd };
  }
  const lastStart = starts[starts.length - 1]!;
  return { start, end: lastStart + 60 };
}

export default class BookingSlotValidationService {
  /**
   * True when the instructor already has a reserving booking overlapping [rangeStart, rangeEndExclusive).
   */
  static async instructorHasOverlappingBooking(input: {
    instructorUserId: number;
    dateIso: string;
    rangeStart: string;
    rangeEndExclusive: string;
    excludeBookingId?: number;
  }): Promise<boolean> {
    const dateIso = input.dateIso.slice(0, 10);
    const rangeStart = normalizeTimeHHMM(input.rangeStart);
    const rangeEnd = normalizeTimeHHMM(input.rangeEndExclusive);
    if (!rangeStart || !rangeEnd) return false;
    const proposed = {
      start: parseTimeToMinutes(rangeStart),
      end: parseTimeToMinutes(rangeEnd),
    };
    if (!Number.isFinite(proposed.start) || !Number.isFinite(proposed.end) || proposed.end <= proposed.start) {
      return false;
    }

    const slotRows = await BookingSlot.findAll({
      where: {
        instructorUserId: input.instructorUserId,
        dateIso,
        ...(input.excludeBookingId != null && Number.isFinite(input.excludeBookingId)
          ? { bookingId: { [Op.ne]: input.excludeBookingId } }
          : {}),
      },
      attributes: ['bookingId', 'slotTime', 'dateIso'],
      include: [
        {
          model: Booking,
          as: 'booking',
          required: true,
          attributes: ['id', 'dateIso', 'time', 'endTime', 'status'],
          where: { status: { [Op.in]: [...SLOT_RESERVING_STATUSES] } },
        },
      ],
    });

    const byBooking = new Map<
      number,
      { time: string; endTime: string | null; dateIso: string; slotTimes: string[] }
    >();
    for (const row of slotRows) {
      const bk = (row as unknown as {
        booking: { id: number; dateIso: string; time: string; endTime: string | null };
      }).booking;
      const cur = byBooking.get(bk.id);
      if (cur) {
        cur.slotTimes.push(row.slotTime);
      } else {
        byBooking.set(bk.id, {
          time: bk.time,
          endTime: bk.endTime,
          dateIso: dateIsoStringSafe(bk.dateIso),
          slotTimes: [row.slotTime],
        });
      }
    }

    for (const occ of byBooking.values()) {
      const occupied = resolveOccupiedRangeMinutes(
        occ.time,
        occ.endTime,
        occ.dateIso,
        dateIso,
        occ.slotTimes,
      );
      if (occupied && rangesOverlapHalfOpen(proposed, occupied)) return true;
    }

    // Legacy bookings without booking_slots rows.
    const excludeIds = [...byBooking.keys()];
    if (input.excludeBookingId != null && Number.isFinite(input.excludeBookingId) && input.excludeBookingId > 0) {
      excludeIds.push(input.excludeBookingId);
    }
    const legacy = await Booking.findAll({
      where: {
        instructorUserId: input.instructorUserId,
        dateIso,
        status: { [Op.in]: [...SLOT_RESERVING_STATUSES] },
        ...(excludeIds.length > 0 ? { id: { [Op.notIn]: excludeIds } } : {}),
      },
      attributes: ['id', 'dateIso', 'time', 'endTime'],
    });
    for (const b of legacy) {
      const occupied = resolveOccupiedRangeMinutes(
        b.time,
        b.endTime,
        dateIsoStringSafe(b.dateIso),
        dateIso,
        [],
      );
      if (occupied && rangesOverlapHalfOpen(proposed, occupied)) return true;
    }

    return false;
  }

  static async assertInstructorRangeFree(input: {
    instructorUserId: number;
    dateIso: string;
    rangeStart: string;
    rangeEndExclusive: string;
    excludeBookingId?: number;
    /** Error copy when the window is a rest/busy block rather than a lesson. */
    busyMessage?: string;
  }): Promise<void> {
    const busy = await this.instructorHasOverlappingBooking(input);
    if (busy) {
      throw new InputValidationError(
        input.busyMessage ?? messageForReason('booked'),
        HttpStatusCodesUtil.CONFLICT,
      );
    }
  }

  /**
   * Validates branch hours, past slots (Yerevan), instructor schedule, and existing claims.
   */
  static async assertSlotsBookable(input: {
    branchId: number;
    instructorUserId: number;
    dateIso: string;
    slots: readonly string[];
    excludeBookingId?: number;
    /** Practical lessons use the global slot plan instead of branch work hours. */
    lessonType?: 'practical' | 'theory' | 'theory_personal';
    /** Bulk import of legacy bookings: skip past/schedule checks; still block duplicate slots. */
    allowHistoricalSlots?: boolean;
    /** Admin create: allow booking slots whose start is already in the past (keeps schedule checks). */
    allowPastSlots?: boolean;
    /**
     * Admin custom practical time (e.g. during rest): skip fixed plan membership,
     * but still enforce day-off / busy / conflicts. Lunch rule stays skipped via forPracticalPlan.
     */
    allowCustomPracticalTime?: boolean;
    /** Exclusive end HH:MM for a custom practical range (required when allowCustomPracticalTime). */
    customSlotEndTime?: string;
  }): Promise<void> {
    const dateIso = input.dateIso.slice(0, 10);
    if (!Number.isFinite(input.branchId) || input.branchId <= 0) {
      throw new InputValidationError('Branch is required.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const branchOk = await BranchScheduleService.branchExists(input.branchId);
    if (!branchOk) {
      throw new InputValidationError('Branch not found.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const branchRules = await BranchScheduleService.resolveEffectiveRulesForBranch(input.branchId);
    const isPractical = input.lessonType === 'practical';
    const allowCustomPractical = input.allowCustomPracticalTime === true && isPractical;
    const customEndNorm = allowCustomPractical
      ? normalizeTimeHHMM(String(input.customSlotEndTime ?? '').trim())
      : null;
    if (allowCustomPractical) {
      if (!customEndNorm) {
        throw new InputValidationError('Custom slot end time is required.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (input.slots.length !== 1) {
        throw new InputValidationError(
          'Custom practical slots must be a single start time with an end time.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const effectiveTimes =
      isPractical && Number.isFinite(input.instructorUserId)
        ? await PracticalSlotPlanService.getEffectiveBookableTimes(input.branchId, input.instructorUserId)
        : null;

    const allowHistorical = input.allowHistoricalSlots === true;
    const allowPast = allowHistorical || input.allowPastSlots === true;

    for (const slot of input.slots) {
      const editingExistingBooking =
        input.excludeBookingId != null && Number.isFinite(input.excludeBookingId) && input.excludeBookingId > 0;
      if (
        !allowPast &&
        !editingExistingBooking &&
        (isSlotDateBeforeToday(dateIso) || isSlotStartInPast(dateIso, slot))
      ) {
        throw new InputValidationError(messageForReason('past'), HttpStatusCodesUtil.BAD_REQUEST);
      }

      const slotNorm = normalizeTimeHHMM(slot) ?? slot;
      let proposedRange: { start: number; end: number } | undefined;

      if (allowCustomPractical && customEndNorm) {
        const startM = parseTimeToMinutes(slotNorm);
        const endM = parseTimeToMinutes(customEndNorm);
        if (!Number.isFinite(startM) || !Number.isFinite(endM) || endM <= startM) {
          throw new InputValidationError(
            'Custom slot end time must be after the start time.',
            HttpStatusCodesUtil.BAD_REQUEST,
          );
        }
        if (endM - startM < MIN_CUSTOM_PRACTICAL_DURATION_MINUTES) {
          throw new InputValidationError(
            `Custom slot must be at least ${MIN_CUSTOM_PRACTICAL_DURATION_MINUTES} minutes.`,
            HttpStatusCodesUtil.BAD_REQUEST,
          );
        }
        proposedRange = { start: startM, end: endM };
      }

      if (!allowHistorical) {
        if (isPractical && effectiveTimes) {
          if (!allowCustomPractical && (!normalizeTimeHHMM(slot) || !effectiveTimes.includes(slotNorm))) {
            throw new InputValidationError(
              'This time is not in the branch and instructor practical schedule.',
              HttpStatusCodesUtil.BAD_REQUEST,
            );
          }
        } else if (!allowCustomPractical) {
          const branchReason = branchScheduleBlockReason(dateIso, slot, branchRules);
          if (branchReason === 'branch_closed') {
            throw new InputValidationError(messageForReason('branch_closed'), HttpStatusCodesUtil.BAD_REQUEST);
          }
          if (branchReason === 'outside_hours' || isSlotBlockedByBranchScheduleRules(dateIso, slot, branchRules)) {
            throw new InputValidationError(messageForReason('outside_hours'), HttpStatusCodesUtil.BAD_REQUEST);
          }
        }

        const slotRange =
          proposedRange ??
          (isPractical && effectiveTimes?.length
            ? practicalSlotRangeMinutesFromBookable(slot, effectiveTimes)
            : { start: parseTimeToMinutes(slotNorm), end: parseTimeToMinutes(slotNorm) + 60 });

        const instructorUnavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
          input.instructorUserId,
          dateIso,
          slot,
          slotRange,
          { forPracticalPlan: isPractical },
        );
        if (instructorUnavailable) {
          throw new InputValidationError(messageForReason('instructor_unavailable'), HttpStatusCodesUtil.BAD_REQUEST);
        }
        proposedRange = slotRange;
      }

      const rangeForBusy =
        proposedRange ??
        (isPractical && effectiveTimes?.length
          ? practicalSlotRangeMinutesFromBookable(slot, effectiveTimes)
          : { start: parseTimeToMinutes(slotNorm), end: parseTimeToMinutes(slotNorm) + 60 });

      await this.assertInstructorRangeFree({
        instructorUserId: input.instructorUserId,
        dateIso,
        rangeStart: minutesToHHMM(rangeForBusy.start),
        rangeEndExclusive: minutesToHHMM(rangeForBusy.end),
        excludeBookingId: input.excludeBookingId,
      });
    }
  }

  /**
   * Multi-day admin selections: each entry validated on its own date.
   */
  static async assertSlotEntriesBookable(input: {
    branchId: number;
    instructorUserId: number;
    entries: readonly { dateIso: string; time: string }[];
    excludeBookingId?: number;
    lessonType?: 'practical' | 'theory' | 'theory_personal';
    allowHistoricalSlots?: boolean;
    allowPastSlots?: boolean;
    allowCustomPracticalTime?: boolean;
    customSlotEndTime?: string;
  }): Promise<void> {
    for (const e of input.entries) {
      await this.assertSlotsBookable({
        branchId: input.branchId,
        instructorUserId: input.instructorUserId,
        dateIso: e.dateIso,
        slots: [e.time],
        excludeBookingId: input.excludeBookingId,
        lessonType: input.lessonType,
        allowHistoricalSlots: input.allowHistoricalSlots,
        allowPastSlots: input.allowPastSlots,
        allowCustomPracticalTime: input.allowCustomPracticalTime,
        customSlotEndTime: input.customSlotEndTime,
      });
    }
  }
}

function dateIsoStringSafe(v: string): string {
  return String(v ?? '').slice(0, 10);
}
