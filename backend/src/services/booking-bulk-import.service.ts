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
  /** Excel 1-based row number when imported from XLSX. */
  rowNumber?: number;
};

export type BulkImportRowError = {
  studentName: string;
  instructorName: string;
  date: string;
  timeSlot: string;
  reason: string;
  rowNumber?: number | null;
  /** duplicate = instructor+date+time already taken / repeated in file */
  kind?: 'duplicate' | 'error';
  studentPhone?: string;
  studentPhone2?: string;
  totalPriceAmd?: number;
  adminPaymentStatus?: AdminBookingPaymentStatus;
  branchName?: string;
};

export type BulkImportResult = {
  imported: number;
  skippedDuplicates: number;
  newStudentsCreated: number;
  errors: BulkImportRowError[];
  /** All non-imported rows from this batch (duplicates + errors), with reasons. */
  skippedRows: BulkImportRowError[];
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
): Promise<{ user: User | null; ambiguous: boolean; matchCount: number }> {
  const trimmed = name.trim();
  if (!trimmed) return { user: null, ambiguous: false, matchCount: 0 };

  const students = await User.findAll({
    where: { accountType: 'student' },
    attributes: ['id', 'name', 'phone', 'phone2'],
  });
  const needle = trimmed.toLowerCase();
  const byName = students.filter((s) => s.name?.trim().toLowerCase() === needle);
  if (byName.length === 0) return { user: null, ambiguous: false, matchCount: 0 };

  const importHasPhone = phoneDigits(phone).length >= 7 || phoneDigits(phone2).length >= 7;

  if (importHasPhone) {
    const phoneMatches = byName.filter((s) =>
      studentPhonesOverlap({ phone, phone2 }, { phone: s.phone, phone2: s.phone2 }),
    );
    if (phoneMatches.length === 1) return { user: phoneMatches[0]!, ambiguous: false, matchCount: 1 };
    if (phoneMatches.length > 1) return { user: null, ambiguous: true, matchCount: phoneMatches.length };

    const emptyPhone = byName.filter((s) => !hasStoredPhone(s));
    if (emptyPhone.length === 1) return { user: emptyPhone[0]!, ambiguous: false, matchCount: 1 };
    if (emptyPhone.length > 1) return { user: null, ambiguous: true, matchCount: emptyPhone.length };

    return { user: null, ambiguous: false, matchCount: 0 };
  }

  if (byName.length === 1) return { user: byName[0]!, ambiguous: false, matchCount: 1 };
  return { user: null, ambiguous: true, matchCount: byName.length };
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

  const { user: existing, ambiguous, matchCount } = await findStudentByNameAndPhones(studentName, phone, phone2);
  if (ambiguous) {
    const hasPhone = Boolean(phone || phone2);
    return {
      userId: null,
      error: hasPhone
        ? `Ambiguous student: ${matchCount} profiles named "${studentName}" match the phone. Check duplicate student records.`
        : `Ambiguous student: ${matchCount} profiles named "${studentName}" exist, but Excel phone is empty. Add the correct phone to this row.`,
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
      skippedRows: [],
      unmappableInstructors: [],
    };

    const unmappableSet = new Set<string>();
    const studentCache = new Map<string, StudentCacheEntry>();
    const instructorIdCache = new Map<string, number | null>();
    /** Within-file + DB: instructorUserId|date|time → first Excel row that claimed it */
    const seenSlots = new Map<string, number | null>();

    const pushSkip = (entry: BulkImportRowError) => {
      result.skippedRows.push(entry);
      if (entry.kind === 'duplicate') {
        result.skippedDuplicates += 1;
      } else {
        result.errors.push(entry);
      }
    };

    for (const row of input.bookings) {
      const studentName = row.studentName?.trim();
      const instructorName = row.instructorName?.trim();
      const dateIso = row.date?.trim().slice(0, 10);
      const slotTime = normalizeTimeHHMM(row.timeSlot?.trim() ?? '');
      const rowNumber = row.rowNumber ?? null;

      const rowRef = {
        rowNumber,
        studentName: studentName ?? '',
        instructorName: instructorName ?? '',
        date: dateIso ?? '',
        timeSlot: slotTime ?? row.timeSlot ?? '',
        ...(row.studentPhone ? { studentPhone: row.studentPhone } : {}),
        ...(row.studentPhone2 ? { studentPhone2: row.studentPhone2 } : {}),
        ...(row.totalPriceAmd != null ? { totalPriceAmd: row.totalPriceAmd } : {}),
        ...(row.adminPaymentStatus ? { adminPaymentStatus: row.adminPaymentStatus } : {}),
      };

      if (!studentName) {
        pushSkip({ ...rowRef, kind: 'error', reason: 'Student name is required' });
        continue;
      }
      if (!instructorName) {
        pushSkip({ ...rowRef, kind: 'error', reason: 'Instructor name is required' });
        continue;
      }
      if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
        pushSkip({ ...rowRef, kind: 'error', reason: 'Invalid date' });
        continue;
      }
      if (!slotTime) {
        pushSkip({ ...rowRef, kind: 'error', reason: 'Invalid time slot' });
        continue;
      }

      const instructorUserId = await resolveInstructorUserId(instructorName, instructorIdCache);
      if (!instructorUserId) {
        unmappableSet.add(instructorName);
        pushSkip({ ...rowRef, kind: 'error', reason: `Instructor not found: ${instructorName}` });
        continue;
      }

      const slotKey = instructorSlotKey(instructorUserId, dateIso, slotTime);
      if (seenSlots.has(slotKey)) {
        const firstRow = seenSlots.get(slotKey);
        pushSkip({
          ...rowRef,
          kind: 'duplicate',
          reason:
            firstRow != null
              ? `Duplicate slot in file (same instructor + date + time as Excel row ${firstRow})`
              : 'Duplicate slot in file (same instructor + date + time)',
        });
        continue;
      }
      seenSlots.set(slotKey, rowNumber);

      if (await instructorSlotTaken(instructorUserId, dateIso, slotTime)) {
        pushSkip({
          ...rowRef,
          kind: 'duplicate',
          reason: 'Duplicate slot: instructor already booked at this date + time',
        });
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
        pushSkip({
          ...rowRef,
          kind: 'error',
          reason: resolved.error ?? 'Failed to create student profile',
        });
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
          pushSkip({ ...rowRef, kind: 'error', reason: `Instructor not found: ${instructorName}` });
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
          pushSkip({
            ...rowRef,
            kind: 'duplicate',
            reason: 'Duplicate slot: instructor already booked at this date + time',
          });
          continue;
        }
        if (e instanceof InputValidationError) {
          const msg = e.message || 'Validation failed';
          if (/instructor not found|does not serve this branch/i.test(msg)) {
            unmappableSet.add(instructorName);
          }
          pushSkip({ ...rowRef, kind: 'error', reason: msg });
          continue;
        }
        const msg = e instanceof Error ? e.message : 'Failed to create booking';
        pushSkip({ ...rowRef, kind: 'error', reason: msg });
      }
    }

    result.unmappableInstructors = [...unmappableSet].sort((a, b) => a.localeCompare(b, 'hy'));
    return result;
  }
}
