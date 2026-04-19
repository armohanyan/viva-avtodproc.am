import { Op, UniqueConstraintError, literal, type Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Booking, BookingSlot, InstructorBranch, InstructorProfile, TheoryCohort, User } from '../models';
import TheoryCohortService from './theory-cohort.service';
import InstructorAvailabilityService from './instructor-availability.service';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';
import { addOneCalendarMonth, todayIsoUtc } from '../utils/calendar-month.util';

const { InputValidationError, ConflictError } = ErrorsUtil;

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
};

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
};

function dateIsoString(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
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

export default class BookingService {
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
    return rows.map((b) => {
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
      };
    });
  }

  /** For calendar: each occupied hour for this instructor in the date range. */
  static async listBusySlotsForInstructor(
    instructorUserId: number,
    fromIso: string,
    toIso: string,
  ): Promise<{ dateIso: string; time: string; studentUserId: number }[]> {
    const exists = await User.count({ where: { id: instructorUserId, accountType: 'instructor' } });
    if (!exists) return [];

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
          where: { status: { [Op.in]: [...SLOT_RESERVING_STATUSES] } },
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

    const legacyBookings = await Booking.findAll({
      where: {
        instructorUserId,
        dateIso: { [Op.between]: [fromIso.slice(0, 10), toIso.slice(0, 10)] },
        status: { [Op.in]: [...SLOT_RESERVING_STATUSES] },
        [Op.and]: literal(
          'NOT EXISTS (SELECT 1 FROM `booking_slots` AS `s` WHERE s.`booking_id` = `Booking`.`id`)',
        ),
      },
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
        status: normalizeStudentBookingStatus(b.status),
      };
    });
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
    return rows.map((b) => {
      const row = b as BookingWithStudent;
      const stu = row.student;
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
      };
    });
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
    const payHorizonEnd = addOneCalendarMonth(today);
    const inPayHorizon = dateIso <= payHorizonEnd;
    const holdExpiresAt =
      inPayHorizon ? new Date(Date.now() + PAYMENT_HOLD_MS) : null;

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
      };
    } catch (e) {
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

    const rows = await this.listAdmin();
    return rows.find((x) => x.id === newId) ?? null;
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
    }>,
  ): Promise<BookingAdminDto | null> {
    const row = await Booking.findByPk(id);
    if (!row) return null;
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
      });
    } catch (e) {
      if (isDuplicateSlotClaimError(e)) {
        throw new ConflictError(SLOT_NO_LONGER_AVAILABLE, HttpStatusCodesUtil.CONFLICT);
      }
      throw e;
    }

    return (await this.listAdmin()).find((x) => x.id === id) ?? null;
  }

  static async remove(id: number): Promise<boolean> {
    const n = await Booking.destroy({ where: { id } });
    return n > 0;
  }
}
