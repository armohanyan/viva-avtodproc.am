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
} from '../utils/booking-slot.util';
import PracticalSlotPlanService from './practical-slot-plan.service';
import { normalizeTimeHHMM } from '../utils/booking-slot.util';
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

export default class BookingSlotValidationService {
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
    const effectiveTimes =
      isPractical && Number.isFinite(input.instructorUserId)
        ? await PracticalSlotPlanService.getEffectiveBookableTimes(input.branchId, input.instructorUserId)
        : null;

    for (const slot of input.slots) {
      if (isSlotDateBeforeToday(dateIso) || isSlotStartInPast(dateIso, slot)) {
        throw new InputValidationError(messageForReason('past'), HttpStatusCodesUtil.BAD_REQUEST);
      }

      if (isPractical && effectiveTimes) {
        const n = normalizeTimeHHMM(slot);
        if (!n || !effectiveTimes.includes(n)) {
          throw new InputValidationError(
            'This time is not in the branch and instructor practical schedule.',
            HttpStatusCodesUtil.BAD_REQUEST,
          );
        }
      } else {
        const branchReason = branchScheduleBlockReason(dateIso, slot, branchRules);
        if (branchReason === 'branch_closed') {
          throw new InputValidationError(messageForReason('branch_closed'), HttpStatusCodesUtil.BAD_REQUEST);
        }
        if (branchReason === 'outside_hours' || isSlotBlockedByBranchScheduleRules(dateIso, slot, branchRules)) {
          throw new InputValidationError(messageForReason('outside_hours'), HttpStatusCodesUtil.BAD_REQUEST);
        }
      }

      const slotRange =
        isPractical && effectiveTimes?.length ? practicalSlotRangeMinutesFromBookable(slot, effectiveTimes) : undefined;
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

      const busy = await BookingSlot.findOne({
        where: {
          instructorUserId: input.instructorUserId,
          dateIso,
          slotTime: slot,
          ...(input.excludeBookingId != null && Number.isFinite(input.excludeBookingId)
            ? { bookingId: { [Op.ne]: input.excludeBookingId } }
            : {}),
        },
        attributes: ['id'],
        include: [
          {
            model: Booking,
            as: 'booking',
            required: true,
            attributes: ['id'],
            where: { status: { [Op.in]: [...SLOT_RESERVING_STATUSES] } },
          },
        ],
      });
      if (busy) {
        throw new InputValidationError(messageForReason('booked'), HttpStatusCodesUtil.CONFLICT);
      }
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
  }): Promise<void> {
    for (const e of input.entries) {
      await this.assertSlotsBookable({
        branchId: input.branchId,
        instructorUserId: input.instructorUserId,
        dateIso: e.dateIso,
        slots: [e.time],
        excludeBookingId: input.excludeBookingId,
        lessonType: input.lessonType,
      });
    }
  }
}
