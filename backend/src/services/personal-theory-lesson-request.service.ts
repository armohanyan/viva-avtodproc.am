import { Op } from 'sequelize';
import { sequelize } from '../database/sequelize';
import {
  PersonalTheoryLessonRequest,
  type PersonalTheoryLessonRequestStatus,
} from '../models/personal-theory-lesson-request.model';
import { InstructorBranch } from '../models/instructor-branch.model';
import { InstructorProfile } from '../models/instructor-profile.model';
import { User } from '../models/user.model';
import { Booking } from '../models/booking.model';
import { Notification } from '../models/notification.model';
import BookingNotificationService from './booking-notification.service';
import BookingService from './booking.service';
import NotificationService from './notification.service';
import { branchIdWhere } from '../helpers';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ConflictError } = ErrorsUtil;

export type PersonalTheoryLessonRequestDto = {
  id: number;
  studentUserId: number;
  studentName: string;
  studentPhone: string | null;
  studentPhone2: string | null;
  studentEmail: string;
  instructorUserId: number;
  instructorName: string;
  branchId: number;
  note: string | null;
  selectedThemes: string[];
  status: PersonalTheoryLessonRequestStatus;
  bookedLessonId: number | null;
  handledByAdminId: number | null;
  contactedAt: string | null;
  cancelledAt: string | null;
  bookedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function isoOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toDto(
  row: PersonalTheoryLessonRequest,
  student?: User | null,
  instructor?: User | null,
): PersonalTheoryLessonRequestDto {
  const plain = row.toJSON() as Record<string, unknown>;
  const themesRaw = plain.selectedThemes;
  const selectedThemes = Array.isArray(themesRaw)
    ? themesRaw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];
  return {
    id: row.id,
    studentUserId: row.studentUserId,
    studentName: student?.name?.trim() || '—',
    studentPhone: student?.phone?.trim() ? student.phone.trim() : null,
    studentPhone2: student?.phone2?.trim() ? student.phone2.trim() : null,
    studentEmail: student?.email?.trim() || '—',
    instructorUserId: row.instructorUserId,
    instructorName: instructor?.name?.trim() || '—',
    branchId: row.branchId,
    note: row.note?.trim() ? row.note.trim() : null,
    selectedThemes,
    status: row.status,
    bookedLessonId: row.bookedLessonId ?? null,
    handledByAdminId: row.handledByAdminId ?? null,
    contactedAt: isoOrNull(plain.contactedAt),
    cancelledAt: isoOrNull(plain.cancelledAt),
    bookedAt: isoOrNull(plain.bookedAt),
    createdAt: isoOrNull(plain.createdAt) ?? new Date().toISOString(),
    updatedAt: isoOrNull(plain.updatedAt) ?? new Date().toISOString(),
  };
}

async function loadUsersForRows(rows: PersonalTheoryLessonRequest[]): Promise<Map<number, User>> {
  const ids = new Set<number>();
  for (const r of rows) {
    ids.add(r.studentUserId);
    ids.add(r.instructorUserId);
  }
  if (ids.size === 0) return new Map();
  const users = await User.findAll({
    where: { id: { [Op.in]: [...ids] } },
    attributes: ['id', 'name', 'email', 'phone', 'phone2', 'accountType'],
  });
  return new Map(users.map((u) => [u.id, u]));
}

function assertInstructorTeachesTheoryPersonal(profile: InstructorProfile | null): void {
  if (!profile?.teachesTheory) {
    throw new InputValidationError(
      'Instructor does not teach personal theory lessons.',
      HttpStatusCodesUtil.BAD_REQUEST,
    );
  }
}

async function notifyStudentStatus(
  row: PersonalTheoryLessonRequest,
  instructorName: string,
  kind: 'contacted' | 'booked' | 'cancelled',
  bookingDateLine = '',
): Promise<void> {
  const titles: Record<typeof kind, string> = {
    contacted: 'Անհատական տեսական դասի հարցում',
    booked: 'Անհատական տեսական դաս',
    cancelled: 'Անհատական տեսական դասի հարցում',
  };
  const messages: Record<typeof kind, string> = {
    contacted: `Ձեր հարցման վերաբերյալ կապ ենք հաստատել։ ${instructorName} դասատուի հետ դասի օրը և ժամը կհամաձայնեցնենք։`,
    booked: bookingDateLine
      ? `Ձեր անհատական տեսական դասը ամրագրված է (${instructorName})։ ${bookingDateLine}`
      : `Ձեր անհատական տեսական դասի ամրագրումը հաստատված է (${instructorName})։`,
    cancelled: 'Ձեր անհատական տեսական դասի հարցումը չեղարկվել է։',
  };
  const types: Record<typeof kind, 'THEORY_PERSONAL_REQUEST_CONTACTED' | 'THEORY_PERSONAL_REQUEST_BOOKED' | 'THEORY_PERSONAL_REQUEST_CANCELLED'> = {
    contacted: 'THEORY_PERSONAL_REQUEST_CONTACTED',
    booked: 'THEORY_PERSONAL_REQUEST_BOOKED',
    cancelled: 'THEORY_PERSONAL_REQUEST_CANCELLED',
  };
  void NotificationService.createOne({
    recipientUserId: row.studentUserId,
    recipientRole: 'student',
    type: types[kind],
    title: titles[kind],
    message: messages[kind],
    entityType: kind === 'booked' && row.bookedLessonId != null ? 'booking' : 'theory_personal_lesson_request',
    entityId: kind === 'booked' && row.bookedLessonId != null ? String(row.bookedLessonId) : String(row.id),
    dedupeKey: `theory-personal-request-${kind}:${row.id}`,
  }).catch(() => {});
}

export default class PersonalTheoryLessonRequestService {
  static async createFromStudent(input: {
    studentUserId: number;
    instructorUserId: number;
    branchId: number;
    note?: string | null;
    selectedThemes?: readonly string[];
  }): Promise<PersonalTheoryLessonRequestDto> {
    const student = await User.findOne({
      where: { id: input.studentUserId, accountType: 'student' },
      attributes: ['id', 'name', 'email', 'phone', 'phone2'],
    });
    if (!student) {
      throw new InputValidationError('Student account required.', HttpStatusCodesUtil.FORBIDDEN);
    }
    const instructor = await User.findOne({
      where: { id: input.instructorUserId, accountType: 'instructor' },
      attributes: ['id', 'name'],
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
    assertInstructorTeachesTheoryPersonal(profile);

    const existingPending = await PersonalTheoryLessonRequest.findOne({
      where: {
        studentUserId: input.studentUserId,
        instructorUserId: input.instructorUserId,
        status: 'pending',
      },
    });
    if (existingPending) {
      throw new ConflictError(
        'You already have a pending request for this instructor.',
        HttpStatusCodesUtil.CONFLICT,
      );
    }

    const themes = (input.selectedThemes ?? [])
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0);

    const row = await PersonalTheoryLessonRequest.create({
      studentUserId: input.studentUserId,
      instructorUserId: input.instructorUserId,
      branchId: input.branchId,
      note: input.note?.trim() ? input.note.trim() : null,
      selectedThemes: themes.length > 0 ? themes : null,
      status: 'pending',
    });

    const studentLabel = student.name?.trim() || student.email;
    const instructorLabel = instructor.name?.trim() || '—';

    void NotificationService.createForRoles(['admin', 'super_admin'], {
      type: 'THEORY_PERSONAL_REQUEST_CREATED',
      title: 'Նոր անհատական տեսական դասի հարցում',
      message: `${studentLabel} → ${instructorLabel}`,
      entityType: 'theory_personal_lesson_request',
      entityId: String(row.id),
      metadata: {
        studentUserId: row.studentUserId,
        instructorUserId: row.instructorUserId,
        branchId: row.branchId,
      },
      dedupeKey: `theory-personal-request-created:${row.id}`,
    }).catch(() => {});

    void NotificationService.createOne({
      recipientUserId: row.studentUserId,
      recipientRole: 'student',
      type: 'THEORY_PERSONAL_REQUEST_RECEIVED',
      title: 'Հարցումը ստացվել է',
      message:
        'Ձեր հարցումը ուղարկված է։ Մեր ադմինիստրատորները հնարավորինս շուտ կապ կհաստատեն Ձեզ հետ՝ դասի օրը և ժամը համաձայնեցնելու համար։',
      entityType: 'theory_personal_lesson_request',
      entityId: String(row.id),
      dedupeKey: `theory-personal-request-received:${row.id}`,
    }).catch(() => {});

    return toDto(row, student, instructor);
  }

  static async listForStudent(studentUserId: number): Promise<PersonalTheoryLessonRequestDto[]> {
    const rows = await PersonalTheoryLessonRequest.findAll({
      where: { studentUserId },
      order: [['createdAt', 'DESC']],
    });
    const users = await loadUsersForRows(rows);
    return rows.map((r) =>
      toDto(r, users.get(r.studentUserId), users.get(r.instructorUserId)),
    );
  }

  static async listForStaff(branchId?: number): Promise<PersonalTheoryLessonRequestDto[]> {
    const branchFilter = branchIdWhere(branchId);
    const rows = await PersonalTheoryLessonRequest.findAll({
      ...(branchFilter ? { where: branchFilter } : {}),
      order: [['createdAt', 'DESC']],
    });
    const users = await loadUsersForRows(rows);
    return rows.map((r) =>
      toDto(r, users.get(r.studentUserId), users.get(r.instructorUserId)),
    );
  }

  static async getByIdForStaff(id: number): Promise<PersonalTheoryLessonRequestDto | null> {
    const row = await PersonalTheoryLessonRequest.findByPk(id);
    if (!row) return null;
    const users = await loadUsersForRows([row]);
    return toDto(row, users.get(row.studentUserId), users.get(row.instructorUserId));
  }

  static async remove(id: number): Promise<boolean> {
    const row = await PersonalTheoryLessonRequest.findByPk(id);
    if (!row) return false;
    if (row.status === 'booked') {
      throw new InputValidationError(
        'Booked requests cannot be removed. Cancel the booking separately if needed.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const requestIdStr = String(id);
    await sequelize.transaction(async (transaction) => {
      await Notification.destroy({
        where: {
          [Op.or]: [
            { entityType: 'theory_personal_lesson_request', entityId: requestIdStr },
            { dedupeKey: { [Op.like]: `theory-personal-request-%:${id}` } },
          ],
        },
        transaction,
      });
      await row.destroy({ transaction });
    });
    return true;
  }

  static async markContacted(id: number, adminUserId: number): Promise<PersonalTheoryLessonRequestDto | null> {
    const row = await PersonalTheoryLessonRequest.findByPk(id);
    if (!row) return null;
    if (row.status === 'booked' || row.status === 'cancelled') {
      throw new InputValidationError('Request is already closed.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    await row.update({
      status: 'contacted',
      contactedAt: new Date(),
      handledByAdminId: adminUserId,
    });
    const users = await loadUsersForRows([row]);
    const instructor = users.get(row.instructorUserId);
    await notifyStudentStatus(row, instructor?.name?.trim() || '—', 'contacted');
    return toDto(row, users.get(row.studentUserId), instructor);
  }

  static async cancelFromStudent(id: number, studentUserId: number): Promise<PersonalTheoryLessonRequestDto | null> {
    const row = await PersonalTheoryLessonRequest.findOne({
      where: { id, studentUserId },
    });
    if (!row) return null;
    if (row.status === 'booked') {
      throw new InputValidationError(
        'Booked requests cannot be cancelled. Cancel the lesson booking instead.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    if (row.status === 'cancelled') {
      const users = await loadUsersForRows([row]);
      return toDto(row, users.get(row.studentUserId), users.get(row.instructorUserId));
    }
    await row.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      handledByAdminId: null,
    });
    const users = await loadUsersForRows([row]);
    const instructor = users.get(row.instructorUserId);
    await notifyStudentStatus(row, instructor?.name?.trim() || '—', 'cancelled');
    return toDto(row, users.get(row.studentUserId), instructor);
  }

  static async cancel(id: number, adminUserId: number): Promise<PersonalTheoryLessonRequestDto | null> {
    const row = await PersonalTheoryLessonRequest.findByPk(id);
    if (!row) return null;
    if (row.status === 'booked') {
      throw new InputValidationError('Booked requests cannot be cancelled.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    if (row.status === 'cancelled') {
      const users = await loadUsersForRows([row]);
      return toDto(row, users.get(row.studentUserId), users.get(row.instructorUserId));
    }
    await row.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      handledByAdminId: adminUserId,
    });
    const users = await loadUsersForRows([row]);
    const instructor = users.get(row.instructorUserId);
    await notifyStudentStatus(row, instructor?.name?.trim() || '—', 'cancelled');
    return toDto(row, users.get(row.studentUserId), instructor);
  }

  static async createBookingFromRequest(input: {
    requestId: number;
    adminUserId: number;
    dateIso: string;
    slots: readonly string[];
    status: string;
  }): Promise<{ request: PersonalTheoryLessonRequestDto; bookingId: number } | null> {
    const row = await PersonalTheoryLessonRequest.findByPk(input.requestId);
    if (!row) return null;

    if (row.status === 'booked' && row.bookedLessonId != null) {
      throw new ConflictError('A booking was already created for this request.', HttpStatusCodesUtil.CONFLICT);
    }
    if (row.status === 'cancelled') {
      throw new InputValidationError('Cancelled requests cannot be booked.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const instructor = await User.findOne({
      where: { id: row.instructorUserId, accountType: 'instructor' },
      attributes: ['id', 'name'],
    });
    if (!instructor) {
      throw new InputValidationError('Instructor not found.', HttpStatusCodesUtil.NOT_FOUND);
    }

    let bookingId = 0;
    await sequelize.transaction(async (transaction) => {
      const locked = await PersonalTheoryLessonRequest.findByPk(input.requestId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked) {
        throw new InputValidationError('Request not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (locked.status === 'booked' && locked.bookedLessonId != null) {
        throw new ConflictError('A booking was already created for this request.', HttpStatusCodesUtil.CONFLICT);
      }

      const booking = await BookingService.createAdmin({
        studentId: locked.studentUserId,
        instructorName: instructor.name,
        instructorUserId: instructor.id,
        dateIso: input.dateIso,
        time: input.slots[0] ?? '',
        type: 'theory_personal',
        status: input.status,
        branchId: locked.branchId,
        slots: input.slots,
        createdByUserId: input.adminUserId > 0 ? input.adminUserId : null,
      });
      if (!booking) {
        throw new InputValidationError('Could not create booking.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      bookingId = booking.id;

      await locked.update(
        {
          status: 'booked',
          bookedLessonId: bookingId,
          bookedAt: new Date(),
          handledByAdminId: input.adminUserId,
        },
        { transaction },
      );
    });

    const refreshed = await PersonalTheoryLessonRequest.findByPk(input.requestId);
    if (!refreshed) return null;
    const users = await loadUsersForRows([refreshed]);
    const instructorUser = users.get(refreshed.instructorUserId);
    const student = users.get(refreshed.studentUserId);
    const booking = await Booking.findByPk(bookingId);
    const dateLine =
      booking != null
        ? `${String(booking.dateIso).slice(0, 10)} ${booking.time}`.trim()
        : '';
    await notifyStudentStatus(
      refreshed,
      instructorUser?.name?.trim() || '—',
      'booked',
      dateLine,
    );
    void BookingNotificationService.onBookingConfirmed(bookingId).catch(() => {});

    return {
      request: toDto(refreshed, student, instructorUser),
      bookingId,
    };
  }

  static async linkExistingBooking(input: {
    requestId: number;
    bookingId: number;
    adminUserId: number;
  }): Promise<PersonalTheoryLessonRequestDto | null> {
    const row = await PersonalTheoryLessonRequest.findByPk(input.requestId);
    if (!row) return null;

    if (row.status === 'cancelled') {
      throw new InputValidationError('Cancelled requests cannot be booked.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    if (row.status === 'booked' && row.bookedLessonId != null && row.bookedLessonId !== input.bookingId) {
      throw new ConflictError('A booking was already linked to this request.', HttpStatusCodesUtil.CONFLICT);
    }

    const booking = await Booking.findByPk(input.bookingId);
    if (!booking) {
      throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (booking.studentUserId !== row.studentUserId) {
      throw new InputValidationError('Booking student does not match the request.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    if (booking.lessonType !== 'theory_personal') {
      throw new InputValidationError('Booking must be a personal theory lesson.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const instructor = await User.findOne({
      where: { id: row.instructorUserId, accountType: 'instructor' },
      attributes: ['id', 'name'],
    });

    await row.update({
      status: 'booked',
      bookedLessonId: input.bookingId,
      bookedAt: row.bookedAt ?? new Date(),
      handledByAdminId: input.adminUserId,
    });

    const users = await loadUsersForRows([row]);
    const instructorUser = users.get(row.instructorUserId);
    const student = users.get(row.studentUserId);
    const dateLine = `${String(booking.dateIso).slice(0, 10)} ${booking.time}`.trim();
    await notifyStudentStatus(
      row,
      instructorUser?.name?.trim() || instructor?.name?.trim() || '—',
      'booked',
      dateLine,
    );

    return toDto(row, student, instructorUser);
  }
}
