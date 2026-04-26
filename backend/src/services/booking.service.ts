import { Op, Transaction, UniqueConstraintError, literal } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Booking, BookingSlot, InstructorBranch, InstructorProfile, TheoryCohort, User } from '../models';
import TheoryCohortService from './theory-cohort.service';
import InstructorAvailabilityService from './instructor-availability.service';
import FinanceService from './finance.service';
import BookingConfirmationNotifier from './booking-confirmation-notifier.service';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';
import { isLessonOnOrBeforePayHorizon, todayIsoUtc } from '../utils/calendar-month.util';

const { InputValidationError, ConflictError, PermissionError } = ErrorsUtil;

function assertInstructorTeachesLessonType(
  profile: InstructorProfile | null,
  lessonType: 'practical' | 'theory' | 'theory_personal',
): asserts profile is InstructorProfile {
  if (!profile || profile.status !== 'active') {
    throw new InputValidationError('Instructor is not available for booking.', HttpStatusCodesUtil.BAD_REQUEST);
  }
  if (lessonType === 'practical' && !profile.teachesPractical) {
    throw new InputValidationError('This instructor does not teach practical lessons.', HttpStatusCodesUtil.BAD_REQUEST);
  }
  if ((lessonType === 'theory' || lessonType === 'theory_personal') && !profile.teachesTheory) {
    throw new InputValidationError('This instructor does not teach theory lessons.', HttpStatusCodesUtil.BAD_REQUEST);
  }
}

const SLOT_NO_LONGER_AVAILABLE = 'Selected slot(s) are no longer available';

function isDuplicateSlotClaimError(e: unknown): boolean {
  if (e instanceof UniqueConstraintError) return true;
  if (typeof e === 'object' && e !== null) {
    const name = (e as { name?: string }).name;
    if (name === 'SequelizeUniqueConstraintError') return true;
    const errno = (e as { parent?: { errno?: number } }).parent?.errno;
    if (errno === 1062) return true;
  }
  return false;
}

const PAYMENT_HOLD_MS = 10 * 60 * 1000;
const PAYMENT_EXTENSION_MS = 5 * 60 * 1000;
/** Show “Add 5 minutes” when remaining time is at most this many ms. */
const PAYMENT_EXTEND_THRESHOLD_MS = 60 * 1000;
/** Max server-side extensions per booking (abuse limit). */
export const MAX_PAYMENT_HOLD_EXTENSIONS = 2;
/** Lesson start time for policy checks (Armenia, UTC+4). */
const BOOKING_SLOT_TZ_OFFSET = '+04:00';
const CANCELLATION_REFUND_MIN_HOURS = 24;

type BookingWithUsers = Booking & { instructor: User; student: User };
type BookingWithInstructor = Booking & { instructor: User };
type BookingWithStudent = Booking & { student: User };

export type BookingAdminDto = {
  id: number;
  studentId: number;
  instructorName: string;
  dateIso: string;
  time: string;
  endTime: string | null;
  totalPriceAmd: number | null;
  type: 'practical' | 'theory' | 'theory_personal';
  status: string;
  branchId: number;
  /** Set when the student requested cancellation (≥24h rule) and staff must act. */
  cancellationRequestedAt: string | null;
  /** `null` = not set; instructor or staff may update. */
  lessonPassedSuccessfully: boolean | null;
};

/** Canonical booking row statuses (DB + API). */
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'refunded';

export type StudentBookingDto = {
  id: number;
  dateIso: string;
  time: string;
  endTime: string | null;
  totalPriceAmd: number | null;
  instructorUserId: number;
  instructor: string;
  lessonTypeKey: 'lessonTypePractical' | 'lessonTypeTheory' | 'lessonTypeTheoryPersonal';
  status: BookingStatus;
  /** ISO datetime when unpaid payment hold ends; null = no active countdown. */
  holdExpiresAt?: string | null;
  holdExtensionCount?: number;
  /** True when the student may submit a refund cancellation request (≥24h before lesson, not already pending). */
  cancelRefundEligible?: boolean;
  /** Hours until lesson start (Armenia +04); negative if the lesson already started. */
  hoursUntilLesson?: number;
  /** ISO time when a refund cancellation was submitted; staff must approve. */
  cancellationRequestedAt?: string | null;
  maxHoldExtensions?: number;
};

/** Result of POST /bookings/:id/cancel-student for practical lessons. */
export type StudentPracticalCancelOutcome =
  | { outcome: 'immediate'; status: BookingStatus; refundIssued: boolean }
  | { outcome: 'pending_admin'; cancellationRequestedAt: string };

/** Bookings for the instructor panel (student name included). */
export type InstructorBookingDto = {
  id: number;
  studentId: number;
  studentName: string;
  dateIso: string;
  time: string;
  endTime: string | null;
  totalPriceAmd: number | null;
  type: 'practical' | 'theory' | 'theory_personal';
  status: BookingStatus;
  branchId: number;
  /** `null` = not set; instructor or staff may update the same field. */
  lessonPassedSuccessfully: boolean | null;
};

export type StudentMultiSlotBookingDto = {
  id: number;
  instructorUserId: number;
  dateIso: string;
  slots: string[];
  startTime: string;
  endTimeExclusive: string;
  totalPriceAmd: number;
  hourlyRateAmd: number;
  status: BookingStatus;
  branchId: number;
  holdExpiresAt: string | null;
  holdExtensionCount: number;
  maxHoldExtensions: number;
  /** True when lesson is within the “pay now / hold” calendar horizon. */
  paymentRequiredNow: boolean;
};

function dateIsoString(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function lessonPassedSuccessfullyFromRow(b: Booking): boolean | null {
  const v = b.lessonPassedSuccessfully;
  if (v === null || v === undefined) return null;
  return Boolean(v);
}

const BOOKING_STATUSES = new Set<string>(['confirmed', 'pending', 'cancelled', 'refunded']);

/** Legacy rows from older builds — coerce for API / UI. */
export function normalizeBookingStatus(raw: string): BookingStatus {
  if (BOOKING_STATUSES.has(raw)) {
    return raw as BookingStatus;
  }
  if (raw === 'completed') {
    return 'confirmed';
  }
  if (raw === 'pending_prebook' || raw === 'pending_payment') {
    return 'pending';
  }
  return 'pending';
}

function normalizeStudentBookingStatus(raw: string): BookingStatus {
  return normalizeBookingStatus(raw);
}

/**
 * Statuses that still occupy a slot in the DB (canonical + legacy rows not yet migrated).
 * Canonical lifecycle uses only {@link BookingStatus}; legacy strings remain until cleaned up.
 */
const SLOT_RESERVING_STATUSES = [
  'confirmed',
  'pending',
  'pending_prebook',
  'pending_payment',
  'completed',
] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTimeHHMM(v: string): string | null {
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

function parseTimeToMinutes(t: string): number {
  const n = normalizeTimeHHMM(t);
  if (n == null) return NaN;
  const m = /^(\d{1,2}):(\d{2})/.exec(n);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h * 60 + min;
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function lessonStartDateUtcMs(dateIso: string, timeHHMM: string): number {
  const t = normalizeTimeHHMM(timeHHMM) ?? timeHHMM.trim();
  return Date.parse(`${dateIso.slice(0, 10)}T${t}:00${BOOKING_SLOT_TZ_OFFSET}`);
}

/** Hours until lesson start; negative if already started. */
export function hoursUntilLessonStart(dateIso: string, timeHHMM: string): number {
  const ms = lessonStartDateUtcMs(dateIso, timeHHMM) - Date.now();
  return ms / 3600_000;
}

export function isRefundWindowForCancellation(dateIso: string, timeHHMM: string): boolean {
  return hoursUntilLessonStart(dateIso, timeHHMM) >= CANCELLATION_REFUND_MIN_HOURS;
}

/** Sort unique HH:MM slot starts; throws if invalid. */
function normalizeAndSortSlots(slots: readonly string[]): string[] {
  const set = new Set<string>();
  for (const raw of slots) {
    const n = normalizeTimeHHMM(raw);
    if (n == null || !TIME_RE.test(n)) {
      throw new InputValidationError('Each slot must be a valid HH:MM hour start.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    if (parseTimeToMinutes(n) % 60 !== 0) {
      throw new InputValidationError('Slots must start on the hour (e.g. 09:00).', HttpStatusCodesUtil.BAD_REQUEST);
    }
    set.add(n);
  }
  return [...set].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

function assertConsecutiveHourly(sorted: string[]): void {
  for (let i = 1; i < sorted.length; i++) {
    if (parseTimeToMinutes(sorted[i]) !== parseTimeToMinutes(sorted[i - 1]) + 60) {
      throw new InputValidationError('Slots must be consecutive hours with no gaps.', HttpStatusCodesUtil.BAD_REQUEST);
    }
  }
}

/** Exclusive end on the same calendar day (e.g. 09:00+10:00 → 11:00). */
function exclusiveEndFromSortedStarts(sorted: string[]): string {
  const lastStart = parseTimeToMinutes(sorted[sorted.length - 1]);
  return minutesToHHMM(lastStart + 60);
}

function expandLegacyBookingHours(row: Booking): { time: string; studentUserId: number; dateIso: string }[] {
  const dateIso = dateIsoString(row.dateIso);
  const startM = parseTimeToMinutes(row.time);
  const endExclM = row.endTime ? parseTimeToMinutes(row.endTime) : startM + 60;
  if (!Number.isFinite(startM) || !Number.isFinite(endExclM) || endExclM <= startM) {
    return [{ dateIso, time: row.time, studentUserId: row.studentUserId }];
  }
  const out: { time: string; studentUserId: number; dateIso: string }[] = [];
  for (let m = startM; m < endExclM; m += 60) {
    out.push({ dateIso, time: minutesToHHMM(m), studentUserId: row.studentUserId });
  }
  return out;
}

/** Raw DB `bookings.status` values that still block the calendar slot row in `booking_slots`. */
function rawBookingStatusReservesSlot(status: unknown): boolean {
  const s = typeof status === 'string' ? status : '';
  return (SLOT_RESERVING_STATUSES as readonly string[]).includes(s as (typeof SLOT_RESERVING_STATUSES)[number]);
}

async function replaceBookingSlotRows(
  bookingId: number,
  instructorUserId: number,
  dateIso: string,
  sortedSlotTimes: string[],
  transaction: Transaction,
): Promise<void> {
  await BookingSlot.destroy({ where: { bookingId }, transaction });
  await BookingSlot.bulkCreate(
    sortedSlotTimes.map((slotTime) => ({
      bookingId,
      instructorUserId,
      dateIso: dateIso.slice(0, 10),
      slotTime,
    })),
    { transaction },
  );
}

/** Ends a practical booking, frees slots, optionally records a refund line when the student had paid. */
async function finalizePracticalCancellationInTx(opts: {
  row: Booking;
  studentUserId: number;
  transaction: Transaction;
  refundIfPaid: boolean;
}): Promise<{ status: BookingStatus; refundIssued: boolean }> {
  const { row, studentUserId, transaction, refundIfPaid } = opts;
  const st = normalizeBookingStatus(row.status);
  const wasPaid = row.paidAt != null && st === 'confirmed';
  const gross = row.totalPriceAmd != null && Number.isFinite(Number(row.totalPriceAmd)) ? Number(row.totalPriceAmd) : 0;
  const nextStatus: BookingStatus = refundIfPaid && wasPaid && gross > 0 ? 'refunded' : 'cancelled';

  await row.update(
    {
      status: nextStatus,
      holdExpiresAt: null,
      holdExtensionCount: 0,
      cancellationRequestedAt: null,
    },
    { transaction },
  );
  await BookingSlot.destroy({ where: { bookingId: row.id }, transaction });

  let refundIssued = false;
  if (nextStatus === 'refunded' && wasPaid && gross > 0) {
    const stu = await User.findByPk(studentUserId, { attributes: ['name', 'email'], transaction });
    if (stu) {
      try {
        await FinanceService.create({
          customer: stu.name.trim() || 'Student',
          email: stu.email ?? '',
          description: `Practical lesson booking #${row.id} (cancellation refund)`,
          branchId: row.branchId,
          channel: 'online',
          method: 'card',
          grossAmd: gross,
          feeAmd: 0,
          status: 'refunded',
          providerRef: `booking-refund:${row.id}`,
          source: 'system',
          bookingId: row.id,
        });
        refundIssued = true;
      } catch {
        refundIssued = false;
      }
    }
  }

  return { status: nextStatus, refundIssued };
}

export default class BookingService {
  private static mapRowToAdminDto(b: BookingWithUsers): BookingAdminDto {
    const row = b as BookingWithUsers;
    const inst = row.instructor;
    const stu = row.student;
    return {
      id: b.id,
      studentId: stu.id,
      instructorName: inst.name,
      dateIso: dateIsoString(b.dateIso),
      time: b.time,
      endTime: b.endTime ?? null,
      totalPriceAmd: b.totalPriceAmd ?? null,
      type: b.lessonType,
      status: normalizeBookingStatus(b.status),
      branchId: b.branchId,
      cancellationRequestedAt: b.cancellationRequestedAt ? new Date(b.cancellationRequestedAt).toISOString() : null,
      lessonPassedSuccessfully: lessonPassedSuccessfullyFromRow(b),
    };
  }

  static async listAdmin(): Promise<BookingAdminDto[]> {
    const rows = await Booking.findAll({
      include: [
        { model: User, as: 'instructor', required: true, attributes: ['name'] },
        { model: User, as: 'student', required: true, attributes: ['id'] },
      ],
      order: [
        ['dateIso', 'DESC'],
        ['time', 'DESC'],
      ],
    });
    return rows.map((b) => BookingService.mapRowToAdminDto(b as BookingWithUsers));
  }

  static async setLessonPassedSuccessfully(
    bookingId: number,
    value: boolean | null,
    actor: { kind: 'staff' } | { kind: 'instructor'; instructorUserId: number },
  ): Promise<BookingAdminDto | InstructorBookingDto | null> {
    const row = await Booking.findByPk(bookingId, {
      include: [
        { model: User, as: 'instructor', required: true, attributes: ['name'] },
        { model: User, as: 'student', required: true, attributes: ['id', 'name'] },
      ],
    });
    if (!row) return null;

    if (actor.kind === 'instructor') {
      if (row.instructorUserId !== actor.instructorUserId) {
        throw new PermissionError('You can only update your own bookings.', HttpStatusCodesUtil.FORBIDDEN);
      }
    }

    const st = normalizeBookingStatus(row.status);
    if (st === 'cancelled' || st === 'refunded') {
      throw new InputValidationError(
        'Lesson outcome cannot be updated for a cancelled or refunded booking.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    await row.update({ lessonPassedSuccessfully: value });

    const refreshed = await Booking.findByPk(bookingId, {
      include: [
        { model: User, as: 'instructor', required: true, attributes: ['name'] },
        { model: User, as: 'student', required: true, attributes: ['id', 'name'] },
      ],
    });
    if (!refreshed) return null;

    if (actor.kind === 'staff') {
      return BookingService.mapRowToAdminDto(refreshed as BookingWithUsers);
    }
    return BookingService.mapBookingToInstructorDto(refreshed as BookingWithStudent);
  }

  /** For calendar: each occupied hour for this instructor in the date range. */
  static async listBusySlotsForInstructor(
    instructorUserId: number,
    fromIso: string,
    toIso: string,
    excludeBookingId?: number,
  ): Promise<{ dateIso: string; time: string; studentUserId: number }[]> {
    const exists = await User.count({ where: { id: instructorUserId, accountType: 'instructor' } });
    if (!exists) return [];

    const bookingWhere: Record<string, unknown> = { status: { [Op.in]: [...SLOT_RESERVING_STATUSES] } };
    if (excludeBookingId != null && Number.isFinite(excludeBookingId) && excludeBookingId > 0) {
      bookingWhere.id = { [Op.ne]: excludeBookingId };
    }

    const slotRows = await BookingSlot.findAll({
      attributes: ['dateIso', 'slotTime'],
      where: {
        instructorUserId,
        dateIso: { [Op.between]: [fromIso.slice(0, 10), toIso.slice(0, 10)] },
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['studentUserId'],
          required: true,
          where: bookingWhere,
        },
      ],
    });

    const fromSlots = slotRows.map((r) => {
      const bk = (r as unknown as { booking: { studentUserId: number } }).booking;
      return {
        dateIso: dateIsoString(r.dateIso),
        time: r.slotTime,
        studentUserId: bk.studentUserId,
      };
    });

    const legacyWhere: Record<string, unknown> = {
      instructorUserId,
      dateIso: { [Op.between]: [fromIso.slice(0, 10), toIso.slice(0, 10)] },
      status: { [Op.in]: [...SLOT_RESERVING_STATUSES] },
      [Op.and]: literal(
        'NOT EXISTS (SELECT 1 FROM `booking_slots` AS `s` WHERE s.`booking_id` = `Booking`.`id`)',
      ),
    };
    if (excludeBookingId != null && Number.isFinite(excludeBookingId) && excludeBookingId > 0) {
      legacyWhere.id = { [Op.ne]: excludeBookingId };
    }

    const legacyBookings = await Booking.findAll({
      where: legacyWhere,
    });

    const fromLegacy = legacyBookings.flatMap((b) => expandLegacyBookingHours(b));

    const merged = [...fromSlots, ...fromLegacy];
    merged.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time));
    return merged;
  }

  static async listForStudent(studentUserId: number): Promise<StudentBookingDto[]> {
    const rows = await Booking.findAll({
      where: { studentUserId },
      include: [{ model: User, as: 'instructor', required: true, attributes: ['name'] }],
      order: [
        ['dateIso', 'DESC'],
        ['time', 'DESC'],
      ],
    });
    return rows.map((b) => {
      const row = b as BookingWithInstructor;
      const inst = row.instructor;
      const st = normalizeStudentBookingStatus(b.status);
      const today = todayIsoUtc();
      const dIso = dateIsoString(b.dateIso);
      const pendingCancel = b.cancellationRequestedAt != null;
      const hoursLeft = hoursUntilLessonStart(dIso, b.time);
      const eligible =
        b.lessonType === 'practical' &&
        (st === 'pending' || st === 'confirmed') &&
        dIso >= today &&
        !pendingCancel &&
        isRefundWindowForCancellation(dIso, b.time);
      return {
        id: b.id,
        dateIso: dateIsoString(b.dateIso),
        time: b.time,
        endTime: b.endTime ?? null,
        totalPriceAmd: b.totalPriceAmd ?? null,
        instructorUserId: b.instructorUserId,
        instructor: inst.name,
        lessonTypeKey:
          b.lessonType === 'theory'
            ? 'lessonTypeTheory'
            : b.lessonType === 'theory_personal'
              ? 'lessonTypeTheoryPersonal'
              : 'lessonTypePractical',
        status: st,
        ...(b.lessonType === 'practical'
          ? {
              holdExpiresAt: b.holdExpiresAt ? new Date(b.holdExpiresAt).toISOString() : null,
              holdExtensionCount: Number(b.holdExtensionCount ?? 0),
              maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
              cancelRefundEligible: eligible,
              hoursUntilLesson: Math.round(hoursLeft * 10) / 10,
              cancellationRequestedAt: b.cancellationRequestedAt
                ? new Date(b.cancellationRequestedAt).toISOString()
                : null,
            }
          : {}),
      };
    });
  }

  private static mapBookingToInstructorDto(b: BookingWithStudent): InstructorBookingDto {
    const stu = b.student;
    return {
      id: b.id,
      studentId: stu.id,
      studentName: stu.name,
      dateIso: dateIsoString(b.dateIso),
      time: b.time,
      endTime: b.endTime ?? null,
      totalPriceAmd: b.totalPriceAmd ?? null,
      type: b.lessonType,
      status: normalizeBookingStatus(b.status),
      branchId: b.branchId,
      lessonPassedSuccessfully: lessonPassedSuccessfullyFromRow(b),
    };
  }

  static async listForInstructor(instructorUserId: number): Promise<InstructorBookingDto[]> {
    const rows = await Booking.findAll({
      where: { instructorUserId },
      include: [{ model: User, as: 'student', required: true, attributes: ['id', 'name'] }],
      order: [
        ['dateIso', 'DESC'],
        ['time', 'DESC'],
      ],
    });
    return rows.map((b) => BookingService.mapBookingToInstructorDto(b as BookingWithStudent));
  }

  /**
   * Authenticated student: book one or more consecutive hourly slots.
   * Concurrency: relies on DB unique (instructor, date, slot_time) on `booking_slots` inside a transaction.
   */
  static async createFromStudentSlotSelection(input: {
    studentUserId: number;
    instructorUserId: number;
    dateIso: string;
    slots: readonly string[];
    branchId: number;
    /**
     * When the lesson is **more than one calendar month away**, the student may reserve without
     * starting a payment hold. When `true`, the usual 10-minute payment window starts immediately.
     */
    payNow?: boolean;
  }): Promise<StudentMultiSlotBookingDto> {
    const dateIso = input.dateIso.slice(0, 10);
    const sorted = normalizeAndSortSlots(input.slots);
    assertConsecutiveHourly(sorted);
    if (sorted.length === 0) {
      throw new InputValidationError('At least one slot is required.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const student = await User.findOne({
      where: { id: input.studentUserId, accountType: 'student' },
      attributes: ['id'],
    });
    if (!student) {
      throw new InputValidationError('Student account required.', HttpStatusCodesUtil.FORBIDDEN);
    }

    const instructor = await User.findOne({
      where: { id: input.instructorUserId, accountType: 'instructor' },
      attributes: ['id'],
    });
    if (!instructor) {
      throw new InputValidationError('Instructor not found.', HttpStatusCodesUtil.NOT_FOUND);
    }

    const branchOk = await InstructorBranch.findOne({
      where: { instructorUserId: input.instructorUserId, branchId: input.branchId },
    });
    if (!branchOk) {
      throw new InputValidationError('Instructor does not serve this branch.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const profile = await InstructorProfile.findOne({ where: { userId: input.instructorUserId } });
    assertInstructorTeachesLessonType(profile, 'practical');

    const hourly = Number(profile.hourlyPrice);
    if (!Number.isFinite(hourly) || hourly < 0) {
      throw new InputValidationError('Instructor hourly rate is not configured.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const totalPriceAmd = hourly * sorted.length;

    for (const slot of sorted) {
      const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
        input.instructorUserId,
        dateIso,
        slot,
      );

      if (unavailable) {
        throw new InputValidationError(
          'Instructor is not available at this time (day off, break, or outside work hours).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const exclusiveEnd = exclusiveEndFromSortedStarts(sorted);
    const today = todayIsoUtc();
    const paymentRequiredNow = isLessonOnOrBeforePayHorizon(dateIso, today);

    if (paymentRequiredNow && input.payNow === false) {
      throw new InputValidationError(
        'Payment is required for this lesson date; you cannot defer payment.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const startPaymentHold = paymentRequiredNow || input.payNow === true;
    const holdExpiresAt = startPaymentHold ? new Date(Date.now() + PAYMENT_HOLD_MS) : null;

    try {
      const row = await sequelize.transaction(async (transaction) => {
        for (const slot of sorted) {
          const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
            input.instructorUserId,
            dateIso,
            slot,
          );

          if (unavailable) {
            throw new InputValidationError(
              'Instructor is not available at this time (day off, break, or outside work hours).',
              HttpStatusCodesUtil.BAD_REQUEST,
            );
          }
        }

        const booking = await Booking.create(
          {
            studentUserId: input.studentUserId,
            instructorUserId: input.instructorUserId,
            branchId: input.branchId,
            dateIso,
            time: sorted[0],
            endTime: exclusiveEnd,
            totalPriceAmd,
            lessonType: 'practical',
            status: 'pending',
            paidAt: null,
            holdExpiresAt,
            holdExtensionCount: 0,
          },
          { transaction },
        );

        await BookingSlot.bulkCreate(
          sorted.map((slotTime) => ({
            bookingId: booking.id,
            instructorUserId: input.instructorUserId,
            dateIso,
            slotTime,
          })),
          { transaction },
        );

        return booking;
      });

      return {
        id: row.id,
        instructorUserId: input.instructorUserId,
        dateIso,
        slots: sorted,
        startTime: sorted[0],
        endTimeExclusive: exclusiveEnd,
        totalPriceAmd,
        hourlyRateAmd: hourly,
        status: 'pending',
        branchId: input.branchId,
        holdExpiresAt: holdExpiresAt ? holdExpiresAt.toISOString() : null,
        holdExtensionCount: 0,
        maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
        paymentRequiredNow,
      };
    } catch (e) {
      console.log(e, 'eee')
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }
  }

  static async createAdmin(input: {
    studentId: number;
    instructorName: string;
    dateIso: string;
    time: string;
    type: 'practical' | 'theory' | 'theory_personal';
    status: string;
    branchId: number;
    slots?: readonly string[];
    theoryCohortId?: number;
  }): Promise<BookingAdminDto | null> {
    const dateIso = input.dateIso.slice(0, 10);
    const slotList = input.slots?.filter((s) => typeof s === 'string' && s.trim().length > 0) ?? [];
    const useMulti =
      slotList.length > 0 && (input.type === 'practical' || input.type === 'theory');

    if (useMulti) {
      const lessonType: 'practical' | 'theory' = input.type === 'theory' ? 'theory' : 'practical';
      return BookingService.createAdminWithConsecutiveSlots({
        studentId: input.studentId,
        dateIso,
        slots: slotList,
        lessonType,
        status: input.status,
        branchId: input.branchId,
        instructorName: input.instructorName,
        theoryCohortId: input.theoryCohortId,
      });
    }

    const instructor = await User.findOne({
      where: { name: input.instructorName, accountType: 'instructor' },
    });
    if (!instructor) return null;
    const sorted = normalizeAndSortSlots([input.time]);
    const exclusiveEnd = exclusiveEndFromSortedStarts(sorted);

    const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
      instructor.id,
      dateIso,
      sorted[0],
    );
    if (unavailable) {
      throw new InputValidationError(
        'Instructor is not available at this time (day off, break, or outside work hours).',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const profile = await InstructorProfile.findOne({ where: { userId: instructor.id } });
    assertInstructorTeachesLessonType(profile, input.type);
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd = Number.isFinite(hourly) ? hourly * sorted.length : 0;

    let newId = 0;
    try {
      await sequelize.transaction(async (transaction) => {
        const created = await Booking.create(
          {
            studentUserId: input.studentId,
            instructorUserId: instructor.id,
            branchId: input.branchId,
            dateIso,
            time: sorted[0],
            endTime: exclusiveEnd,
            totalPriceAmd,
            lessonType: input.type,
            status: input.status,
          },
          { transaction },
        );
        newId = created.id;
        await BookingSlot.bulkCreate(
          sorted.map((slotTime) => ({
            bookingId: created.id,
            instructorUserId: instructor.id,
            dateIso,
            slotTime,
          })),
          { transaction },
        );
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    void BookingConfirmationNotifier.trySendForBookingId(newId).catch(() => {});

    const rows = await this.listAdmin();
    return rows.find((x) => x.id === newId) ?? null;
  }

  /** Admin: one booking spanning consecutive hourly slots (practical or theory group). */
  private static async createAdminWithConsecutiveSlots(input: {
    studentId: number;
    dateIso: string;
    slots: readonly string[];
    lessonType: 'practical' | 'theory';
    status: string;
    branchId: number;
    instructorName: string;
    theoryCohortId?: number;
  }): Promise<BookingAdminDto | null> {
    const dateIso = input.dateIso.slice(0, 10);
    const sorted = normalizeAndSortSlots(input.slots);
    assertConsecutiveHourly(sorted);
    if (sorted.length === 0) {
      throw new InputValidationError('At least one slot is required.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    let instructorUserId: number;
    let branchId = input.branchId;

    if (input.lessonType === 'theory') {
      if (input.theoryCohortId == null || !Number.isFinite(input.theoryCohortId)) {
        throw new InputValidationError('theoryCohortId is required for theory group bookings.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const cohort = await TheoryCohort.findByPk(input.theoryCohortId);
      if (!cohort) {
        throw new InputValidationError('Theory cohort not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (String(cohort.status).toLowerCase() !== 'active') {
        throw new InputValidationError('Only active theory cohorts can be used for new bookings.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      branchId = cohort.branchId;
      const instructor = await User.findOne({
        where: { name: cohort.instructorName, accountType: 'instructor' },
      });
      if (!instructor) {
        throw new InputValidationError(
          `No instructor user matches cohort instructor "${cohort.instructorName}".`,
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      instructorUserId = instructor.id;
      try {
        await TheoryCohortService.enroll(cohort.id, input.studentId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (!(e instanceof ConflictError) || !msg.includes('already enrolled')) {
          throw e;
        }
      }
    } else {
      const instructor = await User.findOne({
        where: { name: input.instructorName, accountType: 'instructor' },
      });
      if (!instructor) return null;
      instructorUserId = instructor.id;
    }

    const branchOk = await InstructorBranch.findOne({
      where: { instructorUserId, branchId },
    });
    if (!branchOk) {
      throw new InputValidationError('Instructor does not serve this branch.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const profile = await InstructorProfile.findOne({ where: { userId: instructorUserId } });
    assertInstructorTeachesLessonType(profile, input.lessonType);
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd = Number.isFinite(hourly) ? hourly * sorted.length : 0;
    const exclusiveEnd = exclusiveEndFromSortedStarts(sorted);

    for (const slot of sorted) {
      const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
        instructorUserId,
        dateIso,
        slot,
      );
      if (unavailable) {
        throw new InputValidationError(
          'Instructor is not available at this time (day off, break, or outside work hours).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    let newId = 0;
    try {
      await sequelize.transaction(async (transaction) => {
        for (const slot of sorted) {
          const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
            instructorUserId,
            dateIso,
            slot,
          );
          if (unavailable) {
            throw new InputValidationError(
              'Instructor is not available at this time (day off, break, or outside work hours).',
              HttpStatusCodesUtil.BAD_REQUEST,
            );
          }
        }

        const created = await Booking.create(
          {
            studentUserId: input.studentId,
            instructorUserId,
            branchId,
            dateIso,
            time: sorted[0],
            endTime: exclusiveEnd,
            totalPriceAmd,
            lessonType: input.lessonType,
            status: input.status,
            paidAt: null,
            holdExpiresAt: null,
          },
          { transaction },
        );
        newId = created.id;
        await BookingSlot.bulkCreate(
          sorted.map((slotTime) => ({
            bookingId: created.id,
            instructorUserId,
            dateIso,
            slotTime,
          })),
          { transaction },
        );
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    void BookingConfirmationNotifier.trySendForBookingId(newId).catch(() => {});

    const rows = await this.listAdmin();
    return rows.find((x) => x.id === newId) ?? null;
  }

  private static async updateAdminWithConsecutiveSlotsForExisting(opts: {
    id: number;
    row: Booking;
    patch: Partial<{
      studentId: number;
      instructorName: string;
      dateIso: string;
      time: string;
      type: 'practical' | 'theory' | 'theory_personal';
      status: string;
      branchId: number;
      slots: readonly string[];
      theoryCohortId?: number;
    }>;
    lessonType: 'practical' | 'theory';
    slots: readonly string[];
  }): Promise<BookingAdminDto | null> {
    const { id, row, patch, lessonType, slots } = opts;
    const dateIso =
      patch.dateIso !== undefined ? patch.dateIso.slice(0, 10) : dateIsoString(row.dateIso);
    const sorted = normalizeAndSortSlots(slots);
    assertConsecutiveHourly(sorted);
    const exclusiveEnd = exclusiveEndFromSortedStarts(sorted);

    let instructorUserId: number;
    let branchId = patch.branchId !== undefined ? patch.branchId : row.branchId;
    const nextStudentId = patch.studentId !== undefined ? patch.studentId : row.studentUserId;

    if (lessonType === 'theory') {
      const theoryCohortId = patch.theoryCohortId;
      if (theoryCohortId == null || !Number.isFinite(theoryCohortId)) {
        throw new InputValidationError(
          'theoryCohortId is required for theory group bookings.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      const cohort = await TheoryCohort.findByPk(theoryCohortId);
      if (!cohort) {
        throw new InputValidationError('Theory cohort not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (String(cohort.status).toLowerCase() !== 'active') {
        throw new InputValidationError(
          'Only active theory cohorts can be used for bookings.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      branchId = cohort.branchId;
      const instructor = await User.findOne({
        where: { name: cohort.instructorName, accountType: 'instructor' },
      });
      if (!instructor) {
        throw new InputValidationError(
          `No instructor user matches cohort instructor "${cohort.instructorName}".`,
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      instructorUserId = instructor.id;
      try {
        await TheoryCohortService.enroll(cohort.id, nextStudentId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (!(e instanceof ConflictError) || !msg.includes('already enrolled')) {
          throw e;
        }
      }
    } else {
      let instructorName = patch.instructorName?.trim();
      if (!instructorName) {
        const prev = await User.findByPk(row.instructorUserId, { attributes: ['name'] });
        instructorName = prev?.name?.trim() ?? '';
      }
      if (!instructorName) {
        throw new InputValidationError(
          'instructorName is required for practical bookings.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      const instructor = await User.findOne({
        where: { name: instructorName, accountType: 'instructor' },
      });
      if (!instructor) return null;
      instructorUserId = instructor.id;
    }

    const branchOk = await InstructorBranch.findOne({
      where: { instructorUserId, branchId },
    });
    if (!branchOk) {
      throw new InputValidationError('Instructor does not serve this branch.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const profile = await InstructorProfile.findOne({ where: { userId: instructorUserId } });
    assertInstructorTeachesLessonType(profile, lessonType);
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd = Number.isFinite(hourly) ? hourly * sorted.length : row.totalPriceAmd ?? null;

    for (const slot of sorted) {
      const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
        instructorUserId,
        dateIso,
        slot,
      );
      if (unavailable) {
        throw new InputValidationError(
          'Instructor is not available at this time (day off, break, or outside work hours).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const mergedStatusBeforeTx = patch.status !== undefined ? patch.status : row.status;

    try {
      await sequelize.transaction(async (transaction) => {
        await row.update(
          {
            ...(patch.studentId !== undefined ? { studentUserId: patch.studentId } : {}),
            instructorUserId,
            dateIso,
            time: sorted[0],
            endTime: exclusiveEnd,
            totalPriceAmd,
            ...(patch.type !== undefined ? { lessonType: patch.type } : { lessonType }),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            branchId,
          },
          { transaction },
        );
        await replaceBookingSlotRows(id, instructorUserId, dateIso, sorted, transaction);
        if (!rawBookingStatusReservesSlot(mergedStatusBeforeTx)) {
          await BookingSlot.destroy({ where: { bookingId: id }, transaction });
        }
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    void BookingConfirmationNotifier.trySendForBookingId(id).catch(() => {});

    return (await this.listAdmin()).find((x) => x.id === id) ?? null;
  }

  static async updateAdmin(
    id: number,
    patch: Partial<{
      studentId: number;
      instructorName: string;
      dateIso: string;
      time: string;
      type: 'practical' | 'theory' | 'theory_personal';
      status: string;
      branchId: number;
      slots?: readonly string[];
      theoryCohortId?: number;
    }>,
  ): Promise<BookingAdminDto | null> {
    const row = await Booking.findByPk(id);
    if (!row) return null;

    const effectiveType = patch.type ?? row.lessonType;
    const slotList = patch.slots?.filter((s) => typeof s === 'string' && s.trim().length > 0) ?? [];
    if (slotList.length > 0 && effectiveType === 'theory_personal') {
      throw new InputValidationError(
        'Personal theory bookings use a single time, not slots[]',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const useMulti = slotList.length > 0 && (effectiveType === 'practical' || effectiveType === 'theory');
    if (useMulti) {
      return BookingService.updateAdminWithConsecutiveSlotsForExisting({
        id,
        row,
        patch,
        lessonType: effectiveType,
        slots: slotList,
      });
    }

    let instructorUserId = row.instructorUserId;
    if (patch.instructorName !== undefined) {
      const instructor = await User.findOne({
        where: { name: patch.instructorName, accountType: 'instructor' },
      });
      if (!instructor) return null;
      instructorUserId = instructor.id;
    }
    const nextDateIso = patch.dateIso !== undefined ? patch.dateIso.slice(0, 10) : dateIsoString(row.dateIso);
    const nextTime = patch.time !== undefined ? patch.time : row.time;
    const sorted = normalizeAndSortSlots([nextTime]);
    const exclusiveEnd = exclusiveEndFromSortedStarts(sorted);

    const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
      instructorUserId,
      nextDateIso,
      sorted[0],
    );
    if (unavailable) {
      throw new InputValidationError(
        'Instructor is not available at this time (day off, break, or outside work hours).',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const profile = await InstructorProfile.findOne({ where: { userId: instructorUserId } });
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd = Number.isFinite(hourly) ? hourly * sorted.length : row.totalPriceAmd ?? null;

    const mergedStatusBeforeTx = patch.status !== undefined ? patch.status : row.status;

    try {
      await sequelize.transaction(async (transaction) => {
        await row.update(
          {
            ...(patch.studentId !== undefined ? { studentUserId: patch.studentId } : {}),
            ...(patch.instructorName !== undefined ? { instructorUserId } : {}),
            ...(patch.dateIso !== undefined ? { dateIso: nextDateIso } : {}),
            ...(patch.time !== undefined ? { time: sorted[0] } : {}),
            ...(patch.time !== undefined || patch.dateIso !== undefined || patch.instructorName !== undefined
              ? { endTime: exclusiveEnd, totalPriceAmd }
              : {}),
            ...(patch.type !== undefined ? { lessonType: patch.type } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
          },
          { transaction },
        );

        if (patch.dateIso !== undefined || patch.time !== undefined || patch.instructorName !== undefined) {
          await replaceBookingSlotRows(row.id, instructorUserId, nextDateIso, sorted, transaction);
        }
        if (!rawBookingStatusReservesSlot(mergedStatusBeforeTx)) {
          await BookingSlot.destroy({ where: { bookingId: row.id }, transaction });
        }
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    void BookingConfirmationNotifier.trySendForBookingId(id).catch(() => {});

    return (await this.listAdmin()).find((x) => x.id === id) ?? null;
  }

  /** Student: extend active payment hold by 5 minutes (only when ≤1 min left, max {@link MAX_PAYMENT_HOLD_EXTENSIONS} times). */
  static async extendPracticalPaymentHold(bookingId: number, studentUserId: number): Promise<{
    holdExpiresAt: string;
    holdExtensionCount: number;
    maxHoldExtensions: number;
  }> {
    return sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, studentUserId, lessonType: 'practical' },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if (st !== 'pending' || row.paidAt != null) {
        throw new InputValidationError('This booking cannot be extended.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (row.holdExpiresAt == null) {
        throw new InputValidationError('No active payment countdown for this booking.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const until = new Date(row.holdExpiresAt).getTime();
      const remaining = until - Date.now();
      if (remaining <= 0) {
        throw new InputValidationError('The payment window has already ended.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (remaining > PAYMENT_EXTEND_THRESHOLD_MS) {
        throw new InputValidationError(
          'Extensions are only available when one minute or less remains.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      const used = Number(row.holdExtensionCount ?? 0);
      if (used >= MAX_PAYMENT_HOLD_EXTENSIONS) {
        throw new ConflictError('Maximum payment extensions already used for this booking.', HttpStatusCodesUtil.CONFLICT);
      }
      const nextUntil = new Date(until + PAYMENT_EXTENSION_MS);
      await row.update(
        { holdExpiresAt: nextUntil, holdExtensionCount: used + 1 },
        { transaction },
      );
      return {
        holdExpiresAt: nextUntil.toISOString(),
        holdExtensionCount: used + 1,
        maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
      };
    });
  }

  /**
   * Student: start the 10-minute payment window for a “pay later” practical booking
   * (lesson date beyond the one-calendar-month pay horizon).
   */
  static async startPracticalPaymentWindow(bookingId: number, studentUserId: number): Promise<{
    holdExpiresAt: string;
    holdExtensionCount: number;
    maxHoldExtensions: number;
  }> {
    return sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, studentUserId, lessonType: 'practical' },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if (st !== 'pending' || row.paidAt != null) {
        throw new InputValidationError('This booking is not awaiting payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const today = todayIsoUtc();
      const dateIso = dateIsoString(row.dateIso);
      if (isLessonOnOrBeforePayHorizon(dateIso, today)) {
        throw new InputValidationError(
          'This lesson date uses the standard payment flow at booking time.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      if (row.holdExpiresAt != null && new Date(row.holdExpiresAt).getTime() > Date.now()) {
        return {
          holdExpiresAt: new Date(row.holdExpiresAt).toISOString(),
          holdExtensionCount: Number(row.holdExtensionCount ?? 0),
          maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
        };
      }
      const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MS);
      await row.update({ holdExpiresAt: holdUntil, holdExtensionCount: 0 }, { transaction });
      return {
        holdExpiresAt: holdUntil.toISOString(),
        holdExtensionCount: 0,
        maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
      };
    });
  }

  /** Student: mark payment completed (dev / placeholder until a real PSP webhook exists). */
  static async completePracticalStudentPayment(bookingId: number, studentUserId: number): Promise<StudentBookingDto> {
    let updatedId = bookingId;
    await sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, studentUserId, lessonType: 'practical' },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if (st !== 'pending' || row.paidAt != null) {
        throw new InputValidationError('This booking is not awaiting payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (row.holdExpiresAt == null || new Date(row.holdExpiresAt).getTime() <= Date.now()) {
        throw new InputValidationError(
          'Payment window is not active or has expired. Start payment again if your booking is still reserved.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      const paidAt = new Date();
      await row.update(
        { status: 'confirmed', paidAt, holdExpiresAt: null, holdExtensionCount: 0 },
        { transaction },
      );
      updatedId = row.id;
    });

    const list = await BookingService.listForStudent(studentUserId);
    const dto = list.find((b) => b.id === updatedId);
    if (!dto) {
      throw new InputValidationError('Booking not found after update.', HttpStatusCodesUtil.NOT_FOUND);
    }

    const row = await Booking.findByPk(updatedId, { include: [{ model: User, as: 'student', attributes: ['name', 'email'] }] });
    const stu = row ? ((row as unknown as { student?: User }).student ?? null) : null;
    const gross = row?.totalPriceAmd != null && Number.isFinite(Number(row.totalPriceAmd)) ? Number(row.totalPriceAmd) : 0;
    if (row && gross > 0 && stu) {
      try {
        await FinanceService.create({
          customer: stu.name.trim() || 'Student',
          email: stu.email ?? '',
          description: `Practical lesson #${row.id} — AcBa Bank POS (simulated)`,
          branchId: row.branchId,
          channel: 'pos',
          method: 'card',
          grossAmd: gross,
          feeAmd: 0,
          status: 'completed',
          providerRef: `booking-pos:${row.id}`,
          source: 'system',
          bookingId: row.id,
        });
      } catch {
        // Finance row is best-effort for local/dev; booking remains confirmed.
      }
    }

    void BookingConfirmationNotifier.trySendForBookingId(updatedId).catch(() => {});

    return dto;
  }

  /**
   * Student: cancel a practical booking.
   * ≥24h before lesson → sets {@link Booking.cancellationRequestedAt}; staff completes refund/cancel.
   * &lt;24h → immediate `cancelled`, no refund.
   */
  static async cancelPracticalStudentBooking(bookingId: number, studentUserId: number): Promise<StudentPracticalCancelOutcome> {
    let outcome: StudentPracticalCancelOutcome | undefined;
    await sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, studentUserId, lessonType: 'practical' },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if (st === 'cancelled' || st === 'refunded') {
        throw new InputValidationError('This booking is already closed.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (st !== 'pending' && st !== 'confirmed') {
        throw new InputValidationError('This booking cannot be cancelled here.', HttpStatusCodesUtil.BAD_REQUEST);
      }

      const dateIso = dateIsoString(row.dateIso);

      if (row.cancellationRequestedAt != null) {
        outcome = {
          outcome: 'pending_admin',
          cancellationRequestedAt: new Date(row.cancellationRequestedAt).toISOString(),
        };
        return;
      }

      if (isRefundWindowForCancellation(dateIso, row.time)) {
        const requestedAt = new Date();
        await row.update({ cancellationRequestedAt: requestedAt }, { transaction });
        outcome = { outcome: 'pending_admin', cancellationRequestedAt: requestedAt.toISOString() };
        return;
      }

      const fin = await finalizePracticalCancellationInTx({
        row,
        studentUserId,
        transaction,
        refundIfPaid: false,
      });
      outcome = { outcome: 'immediate', status: fin.status, refundIssued: fin.refundIssued };
    });
    if (!outcome) {
      throw new InputValidationError('Cancellation could not be completed.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    return outcome;
  }

  /** Staff: complete a student-initiated cancellation (free slots, refund ledger if the lesson was paid). */
  static async staffApprovePracticalCancellation(bookingId: number): Promise<{ status: BookingStatus; refundIssued: boolean }> {
    return sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, lessonType: 'practical' },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (row.cancellationRequestedAt == null) {
        throw new InputValidationError(
          'No pending student cancellation request for this booking.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      const st = normalizeBookingStatus(row.status);
      if (st !== 'pending' && st !== 'confirmed') {
        throw new InputValidationError('This booking cannot be resolved here.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      return finalizePracticalCancellationInTx({
        row,
        studentUserId: row.studentUserId,
        transaction,
        refundIfPaid: true,
      });
    });
  }

  /** Staff: decline a student cancellation request; booking stays active. */
  static async staffRejectPracticalCancellation(bookingId: number): Promise<{ ok: true }> {
    await sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, lessonType: 'practical' },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (row.cancellationRequestedAt == null) {
        throw new InputValidationError(
          'No pending student cancellation request for this booking.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      await row.update({ cancellationRequestedAt: null }, { transaction });
    });
    return { ok: true as const };
  }

  static async remove(id: number): Promise<boolean> {
    const n = await Booking.destroy({ where: { id } });
    return n > 0;
  }
}
