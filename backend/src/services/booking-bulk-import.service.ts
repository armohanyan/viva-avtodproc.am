import BookingService from './booking.service';
import StudentAdminService from './student-admin.service';
import { User } from '../models';
import { normalizeTimeHHMM } from '../utils/booking-slot.util';
import ErrorsUtil from '../utils/errors.util';

const { ConflictError, InputValidationError } = ErrorsUtil;

export type BulkImportBookingInput = {
  studentName: string;
  studentPhone?: string;
  instructorName: string;
  date: string;
  timeSlot: string;
};

export type BulkImportRowError = {
  studentName: string;
  instructorName: string;
  date: string;
  timeSlot: string;
  reason: string;
};

export type BulkImportResult = {
  imported: number;
  skippedDuplicates: number;
  newStudentsCreated: number;
  errors: BulkImportRowError[];
  unmappableInstructors: string[];
};

type StudentCacheEntry = {
  userId: number;
  phoneSet: boolean;
};

async function findStudentByName(name: string): Promise<User | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const exact = await User.findOne({
    where: { accountType: 'student', name: trimmed },
    attributes: ['id', 'name', 'phone'],
  });
  if (exact) return exact;

  const students = await User.findAll({
    where: { accountType: 'student' },
    attributes: ['id', 'name', 'phone'],
  });
  const needle = trimmed.toLowerCase();
  const matches = students.filter((s) => s.name?.trim().toLowerCase() === needle);
  return matches[0] ?? null;
}

function normalizePhoneInput(raw: string | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isDuplicateBookingError(e: unknown): boolean {
  if (e instanceof ConflictError) return true;
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /no longer available|already booked|duplicate/i.test(msg);
}

async function resolveStudentUserId(input: {
  studentName: string;
  studentPhone?: string;
  branchId: number;
  cache: Map<string, StudentCacheEntry>;
  onCreated: () => void;
}): Promise<number | null> {
  const studentName = input.studentName.trim();
  const phone = normalizePhoneInput(input.studentPhone);
  const studentKey = studentName.toLowerCase();

  const cached = input.cache.get(studentKey);
  if (cached) {
    if (phone && !cached.phoneSet) {
      await StudentAdminService.update(cached.userId, { phone });
      cached.phoneSet = true;
    }
    return cached.userId;
  }

  const existing = await findStudentByName(studentName);
  if (existing) {
    if (phone && !existing.phone?.trim()) {
      await StudentAdminService.update(existing.id, { phone });
    }
    input.cache.set(studentKey, { userId: existing.id, phoneSet: Boolean(phone || existing.phone?.trim()) });
    return existing.id;
  }

  const created = await StudentAdminService.create({
    name: studentName,
    branchId: input.branchId,
    inviteToSystem: false,
    ...(phone ? { phone } : {}),
  });
  if (!created) return null;

  input.onCreated();
  input.cache.set(studentKey, { userId: created.id, phoneSet: Boolean(phone) });
  return created.id;
}

export default class BookingBulkImportService {
  static async bulkImportPractical(input: {
    branchId: number;
    bookings: BulkImportBookingInput[];
    createdByUserId?: number | null;
  }): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      imported: 0,
      skippedDuplicates: 0,
      newStudentsCreated: 0,
      errors: [],
      unmappableInstructors: [],
    };

    const unmappableSet = new Set<string>();
    const studentCache = new Map<string, StudentCacheEntry>();

    for (const row of input.bookings) {
      const studentName = row.studentName?.trim();
      const instructorName = row.instructorName?.trim();
      const dateIso = row.date?.trim().slice(0, 10);
      const slotTime = normalizeTimeHHMM(row.timeSlot?.trim() ?? '');

      const rowRef = {
        studentName: studentName ?? '',
        instructorName: instructorName ?? '',
        date: dateIso ?? '',
        timeSlot: slotTime ?? row.timeSlot ?? '',
      };

      if (!studentName) {
        result.errors.push({ ...rowRef, reason: 'Student name is required' });
        continue;
      }
      if (!instructorName) {
        result.errors.push({ ...rowRef, reason: 'Instructor name is required' });
        continue;
      }
      if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
        result.errors.push({ ...rowRef, reason: 'Invalid date' });
        continue;
      }
      if (!slotTime) {
        result.errors.push({ ...rowRef, reason: 'Invalid time slot' });
        continue;
      }

      const studentUserId = await resolveStudentUserId({
        studentName,
        studentPhone: row.studentPhone,
        branchId: input.branchId,
        cache: studentCache,
        onCreated: () => {
          result.newStudentsCreated += 1;
        },
      });
      if (!studentUserId) {
        result.errors.push({ ...rowRef, reason: 'Failed to create student profile' });
        continue;
      }

      try {
        const created = await BookingService.createAdmin({
          studentId: studentUserId,
          instructorName,
          instructorUserId: undefined,
          dateIso,
          time: slotTime,
          type: 'practical',
          status: 'confirmed',
          branchId: input.branchId,
          slotEntries: [{ dateIso, time: slotTime }],
          adminPaymentStatus: 'unpaid',
          paidAmountAmd: 0,
          createdByUserId: input.createdByUserId,
        });

        if (!created) {
          unmappableSet.add(instructorName);
          result.errors.push({ ...rowRef, reason: `Instructor not found: ${instructorName}` });
          continue;
        }

        result.imported += 1;
      } catch (e) {
        if (isDuplicateBookingError(e)) {
          result.skippedDuplicates += 1;
          continue;
        }
        if (e instanceof InputValidationError) {
          const msg = e.message || 'Validation failed';
          if (/instructor not found|does not serve this branch/i.test(msg)) {
            unmappableSet.add(instructorName);
          }
          result.errors.push({ ...rowRef, reason: msg });
          continue;
        }
        const msg = e instanceof Error ? e.message : 'Failed to create booking';
        result.errors.push({ ...rowRef, reason: msg });
      }
    }

    result.unmappableInstructors = [...unmappableSet].sort((a, b) => a.localeCompare(b, 'hy'));
    return result;
  }
}
