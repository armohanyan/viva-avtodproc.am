import { setImmediate } from 'node:timers';
import { Op, Transaction, UniqueConstraintError, literal } from 'sequelize';
import { sequelize } from '../database/sequelize';
import {
  Booking,
  BookingSlot,
  FinanceTransaction,
  InstructorBranch,
  InstructorProfile,
  TheoryCohort,
  TheoryCohortEnrollment,
  User,
} from '../models';
import { BOOKING_CANCELLATION_REASON } from '../constants/booking-cancellation-reasons';
import TheoryCohortService from './theory-cohort.service';
import InstructorAvailabilityService from './instructor-availability.service';
import FinanceService from './finance.service';
import BookingNotificationService from './booking-notification.service';
import StudentPracticalCreditsService, { type PrepaidMeta } from './student-practical-credits.service';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil, LoggerUtil } from '../utils';
import { todayIsoUtc } from '../utils/calendar-month.util';
import {
  getPaymentRequiredCalendarIso,
  isImmediatePaymentRequired,
  shouldAutoCancelUnpaidAfterPaymentDeadline,
} from '../utils/booking-payment-schedule.util';

const { InputValidationError, ConflictError, PermissionError } = ErrorsUtil;

/** Cohort statuses that accept new group-theory bookings (admin + student flows). */
const THEORY_COHORT_OPEN_FOR_BOOKING = new Set(['active', 'upcoming', 'scheduled', 'planned', 'open']);

function theoryCohortAllowsNewBookings(status: unknown): boolean {
  return THEORY_COHORT_OPEN_FOR_BOOKING.has(String(status ?? '').trim().toLowerCase());
}

/** Group theory: use cohort fixed `priceAmd` when set; otherwise instructor hourly × number of slot hours. */
function totalPriceAmdForTheoryCohortBooking(cohort: TheoryCohort, hourly: number, slotCount: number): number {
  const raw = cohort.getDataValue('priceAmd') as number | null | undefined;
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 0) {
    return Math.round(Number(raw));
  }
  return Number.isFinite(hourly) ? Math.round(hourly * slotCount) : 0;
}

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

/** DB values that represent an unpaid / awaiting-payment booking row. */
const PENDING_BOOKING_DB_STATUSES = ['pending', 'pending_prebook', 'pending_payment'] as const;

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

type BookingWithUsers = Booking & { instructor: User | null; student: User };
type BookingWithInstructor = Booking & { instructor: User | null };
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
  /** From `booking_slots` when loaded (admin calendar / multi-day edits). */
  slotEntries?: { dateIso: string; time: string }[];
  paymentStatus?: string | null;
  paymentRequiredAt?: string | null;
  cancellationReason?: string | null;
};

/** Canonical booking row statuses (DB + API). */
export type BookingStatus = 'confirmed' | 'pending' | 'pending_payment' | 'cancelled' | 'refunded';

/** Response for POST /bookings/:id/approve-student-cancellation (staff). */
export type StaffApproveStudentCancellationResponse = {
  success: true;
  message: string;
  /** `refund_pending` reserved for an async payment-gateway refund path (not used while refunds are ledger-only). */
  status: 'refunded' | 'cancelled' | 'refund_pending';
};

export type StudentBookingDto = {
  id: number;
  dateIso: string;
  time: string;
  endTime: string | null;
  totalPriceAmd: number | null;
  instructorUserId: number | null;
  /** Empty when the instructor account was removed but the booking is kept. */
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
  paymentStatus?: 'paid' | 'unpaid' | 'pending' | 'failed' | null;
  /** First calendar day when card payment becomes mandatory (reserved-unpaid flow). */
  paymentRequiredAt?: string | null;
  /** True when the lesson is within the pay-horizon and payment has not been captured yet. */
  paymentRequiredNow?: boolean;
};

/** Result of POST /bookings/:id/cancel-student for student bookings. */
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
  /** True when the booking is fully covered by package / extra practical credits (no card payment). */
  coveredByPrepaidCredits: boolean;
  /** First calendar day when payment becomes mandatory (reserved-unpaid practical bookings). */
  paymentRequiredAt?: string | null;
};

export type StudentPaidBookingCreateDto = {
  id: number;
  totalPriceAmd: number;
  status: BookingStatus;
  holdExpiresAt: string;
  holdExtensionCount: number;
  maxHoldExtensions: number;
  paymentRequiredNow: true;
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

const BOOKING_STATUSES = new Set<string>(['confirmed', 'pending', 'pending_payment', 'cancelled', 'refunded']);

/** Legacy rows from older builds — coerce for API / UI. */
export function normalizeBookingStatus(raw: string): BookingStatus {
  if (BOOKING_STATUSES.has(raw)) {
    return raw as BookingStatus;
  }
  if (raw === 'completed') {
    return 'confirmed';
  }
  if (raw === 'pending_prebook') {
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

/** Hours from `instant` until lesson start; negative if the instant is after the lesson start. */
export function hoursFromInstantUntilLessonStart(dateIso: string, timeHHMM: string, instant: Date): number {
  const t = instant.getTime();
  if (Number.isNaN(t)) return Number.NEGATIVE_INFINITY;
  return (lessonStartDateUtcMs(dateIsoString(dateIso), timeHHMM) - t) / 3600_000;
}

/** True when the student’s cancellation request was submitted at least 24h before the booked slot. */
function studentRefundEligibleAtRequestTime(requestedAt: Date, dateIso: string, timeHHMM: string): boolean {
  return hoursFromInstantUntilLessonStart(dateIso, timeHHMM, requestedAt) >= CANCELLATION_REFUND_MIN_HOURS;
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

const MAX_ADMIN_SLOT_ENTRIES = 64;

type AdminSlotEntry = { dateIso: string; time: string };

/** Dedupe, normalize, sort chronologically; drops invalid hour-starts. */
function normalizeAdminSlotEntries(raw: readonly { dateIso: string; time: string }[]): AdminSlotEntry[] {
  const seen = new Set<string>();
  const out: AdminSlotEntry[] = [];
  for (const r of raw) {
    const d = dateIsoString(r.dateIso);
    const t = normalizeTimeHHMM(String(r.time ?? '').trim());
    if (!t || !TIME_RE.test(t)) continue;
    if (parseTimeToMinutes(t) % 60 !== 0) continue;
    const key = `${d}\t${t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ dateIso: d, time: t });
  }
  out.sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time),
  );
  return out;
}

/** Same calendar day, consecutive full hours → exclusive end on that day; otherwise `null`. */
function endTimeExclusiveForSlotEntries(entries: readonly AdminSlotEntry[]): string | null {
  if (entries.length === 0) return null;
  const d0 = entries[0].dateIso;
  if (!entries.every((e) => e.dateIso === d0)) return null;
  const times = [...entries.map((e) => e.time)].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  for (const t of times) {
    if (!TIME_RE.test(t) || parseTimeToMinutes(t) % 60 !== 0) return null;
  }
  for (let i = 1; i < times.length; i++) {
    if (parseTimeToMinutes(times[i]) !== parseTimeToMinutes(times[i - 1]) + 60) return null;
  }
  return exclusiveEndFromSortedStarts(times);
}

async function replaceBookingSlotRowsFromEntries(
  bookingId: number,
  instructorUserId: number,
  entries: readonly AdminSlotEntry[],
  transaction: Transaction,
): Promise<void> {
  await BookingSlot.destroy({ where: { bookingId }, transaction });
  if (entries.length === 0) return;
  await BookingSlot.bulkCreate(
    entries.map((e) => ({
      bookingId,
      instructorUserId,
      dateIso: e.dateIso.slice(0, 10),
      slotTime: e.time,
    })),
    { transaction },
  );
}

function coercePrepaidMetaFromRow(raw: unknown): PrepaidMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const pkg = Math.max(0, Math.floor(Number(o.pkg) || 0));
  const extras: Array<{ id: number; n: number }> = [];
  if (Array.isArray(o.extras)) {
    for (const e of o.extras) {
      if (e && typeof e === 'object') {
        const ex = e as Record<string, unknown>;
        extras.push({ id: Math.floor(Number(ex.id) || 0), n: Math.max(0, Math.floor(Number(ex.n) || 0)) });
      }
    }
  }
  const m: PrepaidMeta = { pkg, extras: extras.filter((x) => x.id > 0 && x.n > 0) };
  return StudentPracticalCreditsService.isNonEmptyMeta(m) ? m : null;
}

/** Ends a student booking, frees slots, optionally records a refund line when the student had paid. */
async function finalizePracticalCancellationInTx(opts: {
  row: Booking;
  studentUserId: number;
  transaction: Transaction;
  refundIfPaid: boolean;
  cancellationReason?: string | null;
  recordAutoCancelledAt?: boolean;
}): Promise<{ status: BookingStatus; refundIssued: boolean }> {
  const { row, studentUserId, transaction, refundIfPaid, cancellationReason, recordAutoCancelledAt } = opts;
  const st = normalizeBookingStatus(row.status);
  const wasPaid = row.paidAt != null && st === 'confirmed';
  const gross = row.totalPriceAmd != null && Number.isFinite(Number(row.totalPriceAmd)) ? Number(row.totalPriceAmd) : 0;
  const nextStatus: BookingStatus = refundIfPaid && wasPaid && gross > 0 ? 'refunded' : 'cancelled';

  const prepaidMeta = coercePrepaidMetaFromRow(row.prepaidMeta as unknown);
  if (prepaidMeta) {
    await StudentPracticalCreditsService.restoreSlots(studentUserId, prepaidMeta, transaction);
  }

  const rawPrepaid = row.prepaidMeta as Record<string, unknown> | null;
  if (row.lessonType === 'theory' && rawPrepaid) {
    const cohortId = Math.floor(Number(rawPrepaid.theoryCohortId));
    if (Number.isFinite(cohortId) && cohortId > 0) {
      await TheoryCohortEnrollment.destroy({
        where: { cohortId, studentUserId },
        transaction,
      });
    }
  }

  await row.update(
    {
      status: nextStatus,
      holdExpiresAt: null,
      holdExtensionCount: 0,
      cancellationRequestedAt: null,
      prepaidMeta: null,
      ...(cancellationReason != null && cancellationReason.length > 0 ? { cancellationReason } : {}),
      ...(recordAutoCancelledAt ? { autoCancelledAt: new Date() } : {}),
    },
    { transaction },
  );
  await BookingSlot.destroy({ where: { bookingId: row.id }, transaction });

  let refundIssued = false;
  if (nextStatus === 'refunded' && wasPaid && gross > 0) {
    const stu = await User.findByPk(studentUserId, { attributes: ['name', 'email'], transaction });
    if (!stu) {
      throw new InputValidationError('Student account not found for refund.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const lessonLabel =
      row.lessonType === 'theory'
        ? 'Group theory lesson'
        : row.lessonType === 'theory_personal'
          ? '1:1 theory lesson'
          : 'Practical lesson';
    refundIssued = await FinanceService.applyBookingCancellationRefundLedgerInTx({
      booking: row,
      customer: stu.name.trim() || 'Student',
      email: stu.email ?? '',
      grossAmd: gross,
      lessonDescriptionLine: lessonLabel,
      transaction,
    });
  }

  return { status: nextStatus, refundIssued };
}

/** When admin explicitly sets status to `refunded`, record a `booking_refund` finance row (same as cancellation refund). */
async function recordRefundLedgerWhenAdminMarksRefundedInTx(opts: {
  bookingId: number;
  prevStatusNorm: BookingStatus;
  nextStatusRaw: string | undefined;
  transaction: Transaction;
}): Promise<void> {
  if (opts.nextStatusRaw === undefined) return;
  const nextNorm = normalizeBookingStatus(String(opts.nextStatusRaw));
  if (nextNorm !== 'refunded') return;
  if (opts.prevStatusNorm === 'refunded' || opts.prevStatusNorm === 'cancelled') return;

  const row = await Booking.findByPk(opts.bookingId, {
    transaction: opts.transaction,
    lock: Transaction.LOCK.UPDATE,
  });
  if (!row) {
    throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
  }
  if (row.paidAt == null) {
    throw new InputValidationError('Cannot refund a booking that was not paid.', HttpStatusCodesUtil.BAD_REQUEST);
  }
  const gross = row.totalPriceAmd != null && Number.isFinite(Number(row.totalPriceAmd)) ? Number(row.totalPriceAmd) : 0;
  if (gross <= 0) {
    throw new InputValidationError(
      'Cannot mark booking as refunded without a positive lesson price.',
      HttpStatusCodesUtil.BAD_REQUEST,
    );
  }
  const stu = await User.findByPk(row.studentUserId, {
    attributes: ['name', 'email'],
    transaction: opts.transaction,
  });
  if (!stu) {
    throw new InputValidationError('Student account not found for refund.', HttpStatusCodesUtil.BAD_REQUEST);
  }
  const lessonLabel =
    row.lessonType === 'theory'
      ? 'Group theory lesson'
      : row.lessonType === 'theory_personal'
        ? '1:1 theory lesson'
        : 'Practical lesson';
  await FinanceService.applyBookingCancellationRefundLedgerInTx({
    booking: row,
    customer: stu.name.trim() || 'Student',
    email: stu.email ?? '',
    grossAmd: gross,
    lessonDescriptionLine: lessonLabel,
    transaction: opts.transaction,
  });
}

export default class BookingService {
  /** Blocks creating another booking while the student already has one awaiting payment. */
  private static async assertStudentHasNoPendingBooking(studentUserId: number): Promise<void> {
    const existing = await Booking.findOne({
      where: {
        studentUserId,
        status: { [Op.in]: [...PENDING_BOOKING_DB_STATUSES] },
      },
      attributes: ['id'],
    });
    if (existing) {
      throw new InputValidationError(
        'You already have a pending booking. Complete payment or cancel it before booking again.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
  }

  private static maybeEmitBookingConfirmedAfterAdminPatch(
    bookingId: number,
    prevStatusNorm: ReturnType<typeof normalizeBookingStatus>,
    patchStatus: string | undefined,
  ): void {
    const nextNorm =
      patchStatus !== undefined ? normalizeBookingStatus(String(patchStatus)) : prevStatusNorm;
    if (nextNorm === 'confirmed' && prevStatusNorm !== 'confirmed') {
      void BookingNotificationService.onBookingConfirmed(bookingId).catch(() => {});
    }
  }

  /** When staff sets booking to `cancelled` or `refunded` from the admin panel. */
  private static maybeEmitBookingClosedAfterAdminPatch(
    bookingId: number,
    prevStatusNorm: ReturnType<typeof normalizeBookingStatus>,
    patchStatus: string | undefined,
  ): void {
    if (patchStatus === undefined) return;
    const nextNorm = normalizeBookingStatus(String(patchStatus));
    const wasClosed = prevStatusNorm === 'cancelled' || prevStatusNorm === 'refunded';
    const isClosed = nextNorm === 'cancelled' || nextNorm === 'refunded';
    if (isClosed && !wasClosed) {
      void BookingNotificationService.onBookingClosed(
        bookingId,
        nextNorm === 'refunded' ? 'refunded' : 'cancelled',
      ).catch(() => {});
    }
  }

  private static async createPendingStudentPaidBooking(input: {
    studentUserId: number;
    instructorUserId: number;
    branchId: number;
    lessonType: 'theory' | 'theory_personal';
    dateIso: string;
    sortedSlots: string[];
    totalPriceAmd: number;
    prepaidMeta?: Record<string, unknown> | null;
    createSlotRows?: boolean;
  }): Promise<StudentPaidBookingCreateDto> {
    await BookingService.assertStudentHasNoPendingBooking(input.studentUserId);
    const dateIso = input.dateIso.slice(0, 10);
    const holdExp = new Date(Date.now() + PAYMENT_HOLD_MS);
    const exclusiveEnd = exclusiveEndFromSortedStarts(input.sortedSlots);
    let createdId = 0;
    try {
      await sequelize.transaction(async (transaction) => {
        const created = await Booking.create(
          {
            studentUserId: input.studentUserId,
            instructorUserId: input.instructorUserId,
            branchId: input.branchId,
            dateIso,
            time: input.sortedSlots[0],
            endTime: exclusiveEnd,
            totalPriceAmd: input.totalPriceAmd,
            lessonType: input.lessonType,
            status: 'pending',
            paidAt: null,
            holdExpiresAt: holdExp,
            holdExtensionCount: 0,
            prepaidMeta: input.prepaidMeta ?? null,
            paymentStatus: 'unpaid',
            paymentRequiredAt: null,
          },
          { transaction },
        );
        createdId = created.id;
        if (input.createSlotRows !== false) {
          await BookingSlot.bulkCreate(
            input.sortedSlots.map((slotTime) => ({
              bookingId: created.id,
              instructorUserId: input.instructorUserId,
              dateIso,
              slotTime,
            })),
            { transaction },
          );
        }
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }
    return {
      id: createdId,
      totalPriceAmd: input.totalPriceAmd,
      status: 'pending',
      holdExpiresAt: holdExp.toISOString(),
      holdExtensionCount: 0,
      maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
      paymentRequiredNow: true,
    };
  }

  private static mapRowToAdminDto(b: BookingWithUsers): BookingAdminDto {
    const row = b as BookingWithUsers;
    const inst = row.instructor;
    const stu = row.student;
    return {
      id: b.id,
      studentId: stu.id,
      instructorName: inst?.name ?? '',
      dateIso: dateIsoString(b.dateIso),
      time: b.time,
      endTime: b.endTime ?? null,
      totalPriceAmd: b.totalPriceAmd ?? null,
      type: b.lessonType,
      status: normalizeBookingStatus(b.status),
      branchId: b.branchId,
      cancellationRequestedAt: b.cancellationRequestedAt ? new Date(b.cancellationRequestedAt).toISOString() : null,
      lessonPassedSuccessfully: lessonPassedSuccessfullyFromRow(b),
      paymentStatus: b.paymentStatus ?? null,
      paymentRequiredAt: b.paymentRequiredAt ? String(b.paymentRequiredAt).slice(0, 10) : null,
      cancellationReason: b.cancellationReason ?? null,
    };
  }

  static async listAdmin(): Promise<BookingAdminDto[]> {
    const rows = await Booking.findAll({
      include: [
        { model: User, as: 'instructor', required: false, attributes: ['name'] },
        { model: User, as: 'student', required: true, attributes: ['id'] },
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });
    const bookingIds = rows.map((r) => r.id);
    const slotByBooking = new Map<number, { dateIso: string; time: string }[]>();
    if (bookingIds.length > 0) {
      const slotRows = await BookingSlot.findAll({
        where: { bookingId: { [Op.in]: bookingIds } },
        order: [
          ['dateIso', 'ASC'],
          ['slotTime', 'ASC'],
        ],
      });
      for (const s of slotRows) {
        const bid = s.bookingId;
        const list = slotByBooking.get(bid) ?? [];
        list.push({ dateIso: dateIsoString(s.dateIso), time: s.slotTime });
        slotByBooking.set(bid, list);
      }
    }
    return rows.map((b) => {
      const dto = BookingService.mapRowToAdminDto(b as BookingWithUsers);
      const se = slotByBooking.get(b.id);
      if (se && se.length > 0) {
        (dto as BookingAdminDto).slotEntries = se;
      }
      return dto;
    });
  }

  static async setLessonPassedSuccessfully(
    bookingId: number,
    value: boolean | null,
    actor: { kind: 'staff' } | { kind: 'instructor'; instructorUserId: number },
  ): Promise<BookingAdminDto | InstructorBookingDto | null> {
    const row = await Booking.findByPk(bookingId, {
      include: [
        { model: User, as: 'instructor', required: false, attributes: ['name'] },
        { model: User, as: 'student', required: true, attributes: ['id', 'name'] },
      ],
    });
    if (!row) return null;

    if (actor.kind === 'instructor') {
      if (row.instructorUserId == null) {
        throw new PermissionError('This booking has no instructor assigned.', HttpStatusCodesUtil.FORBIDDEN);
      }
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
        { model: User, as: 'instructor', required: false, attributes: ['name'] },
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
      include: [{ model: User, as: 'instructor', required: false, attributes: ['name'] }],
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
        b.paidAt != null &&
        (st === 'pending' || st === 'confirmed') &&
        dIso >= today &&
        !pendingCancel &&
        isRefundWindowForCancellation(dIso, b.time);
      const paymentReqRaw = b.paymentRequiredAt != null ? String(b.paymentRequiredAt).slice(0, 10) : null;
      const paymentRequiredNow =
        b.paidAt == null &&
        (st === 'pending' || st === 'pending_payment') &&
        isImmediatePaymentRequired(dIso, today);
      const ps = b.paymentStatus as StudentBookingDto['paymentStatus'];
      return {
        id: b.id,
        dateIso: dateIsoString(b.dateIso),
        time: b.time,
        endTime: b.endTime ?? null,
        totalPriceAmd: b.totalPriceAmd ?? null,
        instructorUserId: b.instructorUserId ?? null,
        instructor: inst?.name ?? '',
        lessonTypeKey:
          b.lessonType === 'theory'
            ? 'lessonTypeTheory'
            : b.lessonType === 'theory_personal'
              ? 'lessonTypeTheoryPersonal'
              : 'lessonTypePractical',
        status: st,
        holdExpiresAt: b.holdExpiresAt ? new Date(b.holdExpiresAt).toISOString() : null,
        holdExtensionCount: Number(b.holdExtensionCount ?? 0),
        maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
        cancelRefundEligible: eligible,
        hoursUntilLesson: Math.round(hoursLeft * 10) / 10,
        cancellationRequestedAt: b.cancellationRequestedAt ? new Date(b.cancellationRequestedAt).toISOString() : null,
        paymentStatus: ps ?? undefined,
        paymentRequiredAt: paymentReqRaw,
        paymentRequiredNow,
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

    await BookingService.assertStudentHasNoPendingBooking(input.studentUserId);

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

    try {
      const { row, coveredByPrepaidCredits, paymentRequiredNow, holdExpiresAt } = await sequelize.transaction(
        async (transaction) => {
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

          const creditAvailable = await StudentPracticalCreditsService.availableSlotCount(
            input.studentUserId,
            transaction,
          );
          if (creditAvailable >= sorted.length) {
            const meta = await StudentPracticalCreditsService.consumeSlots(
              input.studentUserId,
              sorted.length,
              transaction,
            );
            const paidAt = new Date();
            const booking = await Booking.create(
              {
                studentUserId: input.studentUserId,
                instructorUserId: input.instructorUserId,
                branchId: input.branchId,
                dateIso,
                time: sorted[0],
                endTime: exclusiveEnd,
                totalPriceAmd: 0,
                lessonType: 'practical',
                status: 'confirmed',
                paidAt,
                holdExpiresAt: null,
                holdExtensionCount: 0,
                prepaidMeta: meta as unknown as Record<string, unknown>,
                paymentStatus: 'paid',
                paymentRequiredAt: null,
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

            return {
              row: booking,
              coveredByPrepaidCredits: true,
              paymentRequiredNow: false,
              holdExpiresAt: null as Date | null,
            };
          }

          const paymentRequiredNow = isImmediatePaymentRequired(dateIso, today);
          if (paymentRequiredNow && input.payNow === false) {
            throw new InputValidationError(
              'Payment is required for this lesson date; you cannot defer payment.',
              HttpStatusCodesUtil.BAD_REQUEST,
            );
          }

          const startPaymentHold = paymentRequiredNow || input.payNow === true;
          const holdExp = startPaymentHold ? new Date(Date.now() + PAYMENT_HOLD_MS) : null;
          const reserveUnpaid = !startPaymentHold;
          const paymentReqCal = getPaymentRequiredCalendarIso(dateIso);

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
              status: reserveUnpaid ? 'pending_payment' : 'pending',
              paidAt: null,
              holdExpiresAt: holdExp,
              holdExtensionCount: 0,
              prepaidMeta: null,
              paymentStatus: 'unpaid',
              paymentRequiredAt: reserveUnpaid ? paymentReqCal : null,
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

          return {
            row: booking,
            coveredByPrepaidCredits: false,
            paymentRequiredNow,
            holdExpiresAt: holdExp,
          };
        },
      );

      if (normalizeBookingStatus(String(row.status)) === 'confirmed') {
        void BookingNotificationService.onBookingConfirmed(row.id).catch(() => {});
      }

      return {
        id: row.id,
        instructorUserId: input.instructorUserId,
        dateIso,
        slots: sorted,
        startTime: sorted[0],
        endTimeExclusive: exclusiveEnd,
        totalPriceAmd: coveredByPrepaidCredits ? 0 : totalPriceAmd,
        hourlyRateAmd: hourly,
        status: coveredByPrepaidCredits ? 'confirmed' : normalizeBookingStatus(String(row.status)),
        branchId: input.branchId,
        holdExpiresAt: holdExpiresAt ? holdExpiresAt.toISOString() : null,
        holdExtensionCount: 0,
        maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
        paymentRequiredNow,
        coveredByPrepaidCredits,
        paymentRequiredAt: row.paymentRequiredAt ? String(row.paymentRequiredAt).slice(0, 10) : null,
      };
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }
  }

  static async createTheoryPersonalFromStudentSlotSelection(input: {
    studentUserId: number;
    instructorUserId: number;
    dateIso: string;
    slots: readonly string[];
    branchId: number;
  }): Promise<StudentPaidBookingCreateDto> {
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
    assertInstructorTeachesLessonType(profile, 'theory_personal');
    const hourly = Number(profile.hourlyPrice);
    if (!Number.isFinite(hourly) || hourly < 0) {
      throw new InputValidationError('Instructor hourly rate is not configured.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const totalPriceAmd = Math.round(hourly * sorted.length);
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
    return BookingService.createPendingStudentPaidBooking({
      studentUserId: input.studentUserId,
      instructorUserId: input.instructorUserId,
      branchId: input.branchId,
      lessonType: 'theory_personal',
      dateIso,
      sortedSlots: sorted,
      totalPriceAmd,
      prepaidMeta: null,
    });
  }

  static async createTheoryGroupFromStudentSelection(input: {
    studentUserId: number;
    cohortId: number;
  }): Promise<StudentPaidBookingCreateDto> {
    const student = await User.findOne({
      where: { id: input.studentUserId, accountType: 'student' },
      attributes: ['id'],
    });
    if (!student) {
      throw new InputValidationError('Student account required.', HttpStatusCodesUtil.FORBIDDEN);
    }
    const cohort = await TheoryCohort.findByPk(input.cohortId);
    if (!cohort) {
      throw new InputValidationError('Theory cohort not found.', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (!theoryCohortAllowsNewBookings(cohort.status)) {
      throw new InputValidationError('This theory group is not open for new bookings.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const currentEnrollmentCount = await TheoryCohortService.listEnrollments(cohort.id);
    if (currentEnrollmentCount && currentEnrollmentCount.length >= cohort.seats) {
      throw new ConflictError('Cohort is full', HttpStatusCodesUtil.CONFLICT);
    }
    const existingGroupBookings = await Booking.findAll({
      where: {
        studentUserId: input.studentUserId,
        lessonType: 'theory',
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
      attributes: ['prepaidMeta'],
    });
    const duplicate = existingGroupBookings.some((row) => {
      const meta = row.prepaidMeta as Record<string, unknown> | null;
      return Number(meta?.theoryCohortId) === cohort.id;
    });
    if (duplicate) {
      throw new ConflictError('Student already has an active booking for this theory group.', HttpStatusCodesUtil.CONFLICT);
    }
    const links = await InstructorBranch.findAll({ where: { branchId: cohort.branchId } });
    const instructorIdsServingBranch = links.map((l) => l.instructorUserId);
    const instructor = await User.findOne({
      where: {
        name: cohort.instructorName.trim(),
        accountType: 'instructor',
        ...(instructorIdsServingBranch.length > 0 ? { id: { [Op.in]: instructorIdsServingBranch } } : {}),
      },
    });
    if (!instructor) {
      throw new InputValidationError(
        `No instructor user matches cohort instructor "${cohort.instructorName}".`,
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const profile = await InstructorProfile.findOne({ where: { userId: instructor.id } });
    assertInstructorTeachesLessonType(profile, 'theory');
    const sessionStart = normalizeTimeHHMM(String(cohort.sessionStartTime ?? '').trim() || '09:00') ?? '09:00';
    const startMins = parseTimeToMinutes(sessionStart);
    const endCandidate = normalizeTimeHHMM(String(cohort.sessionEndTime ?? '').trim());
    const endMins = endCandidate ? parseTimeToMinutes(endCandidate) : startMins + 60;
    const durationHours = Math.max(1, Math.ceil((endMins - startMins) / 60));
    const slots = Array.from({ length: durationHours }, (_, i) => minutesToHHMM(startMins + i * 60));
    const hourly = Number(profile.hourlyPrice);
    const totalPriceAmd = totalPriceAmdForTheoryCohortBooking(cohort, hourly, slots.length);
    return BookingService.createPendingStudentPaidBooking({
      studentUserId: input.studentUserId,
      instructorUserId: instructor.id,
      branchId: cohort.branchId,
      lessonType: 'theory',
      dateIso: dateIsoString(cohort.startDateIso),
      sortedSlots: slots,
      totalPriceAmd,
      prepaidMeta: { theoryCohortId: cohort.id },
      createSlotRows: false,
    });
  }

  /** Admin practical / personal theory: any set of on-the-hour slots across multiple calendar days. */
  private static async createAdminWithArbitrarySlotEntries(input: {
    studentId: number;
    instructorName: string;
    instructorUserId?: number;
    entries: AdminSlotEntry[];
    lessonType: 'practical' | 'theory_personal';
    status: string;
    branchId: number;
  }): Promise<BookingAdminDto | null> {
    const entries = input.entries;
    const instructor =
      input.instructorUserId != null && Number.isFinite(input.instructorUserId)
        ? await User.findOne({ where: { id: input.instructorUserId, accountType: 'instructor' } })
        : await User.findOne({
            where: { name: input.instructorName.trim(), accountType: 'instructor' },
          });
    if (!instructor) return null;
    const instructorUserId = instructor.id;
    const branchOk = await InstructorBranch.findOne({
      where: { instructorUserId, branchId: input.branchId },
    });
    if (!branchOk) {
      throw new InputValidationError('Instructor does not serve this branch.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const profile = await InstructorProfile.findOne({ where: { userId: instructorUserId } });
    assertInstructorTeachesLessonType(profile, input.lessonType);
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd = Number.isFinite(hourly) ? hourly * entries.length : 0;

    for (const e of entries) {
      const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
        instructorUserId,
        e.dateIso,
        e.time,
      );
      if (unavailable) {
        throw new InputValidationError(
          'Instructor is not available at this time (day off, break, or outside work hours).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const first = entries[0];
    const endTime = endTimeExclusiveForSlotEntries(entries);

    let newId = 0;
    try {
      await sequelize.transaction(async (transaction) => {
        const created = await Booking.create(
          {
            studentUserId: input.studentId,
            instructorUserId,
            branchId: input.branchId,
            dateIso: first.dateIso,
            time: first.time,
            endTime,
            totalPriceAmd,
            lessonType: input.lessonType,
            status: input.status,
            paidAt: null,
            holdExpiresAt: null,
          },
          { transaction },
        );
        newId = created.id;
        await replaceBookingSlotRowsFromEntries(newId, instructorUserId, entries, transaction);
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    if (normalizeBookingStatus(String(input.status)) === 'confirmed') {
      void BookingNotificationService.onBookingConfirmed(newId).catch(() => {});
    }

    const rows = await this.listAdmin();
    return rows.find((x) => x.id === newId) ?? null;
  }

  static async createAdmin(input: {
    studentId: number;
    instructorName: string;
    instructorUserId?: number;
    dateIso: string;
    time: string;
    type: 'practical' | 'theory' | 'theory_personal';
    status: string;
    branchId: number;
    slots?: readonly string[];
    theoryCohortId?: number;
    slotEntries?: readonly { dateIso: string; time: string }[];
  }): Promise<BookingAdminDto | null> {
    const entriesNorm = normalizeAdminSlotEntries(input.slotEntries ?? []);
    if (entriesNorm.length > 0 && (input.type === 'practical' || input.type === 'theory_personal')) {
      if (entriesNorm.length > MAX_ADMIN_SLOT_ENTRIES) {
        throw new InputValidationError(
          `At most ${MAX_ADMIN_SLOT_ENTRIES} slot(s) allowed per booking.`,
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      return BookingService.createAdminWithArbitrarySlotEntries({
        studentId: input.studentId,
        instructorName: input.instructorName,
        instructorUserId: input.instructorUserId,
        entries: entriesNorm,
        lessonType: input.type,
        status: input.status,
        branchId: input.branchId,
      });
    }

    const dateIso = input.dateIso.slice(0, 10);
    const slotList = input.slots?.filter((s) => typeof s === 'string' && s.trim().length > 0) ?? [];
    const useMulti =
      slotList.length > 0 &&
      (input.type === 'practical' || input.type === 'theory' || input.type === 'theory_personal');

    if (useMulti) {
      const lessonType: 'practical' | 'theory' | 'theory_personal' =
        input.type === 'theory' ? 'theory' : input.type === 'theory_personal' ? 'theory_personal' : 'practical';
      return BookingService.createAdminWithConsecutiveSlots({
        studentId: input.studentId,
        dateIso,
        slots: slotList,
        lessonType,
        status: input.status,
        branchId: input.branchId,
        instructorName: input.instructorName,
        instructorUserId: input.instructorUserId,
        theoryCohortId: input.theoryCohortId,
      });
    }

    const instructor =
      input.instructorUserId != null && Number.isFinite(input.instructorUserId)
        ? await User.findOne({ where: { id: input.instructorUserId, accountType: 'instructor' } })
        : await User.findOne({
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

    if (normalizeBookingStatus(String(input.status)) === 'confirmed') {
      void BookingNotificationService.onBookingConfirmed(newId).catch(() => {});
    }

    const rows = await this.listAdmin();
    return rows.find((x) => x.id === newId) ?? null;
  }

  /** Admin: one booking spanning consecutive hourly slots (practical, theory group, or personal theory). */
  private static async createAdminWithConsecutiveSlots(input: {
    studentId: number;
    dateIso: string;
    slots: readonly string[];
    lessonType: 'practical' | 'theory' | 'theory_personal';
    status: string;
    branchId: number;
    instructorName: string;
    instructorUserId?: number;
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
    let theoryCohort: TheoryCohort | null = null;

    if (input.lessonType === 'theory') {
      if (input.theoryCohortId == null || !Number.isFinite(input.theoryCohortId)) {
        throw new InputValidationError('theoryCohortId is required for theory group bookings.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const cohort = await TheoryCohort.findByPk(input.theoryCohortId);
      if (!cohort) {
        throw new InputValidationError('Theory cohort not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      theoryCohort = cohort;
      if (!theoryCohortAllowsNewBookings(cohort.status)) {
        throw new InputValidationError(
          'This theory group is not open for new bookings (wrong status).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      branchId = cohort.branchId;
      const links = await InstructorBranch.findAll({ where: { branchId: cohort.branchId } });
      const instructorIdsServingBranch = links.map((l) => l.instructorUserId);
      const instructor = await User.findOne({
        where: {
          name: cohort.instructorName.trim(),
          accountType: 'instructor',
          ...(instructorIdsServingBranch.length > 0 ? { id: { [Op.in]: instructorIdsServingBranch } } : {}),
        },
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
      const instructor =
        input.instructorUserId != null && Number.isFinite(input.instructorUserId)
          ? await User.findOne({ where: { id: input.instructorUserId, accountType: 'instructor' } })
          : await User.findOne({
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
    const totalPriceAmd =
      input.lessonType === 'theory' && theoryCohort
        ? totalPriceAmdForTheoryCohortBooking(theoryCohort, hourly, sorted.length)
        : Number.isFinite(hourly)
          ? hourly * sorted.length
          : 0;
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

    if (normalizeBookingStatus(String(input.status)) === 'confirmed') {
      void BookingNotificationService.onBookingConfirmed(newId).catch(() => {});
    }

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
    lessonType: 'practical' | 'theory' | 'theory_personal';
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
    let theoryCohortForPrice: TheoryCohort | null = null;

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
      theoryCohortForPrice = cohort;
      if (!theoryCohortAllowsNewBookings(cohort.status)) {
        throw new InputValidationError(
          'This theory group is not open for bookings (wrong status).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      branchId = cohort.branchId;
      const links = await InstructorBranch.findAll({ where: { branchId: cohort.branchId } });
      const instructorIdsServingBranch = links.map((l) => l.instructorUserId);
      const instructor = await User.findOne({
        where: {
          name: cohort.instructorName.trim(),
          accountType: 'instructor',
          ...(instructorIdsServingBranch.length > 0 ? { id: { [Op.in]: instructorIdsServingBranch } } : {}),
        },
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
        if (row.instructorUserId != null) {
          const prev = await User.findByPk(row.instructorUserId, { attributes: ['name'] });
          instructorName = prev?.name?.trim() ?? '';
        } else {
          instructorName = '';
        }
      }
      if (!instructorName) {
        throw new InputValidationError(
          'instructorName is required for practical or personal theory bookings.',
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
    const totalPriceAmd =
      lessonType === 'theory' && theoryCohortForPrice
        ? totalPriceAmdForTheoryCohortBooking(theoryCohortForPrice, hourly, sorted.length)
        : Number.isFinite(hourly)
          ? hourly * sorted.length
          : row.totalPriceAmd ?? null;

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
    const prevBookingStatusNorm = normalizeBookingStatus(String(row.status));

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
        await recordRefundLedgerWhenAdminMarksRefundedInTx({
          bookingId: id,
          prevStatusNorm: prevBookingStatusNorm,
          nextStatusRaw: patch.status,
          transaction,
        });
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    BookingService.maybeEmitBookingConfirmedAfterAdminPatch(id, prevBookingStatusNorm, patch.status);
    BookingService.maybeEmitBookingClosedAfterAdminPatch(id, prevBookingStatusNorm, patch.status);

    return (await this.listAdmin()).find((x) => x.id === id) ?? null;
  }

  private static async updateAdminWithArbitrarySlotEntriesForExisting(opts: {
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
    }>;
    lessonType: 'practical' | 'theory_personal';
    entries: AdminSlotEntry[];
  }): Promise<BookingAdminDto | null> {
    const { id, row, patch, lessonType, entries } = opts;
    const nextStudentId = patch.studentId !== undefined ? patch.studentId : row.studentUserId;

    let instructorUserId: number;
    if (patch.instructorName !== undefined) {
      const instructor = await User.findOne({
        where: { name: patch.instructorName.trim(), accountType: 'instructor' },
      });
      if (!instructor) return null;
      instructorUserId = instructor.id;
    } else if (row.instructorUserId != null) {
      instructorUserId = row.instructorUserId;
    } else {
      throw new InputValidationError(
        'instructorName is required — this booking has no instructor (for example after instructor removal).',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const branchId = patch.branchId !== undefined ? patch.branchId : row.branchId;
    const branchOk = await InstructorBranch.findOne({ where: { instructorUserId, branchId } });
    if (!branchOk) {
      throw new InputValidationError('Instructor does not serve this branch.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const profile = await InstructorProfile.findOne({ where: { userId: instructorUserId } });
    assertInstructorTeachesLessonType(profile, lessonType);
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd = Number.isFinite(hourly) ? hourly * entries.length : row.totalPriceAmd ?? null;

    for (const e of entries) {
      const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
        instructorUserId,
        e.dateIso,
        e.time,
      );
      if (unavailable) {
        throw new InputValidationError(
          'Instructor is not available at this time (day off, break, or outside work hours).',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }

    const first = entries[0];
    const endTime = endTimeExclusiveForSlotEntries(entries);
    const mergedStatusBeforeTx = patch.status !== undefined ? patch.status : row.status;
    const prevBookingStatusNorm = normalizeBookingStatus(String(row.status));

    try {
      await sequelize.transaction(async (transaction) => {
        await row.update(
          {
            ...(patch.studentId !== undefined ? { studentUserId: nextStudentId } : {}),
            instructorUserId,
            dateIso: first.dateIso,
            time: first.time,
            endTime,
            totalPriceAmd,
            ...(patch.type !== undefined ? { lessonType: patch.type } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            branchId,
          },
          { transaction },
        );
        await replaceBookingSlotRowsFromEntries(id, instructorUserId, entries, transaction);
        if (!rawBookingStatusReservesSlot(mergedStatusBeforeTx)) {
          await BookingSlot.destroy({ where: { bookingId: id }, transaction });
        }
        await recordRefundLedgerWhenAdminMarksRefundedInTx({
          bookingId: id,
          prevStatusNorm: prevBookingStatusNorm,
          nextStatusRaw: patch.status,
          transaction,
        });
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    BookingService.maybeEmitBookingConfirmedAfterAdminPatch(id, prevBookingStatusNorm, patch.status);
    BookingService.maybeEmitBookingClosedAfterAdminPatch(id, prevBookingStatusNorm, patch.status);

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
      slotEntries?: readonly { dateIso: string; time: string }[];
    }>,
  ): Promise<BookingAdminDto | null> {
    const row = await Booking.findByPk(id);
    if (!row) return null;

    const effectiveType = patch.type ?? row.lessonType;
    const slotEntriesNorm = normalizeAdminSlotEntries(patch.slotEntries ?? []);
    if (
      slotEntriesNorm.length > 0 &&
      (effectiveType === 'practical' || effectiveType === 'theory_personal')
    ) {
      if (slotEntriesNorm.length > MAX_ADMIN_SLOT_ENTRIES) {
        throw new InputValidationError(
          `At most ${MAX_ADMIN_SLOT_ENTRIES} slot(s) allowed per booking.`,
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      return BookingService.updateAdminWithArbitrarySlotEntriesForExisting({
        id,
        row,
        patch,
        lessonType: effectiveType as 'practical' | 'theory_personal',
        entries: slotEntriesNorm,
      });
    }

    const slotList = patch.slots?.filter((s) => typeof s === 'string' && s.trim().length > 0) ?? [];
    const useMulti =
      slotList.length > 0 &&
      (effectiveType === 'practical' || effectiveType === 'theory' || effectiveType === 'theory_personal');
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

    const touchesSchedule =
      patch.dateIso !== undefined || patch.time !== undefined || patch.instructorName !== undefined;

    if (touchesSchedule && instructorUserId == null) {
      throw new InputValidationError(
        'Set instructorName to change date, time, or assign an instructor to this booking.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const nextDateIso = patch.dateIso !== undefined ? patch.dateIso.slice(0, 10) : dateIsoString(row.dateIso);
    const nextTime = patch.time !== undefined ? patch.time : row.time;
    const sorted = normalizeAndSortSlots([nextTime]);
    const exclusiveEnd = exclusiveEndFromSortedStarts(sorted);

    if (touchesSchedule && instructorUserId != null) {
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
    }

    const profile =
      touchesSchedule && instructorUserId != null
        ? await InstructorProfile.findOne({ where: { userId: instructorUserId } })
        : null;
    const hourly = profile ? Number(profile.hourlyPrice) : 0;
    const totalPriceAmd =
      touchesSchedule && Number.isFinite(hourly) ? hourly * sorted.length : row.totalPriceAmd ?? null;

    const mergedStatusBeforeTx = patch.status !== undefined ? patch.status : row.status;
    const prevBookingStatusNorm = normalizeBookingStatus(String(row.status));

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

        if (touchesSchedule) {
          await replaceBookingSlotRows(row.id, instructorUserId!, nextDateIso, sorted, transaction);
        }
        if (!rawBookingStatusReservesSlot(mergedStatusBeforeTx)) {
          await BookingSlot.destroy({ where: { bookingId: row.id }, transaction });
        }
        await recordRefundLedgerWhenAdminMarksRefundedInTx({
          bookingId: row.id,
          prevStatusNorm: prevBookingStatusNorm,
          nextStatusRaw: patch.status,
          transaction,
        });
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    BookingService.maybeEmitBookingConfirmedAfterAdminPatch(id, prevBookingStatusNorm, patch.status);
    BookingService.maybeEmitBookingClosedAfterAdminPatch(id, prevBookingStatusNorm, patch.status);

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
      if ((st !== 'pending' && st !== 'pending_payment') || row.paidAt != null) {
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
      if ((st !== 'pending' && st !== 'pending_payment') || row.paidAt != null) {
        throw new InputValidationError('This booking is not awaiting payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const today = todayIsoUtc();
      const dateIso = dateIsoString(row.dateIso);
      const inHorizon = isImmediatePaymentRequired(dateIso, today);
      if (inHorizon && st !== 'pending_payment') {
        throw new InputValidationError(
          'This lesson date uses the standard payment flow at booking time.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      if (inHorizon && st === 'pending_payment') {
        const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MS);
        await row.update({ holdExpiresAt: holdUntil, holdExtensionCount: 0 }, { transaction });
        return {
          holdExpiresAt: holdUntil.toISOString(),
          holdExtensionCount: 0,
          maxHoldExtensions: MAX_PAYMENT_HOLD_EXTENSIONS,
        };
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
        where: { id: bookingId, studentUserId, lessonType: { [Op.in]: ['practical', 'theory', 'theory_personal'] } },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if ((st !== 'pending' && st !== 'pending_payment') || row.paidAt != null) {
        throw new InputValidationError('This booking is not awaiting payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (row.holdExpiresAt == null || new Date(row.holdExpiresAt).getTime() <= Date.now()) {
        throw new InputValidationError(
          'Payment window is not active or has expired. Start payment again if your booking is still reserved.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      if (row.lessonType === 'theory') {
        const cohortId = Number((row.prepaidMeta as Record<string, unknown> | null)?.theoryCohortId);
        if (!Number.isFinite(cohortId) || cohortId <= 0) {
          throw new InputValidationError('Theory cohort reference is missing for this booking.', HttpStatusCodesUtil.BAD_REQUEST);
        }
        await TheoryCohortService.enroll(cohortId, studentUserId);
      }
      const paidAt = new Date();
      await row.update(
        {
          status: 'confirmed',
          paidAt,
          holdExpiresAt: null,
          holdExtensionCount: 0,
          paymentStatus: 'paid',
        },
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
          description: `${row.lessonType === 'theory' ? 'Group theory' : row.lessonType === 'theory_personal' ? '1:1 theory' : 'Practical lesson'} #${row.id} — vPOS`,
          branchId: row.branchId,
          channel: 'pos',
          method: 'card',
          grossAmd: gross,
          feeAmd: 0,
          status: 'completed',
          providerRef: `booking-vpos:${row.id}`,
          source: 'system',
          bookingId: row.id,
        });
      } catch {
        // Finance row is best-effort for local/dev; booking remains confirmed.
      }
    }

    void BookingNotificationService.onBookingConfirmed(updatedId).catch(() => {});

    return dto;
  }

  /**
   * Student: cancel a booking.
   * Paid + ≥24h before lesson → sets {@link Booking.cancellationRequestedAt}; staff completes refund/cancel.
   * Otherwise → immediate `cancelled`, no refund.
   */
  static async cancelPracticalStudentBooking(bookingId: number, studentUserId: number): Promise<StudentPracticalCancelOutcome> {
    let outcome: StudentPracticalCancelOutcome | undefined;
    await sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, studentUserId, lessonType: { [Op.in]: ['practical', 'theory', 'theory_personal'] } },
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
      if (st !== 'pending' && st !== 'pending_payment' && st !== 'confirmed') {
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

      if (row.paidAt != null && isRefundWindowForCancellation(dateIso, row.time)) {
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
    if (outcome.outcome === 'pending_admin') {
      void BookingNotificationService.notifyAdminStudentCancellationRefundRequest(bookingId).catch(() => {});
    } else {
      void BookingNotificationService.onBookingClosed(
        bookingId,
        outcome.refundIssued ? 'refunded' : 'cancelled',
      ).catch(() => {});
    }
    return outcome;
  }

  /** Staff: complete a student-initiated cancellation (free slots, refund ledger if the booking was paid). */
  static async staffApprovePracticalCancellation(bookingId: number): Promise<StaffApproveStudentCancellationResponse> {
    const t0 = Date.now();
    const step = (label: string) => {
      LoggerUtil.info(`[approve-student-cancellation] bookingId=${bookingId} step=${label} +${Date.now() - t0}ms`);
    };
    step('start');

    const result = await sequelize.transaction(async (transaction) => {
      step('tx_begin');
      const row = await Booking.findOne({
        where: { id: bookingId, lessonType: { [Op.in]: ['practical', 'theory', 'theory_personal'] } },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      step('after_load_booking');
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if (row.cancellationRequestedAt == null) {
        if (st === 'refunded' || st === 'cancelled') {
          step('idempotent_already_closed');
          return { kind: 'already_closed' as const, status: st };
        }
        throw new InputValidationError(
          `No pending student cancellation request for this booking (status: ${st}). ` +
            'This applies only after a student cancels a paid booking at least 24 hours before the lesson; otherwise the booking cancels immediately without staff approval.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      if (st !== 'pending' && st !== 'pending_payment' && st !== 'confirmed') {
        throw new InputValidationError('This booking cannot be resolved here.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const requestedAt = new Date(row.cancellationRequestedAt as Date);
      const dateIso = dateIsoString(row.dateIso);
      const refundAllowedByPolicy =
        row.paidAt != null && studentRefundEligibleAtRequestTime(requestedAt, dateIso, row.time);
      step('before_finalize');
      const fin = await finalizePracticalCancellationInTx({
        row,
        studentUserId: row.studentUserId,
        transaction,
        refundIfPaid: refundAllowedByPolicy,
      });
      step('after_finalize');
      return { kind: 'completed' as const, status: fin.status };
    });

    step('after_transaction_commit');

    if (result.kind === 'already_closed') {
      const st = result.status;
      return {
        success: true,
        message:
          st === 'refunded'
            ? 'This booking was already closed with a refund.'
            : 'This booking was already cancelled.',
        status: st === 'refunded' ? 'refunded' : 'cancelled',
      };
    }

    const finalStatus = result.status;

    setImmediate(() => {
      void BookingNotificationService.onBookingClosed(
        bookingId,
        finalStatus === 'refunded' ? 'refunded' : 'cancelled',
      ).catch(() => {});
    });

    const apiStatus: StaffApproveStudentCancellationResponse['status'] =
      finalStatus === 'refunded' ? 'refunded' : 'cancelled';
    const message =
      apiStatus === 'refunded' ? 'Cancellation approved and refunded' : 'Cancellation approved';

    step(`done status=${apiStatus}`);
    return { success: true, message, status: apiStatus };
  }

  /** Staff: decline a student cancellation request; booking stays active. */
  static async staffRejectPracticalCancellation(bookingId: number): Promise<{ ok: true }> {
    await sequelize.transaction(async (transaction) => {
      const row = await Booking.findOne({
        where: { id: bookingId, lessonType: { [Op.in]: ['practical', 'theory', 'theory_personal'] } },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (row.cancellationRequestedAt == null) {
        const st = normalizeBookingStatus(row.status);
        throw new InputValidationError(
          `No pending student cancellation request for this booking (status: ${st}). ` +
            'Reject only applies when a student has requested cancellation of a paid booking in the refund window.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      await row.update({ cancellationRequestedAt: null }, { transaction });
    });
    return { ok: true as const };
  }

  /**
   * Daily job: after the payment deadline day, cancel reserved-unpaid practical rows and free slots.
   * Idempotent and safe for concurrent cron runners (row lock + status guard).
   */
  static async autoCancelReservedUnpaidAfterPaymentDeadlineFromCron(bookingId: number): Promise<boolean> {
    let did = false;
    await sequelize.transaction(async (transaction) => {
      const row = await Booking.findByPk(bookingId, { transaction, lock: Transaction.LOCK.UPDATE });
      if (!row) return;
      if (row.paidAt != null) return;
      const st = normalizeBookingStatus(String(row.status));
      if (st !== 'pending_payment') return;
      if (!row.paymentRequiredAt) return;
      const today = todayIsoUtc();
      const pr = String(row.paymentRequiredAt).slice(0, 10);
      if (!shouldAutoCancelUnpaidAfterPaymentDeadline(today, pr, false)) return;
      await finalizePracticalCancellationInTx({
        row,
        studentUserId: row.studentUserId,
        transaction,
        refundIfPaid: false,
        cancellationReason: BOOKING_CANCELLATION_REASON.PAYMENT_NOT_COMPLETED_BEFORE_REQUIRED_DATE,
        recordAutoCancelledAt: true,
      });
      did = true;
    });
    if (did) {
      setImmediate(() => {
        void BookingNotificationService.onBookingAutoCancelledForMissedPayment(bookingId).catch(() => {});
      });
    }
    return did;
  }

  /**
   * Hard-delete a booking and any linked finance rows (`booking_id` FK is ON DELETE RESTRICT).
   */
  static async remove(id: number): Promise<boolean> {
    return sequelize.transaction(async (transaction) => {
      await FinanceTransaction.destroy({ where: { bookingId: id }, transaction });
      const n = await Booking.destroy({ where: { id }, transaction });
      return n > 0;
    });
  }
}
