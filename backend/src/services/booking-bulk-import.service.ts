import BookingService from './booking.service';
import StudentAdminService from './student-admin.service';
import FinanceService from './finance.service';
import { BookingSlot, User } from '../models';
import { normalizeTimeHHMM } from '../utils/booking-slot.util';
import type { AdminBookingPaymentStatus } from '../utils/booking-admin-payment.util';
import {
  parseStudentPhones,
  phoneDigits,
  studentIdentityKey,
  studentPhonesOverlap,
} from '../utils/student-phones.util';
import ErrorsUtil from '../utils/errors.util';

const { ConflictError, InputValidationError } = ErrorsUtil;

export type BulkImportBookingInput = {
  studentName: string;
  studentPhone?: string;
  studentPhone2?: string;
  instructorName: string;
  date: string;
  timeSlot: string;
  totalPriceAmd?: number;
  adminPaymentStatus?: AdminBookingPaymentStatus;
  paidAmountAmd?: number;
  paymentNotes?: string | null;
  paymentReminderDate?: string | null;
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
  phone2Set: boolean;
};

function hasStoredPhone(user: { phone?: string | null; phone2?: string | null }): boolean {
  return phoneDigits(user.phone).length >= 7 || phoneDigits(user.phone2).length >= 7;
}

/**
 * Find student by name + phones (profile matching only — not booking duplicates).
 * Booking duplicates use instructor + date + time slot.
 */
async function findStudentByNameAndPhones(
  name: string,
  phone: string | null,
  phone2: string | null,
): Promise<{ user: User | null; ambiguous: boolean }> {
  const trimmed = name.trim();
  if (!trimmed) return { user: null, ambiguous: false };

  const students = await User.findAll({
    where: { accountType: 'student' },
    attributes: ['id', 'name', 'phone', 'phone2'],
  });
  const needle = trimmed.toLowerCase();
  const byName = students.filter((s) => s.name?.trim().toLowerCase() === needle);
  if (byName.length === 0) return { user: null, ambiguous: false };

  const importHasPhone = phoneDigits(phone).length >= 7 || phoneDigits(phone2).length >= 7;

  if (importHasPhone) {
    const phoneMatches = byName.filter((s) =>
      studentPhonesOverlap({ phone, phone2 }, { phone: s.phone, phone2: s.phone2 }),
    );
    if (phoneMatches.length === 1) return { user: phoneMatches[0]!, ambiguous: false };
    if (phoneMatches.length > 1) return { user: null, ambiguous: true };

    const emptyPhone = byName.filter((s) => !hasStoredPhone(s));
    if (emptyPhone.length === 1) return { user: emptyPhone[0]!, ambiguous: false };
    if (emptyPhone.length > 1) return { user: null, ambiguous: true };

    return { user: null, ambiguous: false };
  }

  if (byName.length === 1) return { user: byName[0]!, ambiguous: false };
  return { user: null, ambiguous: true };
}

function isDuplicateBookingError(e: unknown): boolean {
  if (e instanceof ConflictError) return true;
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /no longer available|already booked|duplicate/i.test(msg);
}

/** Duplicate key: instructor + date + slot (DB unique on booking_slots). */
function instructorSlotKey(instructorUserId: number, dateIso: string, slotTime: string): string {
  return `${instructorUserId}\t${dateIso}\t${slotTime}`;
}

async function resolveInstructorUserId(
  instructorName: string,
  cache: Map<string, number | null>,
): Promise<number | null> {
  const key = instructorName.trim();
  if (cache.has(key)) return cache.get(key) ?? null;
  const instructor = await User.findOne({
    where: { accountType: 'instructor', name: key },
    attributes: ['id'],
  });
  const id = instructor?.id ?? null;
  cache.set(key, id);
  return id;
}

async function instructorSlotTaken(
  instructorUserId: number,
  dateIso: string,
  slotTime: string,
): Promise<boolean> {
  const existing = await BookingSlot.findOne({
    where: { instructorUserId, dateIso, slotTime },
    attributes: ['id'],
  });
  return existing != null;
}

async function resolveStudentUserId(input: {
  studentName: string;
  studentPhone?: string;
  studentPhone2?: string;
  branchId: number;
  cache: Map<string, StudentCacheEntry>;
  onCreated: () => void;
}): Promise<{ userId: number | null; error?: string }> {
  const studentName = input.studentName.trim();
  const { phone, phone2 } = parseStudentPhones(input.studentPhone, input.studentPhone2);
  const identityKey = studentIdentityKey(studentName, phone, phone2);

  const cached = input.cache.get(identityKey);
  if (cached) {
    const patch: { phone?: string; phone2?: string } = {};
    if (phone && !cached.phoneSet) {
      patch.phone = phone;
      cached.phoneSet = true;
    }
    if (phone2 && !cached.phone2Set) {
      patch.phone2 = phone2;
      cached.phone2Set = true;
    }
    if (Object.keys(patch).length > 0) {
      await StudentAdminService.update(cached.userId, patch);
    }
    return { userId: cached.userId };
  }

  const { user: existing, ambiguous } = await findStudentByNameAndPhones(studentName, phone, phone2);
  if (ambiguous) {
    return {
      userId: null,
      error:
        'Ambiguous student: multiple profiles match this name' +
        (phone || phone2 ? ' / phone' : '') +
        '. Disambiguate with phone numbers.',
    };
  }

  if (existing) {
    const patch: { phone?: string; phone2?: string } = {};
    if (phone && !existing.phone?.trim()) patch.phone = phone;
    if (phone2 && !existing.phone2?.trim()) patch.phone2 = phone2;
    if (Object.keys(patch).length > 0) {
      await StudentAdminService.update(existing.id, patch);
    }
    input.cache.set(identityKey, {
      userId: existing.id,
      phoneSet: Boolean(phone || existing.phone?.trim()),
      phone2Set: Boolean(phone2 || existing.phone2?.trim()),
    });
    return { userId: existing.id };
  }

  const created = await StudentAdminService.create({
    name: studentName,
    branchId: input.branchId,
    inviteToSystem: false,
    ...(phone ? { phone } : {}),
    ...(phone2 ? { phone2 } : {}),
  });
  if (!created) return { userId: null, error: 'Failed to create student profile' };

  input.onCreated();
  input.cache.set(identityKey, {
    userId: created.id,
    phoneSet: Boolean(phone),
    phone2Set: Boolean(phone2),
  });
  return { userId: created.id };
}

export default class BookingBulkImportService {
  static async bulkImportPractical(input: {
    branchId: number;
    bookings: BulkImportBookingInput[];
    createdByUserId?: number | null;
    /** When true: count duplicates / validate only — no student or booking writes. */
    dryRun?: boolean;
  }): Promise<BulkImportResult> {
    const dryRun = Boolean(input.dryRun);
    const result: BulkImportResult = {
      imported: 0,
      skippedDuplicates: 0,
      newStudentsCreated: 0,
      errors: [],
      unmappableInstructors: [],
    };

    const unmappableSet = new Set<string>();
    const studentCache = new Map<string, StudentCacheEntry>();
    const instructorIdCache = new Map<string, number | null>();
    /** Within-file + DB: instructorUserId|date|time */
    const seenSlots = new Set<string>();

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

      const instructorUserId = await resolveInstructorUserId(instructorName, instructorIdCache);
      if (!instructorUserId) {
        unmappableSet.add(instructorName);
        result.errors.push({ ...rowRef, reason: `Instructor not found: ${instructorName}` });
        continue;
      }

      const slotKey = instructorSlotKey(instructorUserId, dateIso, slotTime);
      if (seenSlots.has(slotKey)) {
        result.skippedDuplicates += 1;
        continue;
      }
      seenSlots.add(slotKey);

      if (await instructorSlotTaken(instructorUserId, dateIso, slotTime)) {
        result.skippedDuplicates += 1;
        continue;
      }

      if (dryRun) {
        // Would import this row (slot free). Do not write.
        result.imported += 1;
        continue;
      }

      const resolved = await resolveStudentUserId({
        studentName,
        studentPhone: row.studentPhone,
        studentPhone2: row.studentPhone2,
        branchId: input.branchId,
        cache: studentCache,
        onCreated: () => {
          result.newStudentsCreated += 1;
        },
      });
      if (!resolved.userId) {
        result.errors.push({ ...rowRef, reason: resolved.error ?? 'Failed to create student profile' });
        continue;
      }
      const studentUserId = resolved.userId;

      try {
        const created = await BookingService.createAdmin({
          studentId: studentUserId,
          instructorName,
          instructorUserId,
          dateIso,
          time: slotTime,
          type: 'practical',
          status: 'confirmed',
          branchId: input.branchId,
          slotEntries: [{ dateIso, time: slotTime }],
          totalPriceAmd: row.totalPriceAmd,
          adminPaymentStatus: row.adminPaymentStatus ?? 'unpaid',
          paidAmountAmd: row.paidAmountAmd,
          paymentNotes: row.paymentNotes,
          paymentReminderDate: row.paymentReminderDate,
          createdByUserId: input.createdByUserId,
          allowHistoricalSlots: true,
        });

        if (!created) {
          unmappableSet.add(instructorName);
          result.errors.push({ ...rowRef, reason: `Instructor not found: ${instructorName}` });
          continue;
        }

        const paidForFinance =
          row.adminPaymentStatus === 'paid'
            ? Math.max(0, Math.round(row.totalPriceAmd ?? created.totalPriceAmd ?? 0))
            : Math.max(0, Math.round(row.paidAmountAmd ?? 0));
        if (paidForFinance > 0) {
          const student = await User.findByPk(studentUserId, { attributes: ['name', 'email'] });
          try {
            await FinanceService.create({
              customer: student?.name?.trim() || studentName,
              email: student?.email ?? '',
              branchId: input.branchId,
              method: 'cash',
              grossAmd: paidForFinance,
              status: 'completed',
              source: 'manual',
              bookingId: created.id,
            });
          } catch {
            // Finance row is best-effort; booking import still counts as success.
          }
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
