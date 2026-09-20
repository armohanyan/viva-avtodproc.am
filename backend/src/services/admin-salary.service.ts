import { Op } from 'sequelize';
import {
  InstructorProfile,
  SalaryCardTransfer,
  SalaryPayment,
  TheoryCohort,
  TheoryCohortSession,
  User,
} from '../models';
import type { SalaryPaymentKind } from '../models/salary-payment.model';
import type { SalaryCardTransfer as SalaryCardTransferRow } from '../models/salary-card-transfer.model';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import { lessonEndUtcMs } from '../utils/lesson-datetime.util';
import {
  findLegacyBookingsWithoutSlots,
  findSlotsInDateRange,
  legacyGraphicPaymentStanding,
  salaryGraphicPaymentStanding,
  salarySlotOccupiesGraphic,
  slotCountFromTimeRange,
  SLOT_RESERVING_BOOKING_STATUSES,
} from '../utils/lesson-slot-count.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

/** Default AMD paid to a practical instructor per lesson (1 lesson = 1 hour slot). */
export const INSTRUCTOR_LESSON_RATE_AMD = 1500;
/** Default AMD paid to a theory teacher per group-theory session. */
export const THEORY_TEACHER_LESSON_RATE_AMD = 3000;

export type SalaryEmployeeKind = 'instructor' | 'theory_teacher';

async function salaryRatesByInstructorIds(
  userIds: number[],
): Promise<Map<number, { practical: number; theory: number }>> {
  const map = new Map<number, { practical: number; theory: number }>();
  if (userIds.length === 0) return map;
  const profiles = await InstructorProfile.findAll({
    where: { userId: { [Op.in]: userIds } },
    attributes: ['userId', 'practicalSalaryPerLessonAmd', 'theorySalaryPerLessonAmd'],
  });
  for (const p of profiles) {
    map.set(p.userId, {
      practical: p.practicalSalaryPerLessonAmd ?? INSTRUCTOR_LESSON_RATE_AMD,
      theory: p.theorySalaryPerLessonAmd ?? THEORY_TEACHER_LESSON_RATE_AMD,
    });
  }
  return map;
}

function rateForKind(
  rates: Map<number, { practical: number; theory: number }>,
  employeeUserId: number,
  kind: SalaryEmployeeKind,
): number {
  const row = rates.get(employeeUserId);
  if (kind === 'instructor') {
    return row?.practical ?? INSTRUCTOR_LESSON_RATE_AMD;
  }
  return row?.theory ?? THEORY_TEACHER_LESSON_RATE_AMD;
}

export type SalaryReportRowDto = {
  kind: SalaryEmployeeKind;
  employeeUserId: number;
  employeeName: string;
  /**
   * Practical slots that occupy the driving graphic in this period.
   * Salary total = this count × rate (same as Admin Driving daily cells).
   */
  lessonsCount: number;
  /** Of those hours: student payment not complete. Does not reduce salary. */
  unpaidLessonsCount: number;
  /** Always 0 - kept for API compatibility. */
  partialUnpaidLessonsCount: number;
  /** Always 0 - kept for API compatibility. */
  excludedLessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  /**
   * Configured monthly card transfer amount when autoMonthly is enabled for this instructor.
   * Informational only - does not reduce totalAmd.
   */
  cardTransferAmd: number | null;
  /** Existing submitted payment whose period overlaps the requested range (already paid). */
  paid: {
    paymentId: number;
    title: string;
    periodStartIso: string;
    periodEndIso: string;
    lessonsCount: number | null;
    totalAmd: number;
    paidAtIso: string;
  } | null;
};

export type SalaryReportDto = {
  startDate: string;
  endDate: string;
  instructorRateAmd: number;
  theoryTeacherRateAmd: number;
  rows: SalaryReportRowDto[];
};

export type SalaryPaymentDto = {
  id: number;
  title: string;
  kind: SalaryPaymentKind;
  employeeUserId: number | null;
  employeeName: string;
  periodStartIso: string;
  periodEndIso: string;
  lessonsCount: number | null;
  ratePerLessonAmd: number | null;
  totalAmd: number;
  notes: string | null;
  createdAtIso: string;
  createdByName: string | null;
};

export type SalaryLessonRowDto = {
  id: number;
  /** Booking id for practical lessons; null for theory cohort sessions. */
  bookingId: number | null;
  dateIso: string;
  startTime: string;
  endTime: string | null;
  /** Lesson units this row contributes (hours for practical, 1 for theory sessions). */
  units: number;
  /** Student name for practical lessons; theory group name for sessions. */
  label: string;
  /** Only paid vs unpaid for the salary UI. */
  paymentBucket: 'payable' | 'unpaid';
};

export type SalaryLessonsDto = {
  kind: SalaryEmployeeKind;
  employeeUserId: number;
  startDate: string;
  endDate: string;
  totalUnits: number;
  unpaidUnits: number;
  partialUnpaidUnits: number;
  excludedUnits: number;
  items: SalaryLessonRowDto[];
};

type PracticalLessonBreakdown = {
  /** All graphic-occupying practical slots (= salary hours). */
  graphic: number;
  /** Of those hours: student has not fully paid. */
  unpaid: number;
};

export type CreateCalculatedSalaryInput = {
  kind: SalaryEmployeeKind;
  employeeUserId: number;
  title: string;
  periodStart: string;
  periodEnd: string;
  notes?: string | null;
};

export type CreateOtherSalaryInput = {
  kind: 'other';
  title: string;
  employeeName?: string | null;
  amountAmd: number;
  periodStart: string;
  periodEnd: string;
  notes?: string | null;
};

export type SalaryCardTransferDto = {
  id: number;
  instructorUserId: number;
  instructorName: string;
  amountAmd: number;
  autoMonthly: boolean;
  notes: string | null;
  createdAtIso: string;
};

export type CreateSalaryCardTransferInput = {
  instructorUserId: number;
  amountAmd: number;
  autoMonthly?: boolean;
  notes?: string | null;
};

export type UpdateSalaryCardTransferInput = CreateSalaryCardTransferInput;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateRange(startDate?: string, endDate?: string): { start: string; end: string } {
  const today = yerevanTodayIso();
  let start = startDate && DATE_RE.test(startDate) ? startDate : today;
  let end = endDate && DATE_RE.test(endDate) ? endDate : today;
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return { start, end };
}

/** Active auto-monthly card amounts keyed by instructor user id. */
async function autoCardAmountsByInstructor(): Promise<Map<number, number>> {
  const rows = await SalaryCardTransfer.findAll({
    where: { autoMonthly: true },
    attributes: ['instructorUserId', 'amountAmd'],
  });
  const map = new Map<number, number>();
  for (const row of rows) {
    if (row.amountAmd > 0) map.set(row.instructorUserId, row.amountAmd);
  }
  return map;
}

function cardTransferDto(row: SalaryCardTransferRow): SalaryCardTransferDto {
  const createdAt = (row as SalaryCardTransferRow & { createdAt?: Date }).createdAt;
  return {
    id: row.id,
    instructorUserId: row.instructorUserId,
    instructorName: row.instructorName,
    amountAmd: row.amountAmd,
    autoMonthly: Boolean(row.autoMonthly),
    notes: row.notes ?? null,
    createdAtIso: createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

function sessionCountsForSalary(session: TheoryCohortSession, now: Date): boolean {
  if (session.instructorUserId == null || session.instructorUserId <= 0) return false;
  if (session.status === 'cancelled') return false;
  if (session.status === 'completed') return true;
  return lessonEndUtcMs(String(session.dateIso), String(session.endTime)) <= now.getTime();
}

function paymentRowToDto(row: SalaryPayment, createdBy?: User | null): SalaryPaymentDto {
  const createdAt = (row as SalaryPayment & { createdAt?: Date }).createdAt;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    employeeUserId: row.employeeUserId ?? null,
    employeeName: row.employeeName,
    periodStartIso: String(row.periodStartIso).slice(0, 10),
    periodEndIso: String(row.periodEndIso).slice(0, 10),
    lessonsCount: row.lessonsCount ?? null,
    ratePerLessonAmd: row.ratePerLessonAmd ?? null,
    totalAmd: row.totalAmd,
    notes: row.notes ?? null,
    createdAtIso: createdAt?.toISOString() ?? new Date().toISOString(),
    createdByName: createdBy?.name ?? null,
  };
}

function emptyBreakdown(): PracticalLessonBreakdown {
  return { graphic: 0, unpaid: 0 };
}

function addGraphicStanding(
  breakdown: PracticalLessonBreakdown,
  payment: 'payable' | 'unpaid',
  units: number,
): void {
  if (units <= 0) return;
  breakdown.graphic += units;
  if (payment === 'unpaid') breakdown.unpaid += units;
}

/** Practical lesson slot breakdown per instructor in the date range. */
async function practicalLessonBreakdowns(
  start: string,
  end: string,
): Promise<Map<number, PracticalLessonBreakdown>> {
  const query = {
    startDate: start,
    endDate: end,
    lessonTypes: ['practical'] as const,
    bookingStatuses: SLOT_RESERVING_BOOKING_STATUSES,
  };
  const [slots, legacyBookings] = await Promise.all([
    findSlotsInDateRange(query),
    findLegacyBookingsWithoutSlots(query),
  ]);
  const counts = new Map<number, PracticalLessonBreakdown>();
  for (const slot of slots) {
    if (!salarySlotOccupiesGraphic(slot.booking)) continue;
    const payment = salaryGraphicPaymentStanding(slot.booking, slot);
    const row = counts.get(slot.instructorUserId) ?? emptyBreakdown();
    addGraphicStanding(row, payment, 1);
    counts.set(slot.instructorUserId, row);
  }
  for (const row of legacyBookings) {
    if (!salarySlotOccupiesGraphic(row)) continue;
    const payment = legacyGraphicPaymentStanding(row);
    const iid = row.instructorUserId as number;
    const d = String(row.dateIso).slice(0, 10);
    const units = slotCountFromTimeRange(d, String(row.time), row.endTime);
    const entry = counts.get(iid) ?? emptyBreakdown();
    addGraphicStanding(entry, payment, units);
    counts.set(iid, entry);
  }
  return counts;
}

/** Graphic practical lesson slots per instructor (salary calculation). */
async function practicalLessonCounts(start: string, end: string): Promise<Map<number, number>> {
  const breakdowns = await practicalLessonBreakdowns(start, end);
  const counts = new Map<number, number>();
  for (const [id, b] of breakdowns) {
    if (b.graphic > 0) counts.set(id, b.graphic);
  }
  return counts;
}

/** Completed group-theory sessions per teacher in the date range. */
async function theoryLessonCounts(start: string, end: string): Promise<Map<number, number>> {
  const now = new Date();
  const sessions = await TheoryCohortSession.findAll({
    where: {
      dateIso: { [Op.between]: [start, end] },
      instructorUserId: { [Op.ne]: null },
    },
  });
  const counts = new Map<number, number>();
  for (const session of sessions) {
    if (!sessionCountsForSalary(session, now)) continue;
    const iid = session.instructorUserId as number;
    counts.set(iid, (counts.get(iid) ?? 0) + 1);
  }
  return counts;
}

async function overlappingPayments(
  start: string,
  end: string,
): Promise<Map<string, SalaryPayment>> {
  const rows = await SalaryPayment.findAll({
    where: {
      kind: { [Op.in]: ['instructor', 'theory_teacher'] },
      employeeUserId: { [Op.ne]: null },
      periodStartIso: { [Op.lte]: end },
      periodEndIso: { [Op.gte]: start },
    },
    order: [['id', 'ASC']],
  });
  const map = new Map<string, SalaryPayment>();
  for (const row of rows) {
    map.set(`${row.kind}:${row.employeeUserId}`, row);
  }
  return map;
}

async function practicalLessonRows(
  employeeUserId: number,
  start: string,
  end: string,
): Promise<SalaryLessonRowDto[]> {
  const query = {
    startDate: start,
    endDate: end,
    instructorUserId: employeeUserId,
    lessonTypes: ['practical'] as const,
    bookingStatuses: SLOT_RESERVING_BOOKING_STATUSES,
  };
  const [slots, legacyBookings] = await Promise.all([
    findSlotsInDateRange(query),
    findLegacyBookingsWithoutSlots(query),
  ]);

  const studentIds = [
    ...new Set([
      ...slots.map((s) => s.booking.studentUserId),
      ...legacyBookings.map((b) => b.studentUserId),
    ]),
  ];
  const students =
    studentIds.length > 0
      ? await User.findAll({ where: { id: { [Op.in]: studentIds } }, attributes: ['id', 'name'] })
      : [];
  const studentNameById = new Map(students.map((u) => [u.id, u.name?.trim() || `Student #${u.id}`]));

  const items: SalaryLessonRowDto[] = [];

  for (const slot of slots) {
    if (!salarySlotOccupiesGraphic(slot.booking)) continue;
    const paymentBucket = salaryGraphicPaymentStanding(slot.booking, slot);
    items.push({
      id: slot.slotId,
      bookingId: slot.bookingId,
      dateIso: slot.dateIso,
      startTime: slot.slotTime,
      endTime: null,
      units: 1,
      label: studentNameById.get(slot.booking.studentUserId) ?? `Student #${slot.booking.studentUserId}`,
      paymentBucket,
    });
  }

  for (const row of legacyBookings) {
    if (!salarySlotOccupiesGraphic(row)) continue;
    const paymentBucket = legacyGraphicPaymentStanding(row);
    const d = String(row.dateIso).slice(0, 10);
    const units = slotCountFromTimeRange(d, String(row.time), row.endTime);
    items.push({
      id: row.id,
      bookingId: row.id,
      dateIso: d,
      startTime: String(row.time),
      endTime: row.endTime ?? null,
      units,
      label: studentNameById.get(row.studentUserId) ?? `Student #${row.studentUserId}`,
      paymentBucket,
    });
  }

  return items.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.startTime.localeCompare(b.startTime));
}

async function theoryLessonRows(
  employeeUserId: number,
  start: string,
  end: string,
): Promise<SalaryLessonRowDto[]> {
  const now = new Date();
  const sessions = await TheoryCohortSession.findAll({
    where: {
      dateIso: { [Op.between]: [start, end] },
      instructorUserId: employeeUserId,
    },
    include: [{ model: TheoryCohort, as: 'cohort', required: false, attributes: ['id', 'name'] }],
    order: [
      ['dateIso', 'ASC'],
      ['startTime', 'ASC'],
    ],
  });
  const items: SalaryLessonRowDto[] = [];
  for (const session of sessions) {
    if (!sessionCountsForSalary(session, now)) continue;
    const cohort = session.get('cohort') as TheoryCohort | null | undefined;
    items.push({
      id: session.id,
      bookingId: null,
      dateIso: String(session.dateIso).slice(0, 10),
      startTime: String(session.startTime),
      endTime: String(session.endTime),
      units: 1,
      label: cohort?.name?.trim() || `Group #${session.cohortId}`,
      paymentBucket: 'payable',
    });
  }
  return items;
}

export default class AdminSalaryService {
  static async lessons(
    kind: SalaryEmployeeKind,
    employeeUserId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<SalaryLessonsDto> {
    const { start, end } = parseDateRange(startDate, endDate);
    const items =
      kind === 'instructor'
        ? await practicalLessonRows(employeeUserId, start, end)
        : await theoryLessonRows(employeeUserId, start, end);
    return {
      kind,
      employeeUserId,
      startDate: start,
      endDate: end,
      totalUnits: items.reduce((s, r) => s + r.units, 0),
      unpaidUnits: items.reduce((s, r) => s + (r.paymentBucket === 'unpaid' ? r.units : 0), 0),
      partialUnpaidUnits: 0,
      excludedUnits: 0,
      items,
    };
  }

  static async report(startDate?: string, endDate?: string): Promise<SalaryReportDto> {
    const { start, end } = parseDateRange(startDate, endDate);

    const [practicalBreakdowns, theoryCounts, paidByKey, cardByInstructor] = await Promise.all([
      practicalLessonBreakdowns(start, end),
      theoryLessonCounts(start, end),
      overlappingPayments(start, end),
      autoCardAmountsByInstructor(),
    ]);

    const userIds = [
      ...new Set([...practicalBreakdowns.keys(), ...theoryCounts.keys()]),
    ];
    const [users, salaryRates] = await Promise.all([
      userIds.length > 0
        ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name'] })
        : Promise.resolve([] as User[]),
      salaryRatesByInstructorIds(userIds),
    ]);
    const nameById = new Map(users.map((u) => [u.id, u.name?.trim() || `Instructor #${u.id}`]));

    const rows: SalaryReportRowDto[] = [];

    for (const [employeeUserId, breakdown] of practicalBreakdowns) {
      if (breakdown.graphic <= 0) {
        continue;
      }
      const rate = rateForKind(salaryRates, employeeUserId, 'instructor');
      const paidRow = paidByKey.get(`instructor:${employeeUserId}`) ?? null;
      const cardAmt = cardByInstructor.get(employeeUserId) ?? null;
      rows.push({
        kind: 'instructor',
        employeeUserId,
        employeeName: nameById.get(employeeUserId) ?? `Instructor #${employeeUserId}`,
        lessonsCount: breakdown.graphic,
        unpaidLessonsCount: breakdown.unpaid,
        partialUnpaidLessonsCount: 0,
        excludedLessonsCount: 0,
        ratePerLessonAmd: rate,
        totalAmd: breakdown.graphic * rate,
        cardTransferAmd: cardAmt != null && cardAmt > 0 ? cardAmt : null,
        paid: paidRow
          ? {
              paymentId: paidRow.id,
              title: paidRow.title,
              periodStartIso: String(paidRow.periodStartIso).slice(0, 10),
              periodEndIso: String(paidRow.periodEndIso).slice(0, 10),
              lessonsCount: paidRow.lessonsCount ?? null,
              totalAmd: paidRow.totalAmd,
              paidAtIso:
                (paidRow as SalaryPayment & { createdAt?: Date }).createdAt?.toISOString() ??
                new Date().toISOString(),
            }
          : null,
      });
    }

    for (const [employeeUserId, lessonsCount] of theoryCounts) {
      if (lessonsCount <= 0) continue;
      const rate = rateForKind(salaryRates, employeeUserId, 'theory_teacher');
      const paidRow = paidByKey.get(`theory_teacher:${employeeUserId}`) ?? null;
      const cardAmt = cardByInstructor.get(employeeUserId) ?? null;
      rows.push({
        kind: 'theory_teacher',
        employeeUserId,
        employeeName: nameById.get(employeeUserId) ?? `Instructor #${employeeUserId}`,
        lessonsCount,
        unpaidLessonsCount: 0,
        partialUnpaidLessonsCount: 0,
        excludedLessonsCount: 0,
        ratePerLessonAmd: rate,
        totalAmd: lessonsCount * rate,
        cardTransferAmd: cardAmt != null && cardAmt > 0 ? cardAmt : null,
        paid: paidRow
          ? {
              paymentId: paidRow.id,
              title: paidRow.title,
              periodStartIso: String(paidRow.periodStartIso).slice(0, 10),
              periodEndIso: String(paidRow.periodEndIso).slice(0, 10),
              lessonsCount: paidRow.lessonsCount ?? null,
              totalAmd: paidRow.totalAmd,
              paidAtIso:
                (paidRow as SalaryPayment & { createdAt?: Date }).createdAt?.toISOString() ??
                new Date().toISOString(),
            }
          : null,
      });
    }

    rows.sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) || a.employeeName.localeCompare(b.employeeName, 'hy'),
    );

    return {
      startDate: start,
      endDate: end,
      instructorRateAmd: INSTRUCTOR_LESSON_RATE_AMD,
      theoryTeacherRateAmd: THEORY_TEACHER_LESSON_RATE_AMD,
      rows,
    };
  }

  static async listPayments(
    startDate?: string,
    endDate?: string,
  ): Promise<{ items: SalaryPaymentDto[] }> {
    const where: Record<string | symbol, unknown> = {};
    if (startDate && DATE_RE.test(startDate) && endDate && DATE_RE.test(endDate)) {
      const { start, end } = parseDateRange(startDate, endDate);
      where.periodStartIso = { [Op.lte]: end };
      where.periodEndIso = { [Op.gte]: start };
    }
    const rows = await SalaryPayment.findAll({
      where,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [{ model: User, as: 'createdBy', required: false, attributes: ['id', 'name'] }],
    });
    return {
      items: rows.map((row) => paymentRowToDto(row, row.get('createdBy') as User | undefined)),
    };
  }

  static async createCalculatedPayment(
    input: CreateCalculatedSalaryInput,
    createdByUserId?: number,
  ): Promise<SalaryPaymentDto> {
    const { start, end } = parseDateRange(input.periodStart, input.periodEnd);

    const employee = await User.findByPk(input.employeeUserId, { attributes: ['id', 'name'] });
    if (!employee) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    const existing = await SalaryPayment.findOne({
      where: {
        kind: input.kind,
        employeeUserId: input.employeeUserId,
        periodStartIso: { [Op.lte]: end },
        periodEndIso: { [Op.gte]: start },
      },
    });
    if (existing) {
      throw new InputValidationError(
        'A salary payment for this employee already overlaps this period',
        HttpStatusCodesUtil.CONFLICT,
      );
    }

    const counts =
      input.kind === 'instructor'
        ? await practicalLessonCounts(start, end)
        : await theoryLessonCounts(start, end);
    const lessonsCount = counts.get(input.employeeUserId) ?? 0;
    if (lessonsCount <= 0) {
      throw new InputValidationError(
        'No graphic lessons found for this employee in the selected period',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const salaryRates = await salaryRatesByInstructorIds([input.employeeUserId]);
    const rate = rateForKind(salaryRates, input.employeeUserId, input.kind);

    const row = await SalaryPayment.create({
      title: input.title.trim(),
      kind: input.kind,
      employeeUserId: input.employeeUserId,
      employeeName: employee.name?.trim() || `Instructor #${employee.id}`,
      periodStartIso: start,
      periodEndIso: end,
      lessonsCount,
      ratePerLessonAmd: rate,
      totalAmd: lessonsCount * rate,
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    return paymentRowToDto(row);
  }

  static async createOtherPayment(
    input: CreateOtherSalaryInput,
    createdByUserId?: number,
  ): Promise<SalaryPaymentDto> {
    const { start, end } = parseDateRange(input.periodStart, input.periodEnd);

    const amount = Math.round(input.amountAmd);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new InputValidationError(
        'Amount must be a positive number',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const row = await SalaryPayment.create({
      title: input.title.trim(),
      kind: 'other',
      employeeUserId: null,
      employeeName: input.employeeName?.trim() || input.title.trim(),
      periodStartIso: start,
      periodEndIso: end,
      lessonsCount: null,
      ratePerLessonAmd: null,
      totalAmd: amount,
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    return paymentRowToDto(row);
  }

  static async removePayment(id: number): Promise<void> {
    const n = await SalaryPayment.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Salary payment not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }

  static async listCardTransfers(): Promise<{ items: SalaryCardTransferDto[] }> {
    const rows = await SalaryCardTransfer.findAll({
      order: [
        ['instructorName', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return { items: rows.map((row) => cardTransferDto(row)) };
  }

  static async createCardTransfer(
    input: CreateSalaryCardTransferInput,
    createdByUserId?: number,
  ): Promise<SalaryCardTransferDto> {
    const amount = Math.round(input.amountAmd);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new InputValidationError(
        'Amount must be a positive number',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const instructor = await User.findByPk(input.instructorUserId, { attributes: ['id', 'name'] });
    if (!instructor) {
      throw new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const existing = await SalaryCardTransfer.findOne({
      where: { instructorUserId: input.instructorUserId },
    });
    if (existing) {
      throw new InputValidationError(
        'This instructor already has a card transfer setting',
        HttpStatusCodesUtil.CONFLICT,
      );
    }
    const row = await SalaryCardTransfer.create({
      instructorUserId: input.instructorUserId,
      instructorName: instructor.name?.trim() || `Instructor #${instructor.id}`,
      amountAmd: amount,
      autoMonthly: input.autoMonthly !== false,
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });
    return cardTransferDto(row);
  }

  static async updateCardTransfer(
    id: number,
    input: UpdateSalaryCardTransferInput,
  ): Promise<SalaryCardTransferDto> {
    const row = await SalaryCardTransfer.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Card transfer not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const amount = Math.round(input.amountAmd);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new InputValidationError(
        'Amount must be a positive number',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const instructor = await User.findByPk(input.instructorUserId, { attributes: ['id', 'name'] });
    if (!instructor) {
      throw new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (input.instructorUserId !== row.instructorUserId) {
      const clash = await SalaryCardTransfer.findOne({
        where: { instructorUserId: input.instructorUserId },
      });
      if (clash) {
        throw new InputValidationError(
          'This instructor already has a card transfer setting',
          HttpStatusCodesUtil.CONFLICT,
        );
      }
    }
    await row.update({
      instructorUserId: input.instructorUserId,
      instructorName: instructor.name?.trim() || `Instructor #${instructor.id}`,
      amountAmd: amount,
      autoMonthly: input.autoMonthly !== false,
      notes: input.notes?.trim() || null,
    });
    return cardTransferDto(row);
  }

  static async removeCardTransfer(id: number): Promise<void> {
    const n = await SalaryCardTransfer.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Card transfer not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }
}
