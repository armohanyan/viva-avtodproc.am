import { Op } from 'sequelize';
import { Booking, User } from '../models';
import InstructorAvailabilityService from './instructor-availability.service';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';

const { InputValidationError } = ErrorsUtil;

type BookingWithUsers = Booking & { instructor: User; student: User };
type BookingWithInstructor = Booking & { instructor: User };

export type BookingAdminDto = {
  id: string;
  studentId: string;
  instructorName: string;
  dateIso: string;
  time: string;
  type: 'practical' | 'theory';
  status: string;
  branchId: string;
};

export type StudentBookingDto = {
  id: string;
  dateIso: string;
  time: string;
  instructor: string;
  lessonTypeKey: 'lessonTypePractical' | 'lessonTypeTheory';
  status:
    | 'confirmed'
    | 'pending'
    | 'pending_prebook'
    | 'pending_payment'
    | 'cancelled'
    | 'completed'
    | 'refunded';
};

function dateIsoString(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

const STUDENT_BOOKING_STATUSES = new Set<string>([
  'confirmed',
  'pending',
  'pending_prebook',
  'pending_payment',
  'cancelled',
  'completed',
  'refunded',
]);

function normalizeStudentBookingStatus(raw: string): StudentBookingDto['status'] {
  if (STUDENT_BOOKING_STATUSES.has(raw)) {
    return raw as StudentBookingDto['status'];
  }
  return 'pending';
}

/** Bookings that occupy an instructor slot on the calendar (legacy `pending` included). */
const SLOT_RESERVING_STATUSES = [
  'confirmed',
  'pending',
  'pending_prebook',
  'pending_payment',
  'completed',
] as const;

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
        type: b.lessonType,
        status: b.status,
        branchId: b.branchId,
      };
    });
  }

  /** For calendar: slots held by another booking for this instructor in the date range. */
  static async listBusySlotsForInstructor(
    instructorUserId: string,
    fromIso: string,
    toIso: string,
  ): Promise<{ dateIso: string; time: string; studentUserId: string }[]> {
    const exists = await User.count({ where: { id: instructorUserId, accountType: 'instructor' } });
    if (!exists) return [];
    const rows = await Booking.findAll({
      where: {
        instructorUserId,
        dateIso: { [Op.between]: [fromIso, toIso] },
        status: { [Op.in]: [...SLOT_RESERVING_STATUSES] },
      },
      attributes: ['dateIso', 'time', 'studentUserId'],
      order: [
        ['dateIso', 'ASC'],
        ['time', 'ASC'],
      ],
    });
    return rows.map((b) => ({
      dateIso: dateIsoString(b.dateIso),
      time: b.time,
      studentUserId: b.studentUserId,
    }));
  }

  static async listForStudent(studentUserId: string): Promise<StudentBookingDto[]> {
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
        instructor: inst.name,
        lessonTypeKey: b.lessonType === 'theory' ? 'lessonTypeTheory' : 'lessonTypePractical',
        status: normalizeStudentBookingStatus(b.status),
      };
    });
  }

  static async createAdmin(input: {
    id?: string;
    studentId: string;
    instructorName: string;
    dateIso: string;
    time: string;
    type: 'practical' | 'theory';
    status: string;
    branchId: string;
  }): Promise<BookingAdminDto | null> {
    const instructor = await User.findOne({
      where: { name: input.instructorName, accountType: 'instructor' },
    });
    if (!instructor) return null;
    const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
      instructor.id,
      input.dateIso.slice(0, 10),
      input.time,
    );
    if (unavailable) {
      throw new InputValidationError(
        'Instructor is not available at this time (day off, break, or outside work hours).',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const id = input.id?.trim() || `BK-${String((await Booking.count()) + 1).padStart(3, '0')}`;
    await Booking.create({
      id,
      studentUserId: input.studentId,
      instructorUserId: instructor.id,
      branchId: input.branchId,
      dateIso: input.dateIso,
      time: input.time,
      lessonType: input.type,
      status: input.status,
    });
    return (await this.listAdmin()).find((x) => x.id === id) ?? null;
  }

  static async updateAdmin(
    id: string,
    patch: Partial<{
      studentId: string;
      instructorName: string;
      dateIso: string;
      time: string;
      type: 'practical' | 'theory';
      status: string;
      branchId: string;
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
    const unavailable = await InstructorAvailabilityService.isSlotUnavailableForInstructor(
      instructorUserId,
      nextDateIso,
      nextTime,
    );
    if (unavailable) {
      throw new InputValidationError(
        'Instructor is not available at this time (day off, break, or outside work hours).',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    await row.update({
      ...(patch.studentId !== undefined ? { studentUserId: patch.studentId } : {}),
      ...(patch.instructorName !== undefined ? { instructorUserId } : {}),
      ...(patch.dateIso !== undefined ? { dateIso: patch.dateIso } : {}),
      ...(patch.time !== undefined ? { time: patch.time } : {}),
      ...(patch.type !== undefined ? { lessonType: patch.type } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
    });
    return (await this.listAdmin()).find((x) => x.id === id) ?? null;
  }

  static async remove(id: string): Promise<boolean> {
    const n = await Booking.destroy({ where: { id } });
    return n > 0;
  }
}
