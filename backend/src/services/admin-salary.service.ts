import { Op } from 'sequelize';
import {
  EmployeeCompensationRule,
  InstructorProfile,
  SalaryAdjustment,
  SalaryCardTransfer,
  SalaryPayment,
  StaffEmployee,
  TheoryCohort,
  TheoryCohortSession,
  User,
} from '../models';
import type { CompensationType } from '../models/employee-compensation-rule.model';
import type { SalaryAdjustmentKind } from '../models/salary-adjustment.model';
import type { SalaryPaymentKind, SalaryPaymentStatus } from '../models/salary-payment.model';
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

export type PayrollStatus = 'calculated' | 'approved' | 'paid';

export type SalaryCalcLineDto = {
  ruleId: number | null;
  compensationType: CompensationType | 'adjustment';
  roleLabel: string;
  quantity: number;
  rateAmd: number;
  subtotalAmd: number;
  description: string;
};

export type SalaryReportRowDto = {
  /** @deprecated Prefer employee-aggregated fields; kept for older clients. */
  kind: SalaryEmployeeKind;
  employeeUserId: number;
  employeeName: string;
  lessonsCount: number;
  unpaidLessonsCount: number;
  partialUnpaidLessonsCount: number;
  excludedLessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  cardTransferAmd: number | null;
  paid: {
    paymentId: number;
    title: string;
    periodStartIso: string;
    periodEndIso: string;
    lessonsCount: number | null;
    totalAmd: number;
    paidAtIso: string;
    status: SalaryPaymentStatus;
  } | null;
};

export type SalaryEmployeeReportRowDto = {
  employeeUserId: number;
  employeeName: string;
  fixedAmd: number;
  hoursCount: number;
  hoursAmd: number;
  lessonsCount: number;
  lessonsAmd: number;
  groupsCount: number;
  groupsAmd: number;
  adjustmentsAmd: number;
  totalAmd: number;
  cardTransferAmd: number | null;
  unpaidHoursCount: number;
  status: PayrollStatus;
  paid: SalaryReportRowDto['paid'];
  lines: SalaryCalcLineDto[];
};

export type SalaryReportDto = {
  startDate: string;
  endDate: string;
  instructorRateAmd: number;
  theoryTeacherRateAmd: number;
  /** Legacy kind-split rows (practical / theory) for compatibility. */
  rows: SalaryReportRowDto[];
  /** One row per employee with multi-rule totals. */
  employees: SalaryEmployeeReportRowDto[];
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
  status: SalaryPaymentStatus;
  breakdown: SalaryCalcLineDto[] | null;
  notes: string | null;
  createdAtIso: string;
  createdByName: string | null;
};

export type SalaryLessonRowDto = {
  id: number;
  bookingId: number | null;
  dateIso: string;
  startTime: string;
  endTime: string | null;
  units: number;
  label: string;
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
  graphic: number;
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

export type CreatePayrollSalaryInput = {
  kind: 'payroll';
  employeeUserId: number;
  title: string;
  periodStart: string;
  periodEnd: string;
  status?: SalaryPaymentStatus;
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

export type CompensationRuleDto = {
  id: number;
  staffEmployeeId: number | null;
  employeeUserId: number | null;
  employeeName: string;
  compensationType: CompensationType;
  roleLabel: string;
  rateAmd: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAtIso: string;
};

export type CreateCompensationRuleInput = {
  staffEmployeeId: number;
  compensationType: CompensationType;
  roleLabel: string;
  rateAmd: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
};

export type UpdateCompensationRuleInput = {
  roleLabel?: string;
  rateAmd?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  notes?: string | null;
};

export type SalaryAdjustmentDto = {
  id: number;
  employeeUserId: number;
  employeeName: string;
  dateIso: string;
  kind: SalaryAdjustmentKind;
  amountAmd: number;
  signedAmd: number;
  title: string;
  notes: string | null;
  createdAtIso: string;
};

export type CreateSalaryAdjustmentInput = {
  employeeUserId: number;
  dateIso: string;
  kind: SalaryAdjustmentKind;
  amountAmd: number;
  title: string;
  notes?: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_ROLE_LABEL: Record<CompensationType, string> = {
  fixed_monthly: 'Ամսական',
  hourly_practical: 'Հրահանգիչ',
  per_theory_lesson: 'Տեսության դասախոս',
  per_group: 'Խումբ',
};

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

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function daysInMonthUtc(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function eachDayInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

function ruleActiveOn(rule: EmployeeCompensationRule, dayIso: string): boolean {
  const from = String(rule.effectiveFrom).slice(0, 10);
  const to = rule.effectiveTo != null ? String(rule.effectiveTo).slice(0, 10) : null;
  if (dayIso < from) return false;
  if (to != null && dayIso > to) return false;
  return true;
}

function rateOnDay(
  rules: EmployeeCompensationRule[],
  type: CompensationType,
  dayIso: string,
): { rateAmd: number; rule: EmployeeCompensationRule } | null {
  const matches = rules
    .filter((r) => r.compensationType === type && ruleActiveOn(r, dayIso))
    .sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)) || b.id - a.id);
  const rule = matches[0];
  if (!rule) return null;
  return { rateAmd: rule.rateAmd, rule };
}

function adjustmentSigned(kind: SalaryAdjustmentKind, amountAmd: number): number {
  return kind === 'deduction' ? -Math.abs(amountAmd) : Math.abs(amountAmd);
}

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

function parseBreakdownJson(raw: string | null | undefined): SalaryCalcLineDto[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SalaryCalcLineDto[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
    status: row.status ?? 'paid',
    breakdown: parseBreakdownJson(row.breakdownJson),
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

type PracticalHourPoint = { dateIso: string; units: number; unpaid: number };

/** Practical lesson slot breakdown per instructor in the date range. */
async function practicalLessonBreakdowns(
  start: string,
  end: string,
): Promise<Map<number, PracticalLessonBreakdown>> {
  const points = await practicalHourPoints(start, end);
  const counts = new Map<number, PracticalLessonBreakdown>();
  for (const [id, list] of points) {
    const row = emptyBreakdown();
    for (const p of list) {
      row.graphic += p.units;
      row.unpaid += p.unpaid;
    }
    counts.set(id, row);
  }
  return counts;
}

async function practicalHourPoints(
  start: string,
  end: string,
  instructorUserId?: number,
): Promise<Map<number, PracticalHourPoint[]>> {
  const query = {
    startDate: start,
    endDate: end,
    lessonTypes: ['practical'] as const,
    bookingStatuses: SLOT_RESERVING_BOOKING_STATUSES,
    ...(instructorUserId != null ? { instructorUserId } : {}),
  };
  const [slots, legacyBookings] = await Promise.all([
    findSlotsInDateRange(query),
    findLegacyBookingsWithoutSlots(query),
  ]);
  const map = new Map<number, PracticalHourPoint[]>();
  const push = (iid: number, point: PracticalHourPoint) => {
    const list = map.get(iid) ?? [];
    list.push(point);
    map.set(iid, list);
  };
  for (const slot of slots) {
    if (!salarySlotOccupiesGraphic(slot.booking)) continue;
    const payment = salaryGraphicPaymentStanding(slot.booking, slot);
    push(slot.instructorUserId, {
      dateIso: slot.dateIso,
      units: 1,
      unpaid: payment === 'unpaid' ? 1 : 0,
    });
  }
  for (const row of legacyBookings) {
    if (!salarySlotOccupiesGraphic(row)) continue;
    const payment = legacyGraphicPaymentStanding(row);
    const iid = row.instructorUserId as number;
    const d = String(row.dateIso).slice(0, 10);
    const units = slotCountFromTimeRange(d, String(row.time), row.endTime);
    push(iid, {
      dateIso: d,
      units,
      unpaid: payment === 'unpaid' ? units : 0,
    });
  }
  return map;
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

type TheorySessionPoint = {
  sessionId: number;
  cohortId: number;
  cohortName: string;
  dateIso: string;
};

async function theorySessionPoints(
  start: string,
  end: string,
  instructorUserId?: number,
): Promise<Map<number, TheorySessionPoint[]>> {
  const now = new Date();
  const sessions = await TheoryCohortSession.findAll({
    where: {
      dateIso: { [Op.between]: [start, end] },
      instructorUserId:
        instructorUserId != null ? instructorUserId : { [Op.ne]: null },
    },
    include: [{ model: TheoryCohort, as: 'cohort', required: false, attributes: ['id', 'name'] }],
  });
  const map = new Map<number, TheorySessionPoint[]>();
  for (const session of sessions) {
    if (!sessionCountsForSalary(session, now)) continue;
    const iid = session.instructorUserId as number;
    const cohort = session.get('cohort') as TheoryCohort | null | undefined;
    const list = map.get(iid) ?? [];
    list.push({
      sessionId: session.id,
      cohortId: session.cohortId,
      cohortName: cohort?.name?.trim() || `Group #${session.cohortId}`,
      dateIso: String(session.dateIso).slice(0, 10),
    });
    map.set(iid, list);
  }
  return map;
}

/** Completed group-theory sessions per teacher in the date range. */
async function theoryLessonCounts(start: string, end: string): Promise<Map<number, number>> {
  const points = await theorySessionPoints(start, end);
  const counts = new Map<number, number>();
  for (const [id, list] of points) {
    if (list.length > 0) counts.set(id, list.length);
  }
  return counts;
}

async function overlappingPayments(
  start: string,
  end: string,
): Promise<{ byKind: Map<string, SalaryPayment>; byEmployee: Map<number, SalaryPayment> }> {
  const rows = await SalaryPayment.findAll({
    where: {
      employeeUserId: { [Op.ne]: null },
      periodStartIso: { [Op.lte]: end },
      periodEndIso: { [Op.gte]: start },
    },
    order: [['id', 'ASC']],
  });
  const byKind = new Map<string, SalaryPayment>();
  const byEmployee = new Map<number, SalaryPayment>();
  for (const row of rows) {
    if (row.employeeUserId == null) continue;
    if (row.kind === 'instructor' || row.kind === 'theory_teacher') {
      byKind.set(`${row.kind}:${row.employeeUserId}`, row);
    }
    const prev = byEmployee.get(row.employeeUserId);
    // Prefer payroll, then paid over approved, then latest id.
    if (!prev) {
      byEmployee.set(row.employeeUserId, row);
      continue;
    }
    const score = (p: SalaryPayment) =>
      (p.kind === 'payroll' ? 4 : 0) + (p.status === 'paid' ? 2 : 1) + p.id / 1e9;
    if (score(row) >= score(prev)) byEmployee.set(row.employeeUserId, row);
  }
  return { byKind, byEmployee };
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

function paidDtoFromRow(paidRow: SalaryPayment): NonNullable<SalaryReportRowDto['paid']> {
  return {
    paymentId: paidRow.id,
    title: paidRow.title,
    periodStartIso: String(paidRow.periodStartIso).slice(0, 10),
    periodEndIso: String(paidRow.periodEndIso).slice(0, 10),
    lessonsCount: paidRow.lessonsCount ?? null,
    totalAmd: paidRow.totalAmd,
    paidAtIso:
      (paidRow as SalaryPayment & { createdAt?: Date }).createdAt?.toISOString() ??
      new Date().toISOString(),
    status: paidRow.status ?? 'paid',
  };
}

function payrollStatusFromPayment(paid: SalaryPayment | null | undefined): PayrollStatus {
  if (!paid) return 'calculated';
  return paid.status === 'approved' ? 'approved' : 'paid';
}

type EmployeeCalcBundle = {
  lines: SalaryCalcLineDto[];
  fixedAmd: number;
  hoursCount: number;
  hoursAmd: number;
  lessonsCount: number;
  lessonsAmd: number;
  groupsCount: number;
  groupsAmd: number;
  adjustmentsAmd: number;
  unpaidHoursCount: number;
  totalAmd: number;
};

async function loadRulesForEmployees(
  employeeIds: number[],
  start: string,
  end: string,
): Promise<Map<number, EmployeeCompensationRule[]>> {
  const map = new Map<number, EmployeeCompensationRule[]>();
  if (employeeIds.length === 0) return map;
  const rows = await EmployeeCompensationRule.findAll({
    where: {
      employeeUserId: { [Op.in]: employeeIds },
      effectiveFrom: { [Op.lte]: end },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }],
    },
    order: [
      ['employeeUserId', 'ASC'],
      ['compensationType', 'ASC'],
      ['effectiveFrom', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  for (const row of rows) {
    if (row.employeeUserId == null || row.employeeUserId <= 0) continue;
    const uid = row.employeeUserId;
    const list = map.get(uid) ?? [];
    list.push(row);
    map.set(uid, list);
  }
  return map;
}

async function loadAdjustmentsInRange(
  start: string,
  end: string,
): Promise<Map<number, SalaryAdjustment[]>> {
  const rows = await SalaryAdjustment.findAll({
    where: { dateIso: { [Op.between]: [start, end] } },
    order: [
      ['dateIso', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const map = new Map<number, SalaryAdjustment[]>();
  for (const row of rows) {
    const list = map.get(row.employeeUserId) ?? [];
    list.push(row);
    map.set(row.employeeUserId, list);
  }
  return map;
}

function calculateEmployeeBundle(input: {
  rules: EmployeeCompensationRule[];
  hourPoints: PracticalHourPoint[];
  theoryPoints: TheorySessionPoint[];
  adjustments: SalaryAdjustment[];
  start: string;
  end: string;
  fallbackPracticalRate: number;
  fallbackTheoryRate: number;
}): EmployeeCalcBundle {
  const {
    rules,
    hourPoints,
    theoryPoints,
    adjustments,
    start,
    end,
    fallbackPracticalRate,
    fallbackTheoryRate,
  } = input;

  const lines: SalaryCalcLineDto[] = [];
  let fixedAmd = 0;
  let hoursCount = 0;
  let hoursAmd = 0;
  let lessonsCount = 0;
  let lessonsAmd = 0;
  let groupsCount = 0;
  let groupsAmd = 0;
  let unpaidHoursCount = 0;

  const hasHourlyRule = rules.some((r) => r.compensationType === 'hourly_practical');
  const hasLessonRule = rules.some((r) => r.compensationType === 'per_theory_lesson');
  const hasGroupRule = rules.some((r) => r.compensationType === 'per_group');
  const hasFixedRule = rules.some((r) => r.compensationType === 'fixed_monthly');

  // Fixed monthly: day-prorate using the rate effective on each day.
  if (hasFixedRule) {
    let sum = 0;
    let daysPaid = 0;
    let lastRate: number | null = null;
    let lastRule: EmployeeCompensationRule | null = null;
    for (const day of eachDayInclusive(start, end)) {
      const hit = rateOnDay(rules, 'fixed_monthly', day);
      if (!hit) continue;
      sum += hit.rateAmd / daysInMonthUtc(day);
      daysPaid += 1;
      lastRate = hit.rateAmd;
      lastRule = hit.rule;
    }
    fixedAmd = Math.round(sum);
    if (fixedAmd > 0 && lastRule && lastRate != null) {
      lines.push({
        ruleId: lastRule.id,
        compensationType: 'fixed_monthly',
        roleLabel: lastRule.roleLabel || DEFAULT_ROLE_LABEL.fixed_monthly,
        quantity: daysPaid,
        rateAmd: lastRate,
        subtotalAmd: fixedAmd,
        description: `Ամսական դրույք՝ ${daysPaid} օր (համամասնորեն)`,
      });
    }
  }

  // Hourly practical from real graphic slots.
  if (hourPoints.length > 0) {
    const byRate = new Map<string, { rule: EmployeeCompensationRule | null; qty: number; rate: number }>();
    for (const p of hourPoints) {
      hoursCount += p.units;
      unpaidHoursCount += p.unpaid;
      const hit = rateOnDay(rules, 'hourly_practical', p.dateIso);
      const rate = hit?.rateAmd ?? (hasHourlyRule ? 0 : fallbackPracticalRate);
      if (rate <= 0) continue;
      const key = `${hit?.rule.id ?? 'legacy'}:${rate}`;
      const agg = byRate.get(key) ?? { rule: hit?.rule ?? null, qty: 0, rate };
      agg.qty += p.units;
      byRate.set(key, agg);
    }
    for (const agg of byRate.values()) {
      const sub = Math.round(agg.qty * agg.rate);
      hoursAmd += sub;
      lines.push({
        ruleId: agg.rule?.id ?? null,
        compensationType: 'hourly_practical',
        roleLabel: agg.rule?.roleLabel || DEFAULT_ROLE_LABEL.hourly_practical,
        quantity: agg.qty,
        rateAmd: agg.rate,
        subtotalAmd: sub,
        description: `${agg.qty} ժամ × ${agg.rate} AMD`,
      });
    }
  }

  // Per theory lesson from cohort sessions.
  // If only per_group is configured (no per_theory_lesson), skip session-based pay.
  const useLegacyTheory = !hasLessonRule && !hasGroupRule;
  if (theoryPoints.length > 0 && (hasLessonRule || useLegacyTheory)) {
    const byRate = new Map<string, { rule: EmployeeCompensationRule | null; qty: number; rate: number }>();
    for (const p of theoryPoints) {
      lessonsCount += 1;
      const hit = rateOnDay(rules, 'per_theory_lesson', p.dateIso);
      const rate = hit?.rateAmd ?? (hasLessonRule ? 0 : fallbackTheoryRate);
      if (rate <= 0) continue;
      const key = `${hit?.rule.id ?? 'legacy'}:${rate}`;
      const agg = byRate.get(key) ?? { rule: hit?.rule ?? null, qty: 0, rate };
      agg.qty += 1;
      byRate.set(key, agg);
    }
    for (const agg of byRate.values()) {
      const sub = Math.round(agg.qty * agg.rate);
      lessonsAmd += sub;
      lines.push({
        ruleId: agg.rule?.id ?? null,
        compensationType: 'per_theory_lesson',
        roleLabel: agg.rule?.roleLabel || DEFAULT_ROLE_LABEL.per_theory_lesson,
        quantity: agg.qty,
        rateAmd: agg.rate,
        subtotalAmd: sub,
        description: `${agg.qty} տեսության դաս × ${agg.rate} AMD`,
      });
    }
  }

  // Per group: distinct cohorts with ≥1 salary-counting session in the period.
  if (hasGroupRule && theoryPoints.length > 0) {
    const firstByCohort = new Map<number, TheorySessionPoint>();
    for (const p of theoryPoints) {
      const prev = firstByCohort.get(p.cohortId);
      if (!prev || p.dateIso < prev.dateIso) firstByCohort.set(p.cohortId, p);
    }
    const byRate = new Map<
      string,
      { rule: EmployeeCompensationRule | null; qty: number; rate: number; names: string[] }
    >();
    for (const p of firstByCohort.values()) {
      const hit = rateOnDay(rules, 'per_group', p.dateIso);
      if (!hit) continue;
      groupsCount += 1;
      const key = `${hit.rule.id}:${hit.rateAmd}`;
      const agg = byRate.get(key) ?? { rule: hit.rule, qty: 0, rate: hit.rateAmd, names: [] };
      agg.qty += 1;
      agg.names.push(p.cohortName);
      byRate.set(key, agg);
    }
    for (const agg of byRate.values()) {
      const sub = Math.round(agg.qty * agg.rate);
      groupsAmd += sub;
      lines.push({
        ruleId: agg.rule?.id ?? null,
        compensationType: 'per_group',
        roleLabel: agg.rule?.roleLabel || DEFAULT_ROLE_LABEL.per_group,
        quantity: agg.qty,
        rateAmd: agg.rate,
        subtotalAmd: sub,
        description: `${agg.qty} խումբ × ${agg.rate} AMD (${agg.names.slice(0, 4).join(', ')}${agg.names.length > 4 ? '…' : ''})`,
      });
    }
  }

  let adjustmentsAmd = 0;
  for (const adj of adjustments) {
    const signed = adjustmentSigned(adj.kind, adj.amountAmd);
    adjustmentsAmd += signed;
    lines.push({
      ruleId: null,
      compensationType: 'adjustment',
      roleLabel: adj.title || adj.kind,
      quantity: 1,
      rateAmd: adj.amountAmd,
      subtotalAmd: signed,
      description: `${adj.kind}: ${adj.title}`,
    });
  }

  const totalAmd = Math.max(0, fixedAmd + hoursAmd + lessonsAmd + groupsAmd + adjustmentsAmd);

  return {
    lines,
    fixedAmd,
    hoursCount,
    hoursAmd,
    lessonsCount,
    lessonsAmd,
    groupsCount,
    groupsAmd,
    adjustmentsAmd,
    unpaidHoursCount,
    totalAmd,
  };
}

function ruleToDto(row: EmployeeCompensationRule, employeeName: string): CompensationRuleDto {
  const createdAt = (row as EmployeeCompensationRule & { createdAt?: Date }).createdAt;
  return {
    id: row.id,
    staffEmployeeId: row.staffEmployeeId ?? null,
    employeeUserId: row.employeeUserId ?? null,
    employeeName,
    compensationType: row.compensationType,
    roleLabel: row.roleLabel,
    rateAmd: row.rateAmd,
    effectiveFrom: String(row.effectiveFrom).slice(0, 10),
    effectiveTo: row.effectiveTo != null ? String(row.effectiveTo).slice(0, 10) : null,
    notes: row.notes ?? null,
    createdAtIso: createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

function adjustmentToDto(row: SalaryAdjustment): SalaryAdjustmentDto {
  const createdAt = (row as SalaryAdjustment & { createdAt?: Date }).createdAt;
  return {
    id: row.id,
    employeeUserId: row.employeeUserId,
    employeeName: row.employeeName,
    dateIso: String(row.dateIso).slice(0, 10),
    kind: row.kind,
    amountAmd: row.amountAmd,
    signedAmd: adjustmentSigned(row.kind, row.amountAmd),
    title: row.title,
    notes: row.notes ?? null,
    createdAtIso: createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * When instructor profile salary rates change, close the open rule and open a new one
 * so historical payroll keeps the previous rate.
 */
export async function syncCompensationRuleRate(input: {
  employeeUserId: number;
  compensationType: 'hourly_practical' | 'per_theory_lesson';
  rateAmd: number;
  roleLabel: string;
  asOfIso?: string;
}): Promise<void> {
  const asOf = input.asOfIso && DATE_RE.test(input.asOfIso) ? input.asOfIso : yerevanTodayIso();
  const open = await EmployeeCompensationRule.findAll({
    where: {
      employeeUserId: input.employeeUserId,
      compensationType: input.compensationType,
      effectiveTo: null,
    },
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
  });
  const current = open[0];
  if (current && current.rateAmd === input.rateAmd) return;

  if (current) {
    const closeTo = addDaysIso(asOf, -1);
    if (String(current.effectiveFrom).slice(0, 10) <= closeTo) {
      await current.update({ effectiveTo: closeTo });
    } else {
      await current.update({ rateAmd: input.rateAmd, roleLabel: input.roleLabel });
      return;
    }
  }

  await EmployeeCompensationRule.create({
    staffEmployeeId:
      (
        await StaffEmployee.findOne({
          where: { userId: input.employeeUserId },
          attributes: ['id'],
        })
      )?.id ?? null,
    employeeUserId: input.employeeUserId,
    compensationType: input.compensationType,
    roleLabel: input.roleLabel,
    rateAmd: input.rateAmd,
    effectiveFrom: asOf,
    effectiveTo: null,
    notes: 'Synced from instructor profile rate change',
  });
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

    const [hourPoints, theoryPoints, payments, cardByInstructor, adjustmentsByEmployee] =
      await Promise.all([
        practicalHourPoints(start, end),
        theorySessionPoints(start, end),
        overlappingPayments(start, end),
        autoCardAmountsByInstructor(),
        loadAdjustmentsInRange(start, end),
      ]);

    const ruleUserIds = [
      ...new Set(
        (
          await EmployeeCompensationRule.findAll({
            attributes: ['employeeUserId'],
            where: {
              employeeUserId: { [Op.ne]: null },
              effectiveFrom: { [Op.lte]: end },
              [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }],
            },
          })
        )
          .map((r) => r.employeeUserId)
          .filter((id): id is number => id != null && id > 0),
      ),
    ];

    const userIds = [
      ...new Set([
        ...hourPoints.keys(),
        ...theoryPoints.keys(),
        ...adjustmentsByEmployee.keys(),
        ...ruleUserIds,
      ]),
    ];

    const [users, salaryRates, rulesByEmployee] = await Promise.all([
      userIds.length > 0
        ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name'] })
        : Promise.resolve([] as User[]),
      salaryRatesByInstructorIds(userIds),
      loadRulesForEmployees(userIds, start, end),
    ]);
    const nameById = new Map(users.map((u) => [u.id, u.name?.trim() || `Employee #${u.id}`]));

    const employees: SalaryEmployeeReportRowDto[] = [];
    const legacyRows: SalaryReportRowDto[] = [];

    for (const employeeUserId of userIds) {
      const rules = rulesByEmployee.get(employeeUserId) ?? [];
      const hours = hourPoints.get(employeeUserId) ?? [];
      const theory = theoryPoints.get(employeeUserId) ?? [];
      const adjs = adjustmentsByEmployee.get(employeeUserId) ?? [];
      const rates = salaryRates.get(employeeUserId);

      // Skip employees with nothing to show and no fixed/adjustment rules.
      const hasFixed = rules.some((r) => r.compensationType === 'fixed_monthly');
      if (hours.length === 0 && theory.length === 0 && adjs.length === 0 && !hasFixed) {
        continue;
      }

      const bundle = calculateEmployeeBundle({
        rules,
        hourPoints: hours,
        theoryPoints: theory,
        adjustments: adjs,
        start,
        end,
        fallbackPracticalRate: rates?.practical ?? INSTRUCTOR_LESSON_RATE_AMD,
        fallbackTheoryRate: rates?.theory ?? THEORY_TEACHER_LESSON_RATE_AMD,
      });

      if (bundle.totalAmd <= 0 && bundle.hoursCount <= 0 && bundle.lessonsCount <= 0 && bundle.groupsCount <= 0) {
        if (!hasFixed && adjs.length === 0) continue;
      }

      const paidRow = payments.byEmployee.get(employeeUserId) ?? null;
      const paid = paidRow ? paidDtoFromRow(paidRow) : null;
      const cardAmt = cardByInstructor.get(employeeUserId) ?? null;
      const employeeName = nameById.get(employeeUserId) ?? `Employee #${employeeUserId}`;

      employees.push({
        employeeUserId,
        employeeName,
        fixedAmd: bundle.fixedAmd,
        hoursCount: bundle.hoursCount,
        hoursAmd: bundle.hoursAmd,
        lessonsCount: bundle.lessonsCount,
        lessonsAmd: bundle.lessonsAmd,
        groupsCount: bundle.groupsCount,
        groupsAmd: bundle.groupsAmd,
        adjustmentsAmd: bundle.adjustmentsAmd,
        totalAmd: bundle.totalAmd,
        cardTransferAmd: cardAmt != null && cardAmt > 0 ? cardAmt : null,
        unpaidHoursCount: bundle.unpaidHoursCount,
        status: payrollStatusFromPayment(paidRow),
        paid,
        lines: bundle.lines,
      });

      // Legacy kind rows for older UIs / exports.
      if (bundle.hoursCount > 0) {
        const kindPaid = payments.byKind.get(`instructor:${employeeUserId}`) ?? paidRow;
        const rate =
          bundle.lines.find((l) => l.compensationType === 'hourly_practical')?.rateAmd ??
          rates?.practical ??
          INSTRUCTOR_LESSON_RATE_AMD;
        legacyRows.push({
          kind: 'instructor',
          employeeUserId,
          employeeName,
          lessonsCount: bundle.hoursCount,
          unpaidLessonsCount: bundle.unpaidHoursCount,
          partialUnpaidLessonsCount: 0,
          excludedLessonsCount: 0,
          ratePerLessonAmd: rate,
          totalAmd: bundle.hoursAmd,
          cardTransferAmd: cardAmt != null && cardAmt > 0 ? cardAmt : null,
          paid: kindPaid ? paidDtoFromRow(kindPaid) : null,
        });
      }
      if (bundle.lessonsCount > 0) {
        const kindPaid = payments.byKind.get(`theory_teacher:${employeeUserId}`) ?? paidRow;
        const rate =
          bundle.lines.find((l) => l.compensationType === 'per_theory_lesson')?.rateAmd ??
          rates?.theory ??
          THEORY_TEACHER_LESSON_RATE_AMD;
        legacyRows.push({
          kind: 'theory_teacher',
          employeeUserId,
          employeeName,
          lessonsCount: bundle.lessonsCount,
          unpaidLessonsCount: 0,
          partialUnpaidLessonsCount: 0,
          excludedLessonsCount: 0,
          ratePerLessonAmd: rate,
          totalAmd: bundle.lessonsAmd,
          cardTransferAmd: cardAmt != null && cardAmt > 0 ? cardAmt : null,
          paid: kindPaid ? paidDtoFromRow(kindPaid) : null,
        });
      }
    }

    employees.sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'hy'));
    legacyRows.sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.employeeName.localeCompare(b.employeeName, 'hy'),
    );

    // Fixed-salary staff without a login account (custom employees).
    const fixedOnlyRules = await EmployeeCompensationRule.findAll({
      where: {
        employeeUserId: null,
        compensationType: 'fixed_monthly',
        effectiveFrom: { [Op.lte]: end },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }],
      },
      include: [{ model: StaffEmployee, as: 'staffEmployee', required: true }],
    });
    const byStaff = new Map<number, EmployeeCompensationRule[]>();
    for (const r of fixedOnlyRules) {
      if (r.staffEmployeeId == null) continue;
      const list = byStaff.get(r.staffEmployeeId) ?? [];
      list.push(r);
      byStaff.set(r.staffEmployeeId, list);
    }
    for (const [staffId, rules] of byStaff) {
      const staff = rules[0]?.get('staffEmployee') as StaffEmployee | undefined;
      if (!staff || !staff.isActive) continue;
      const bundle = calculateEmployeeBundle({
        rules,
        hourPoints: [],
        theoryPoints: [],
        adjustments: [],
        start,
        end,
        fallbackPracticalRate: INSTRUCTOR_LESSON_RATE_AMD,
        fallbackTheoryRate: THEORY_TEACHER_LESSON_RATE_AMD,
      });
      if (bundle.totalAmd <= 0 && bundle.fixedAmd <= 0) continue;
      employees.push({
        employeeUserId: -staffId,
        employeeName: staff.name,
        fixedAmd: bundle.fixedAmd,
        hoursCount: 0,
        hoursAmd: 0,
        lessonsCount: 0,
        lessonsAmd: 0,
        groupsCount: 0,
        groupsAmd: 0,
        adjustmentsAmd: 0,
        totalAmd: bundle.totalAmd,
        cardTransferAmd: null,
        unpaidHoursCount: 0,
        status: 'calculated',
        paid: null,
        lines: bundle.lines,
      });
    }
    employees.sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'hy'));

    return {
      startDate: start,
      endDate: end,
      instructorRateAmd: INSTRUCTOR_LESSON_RATE_AMD,
      theoryTeacherRateAmd: THEORY_TEACHER_LESSON_RATE_AMD,
      rows: legacyRows,
      employees,
    };
  }

  static async employeeDetail(
    employeeUserId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<SalaryEmployeeReportRowDto> {
    const report = await this.report(startDate, endDate);
    const row = report.employees.find((e) => e.employeeUserId === employeeUserId);
    if (!row) {
      const user = await User.findByPk(employeeUserId, { attributes: ['id', 'name'] });
      if (!user) {
        throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
      }
      return {
        employeeUserId,
        employeeName: user.name?.trim() || `Employee #${employeeUserId}`,
        fixedAmd: 0,
        hoursCount: 0,
        hoursAmd: 0,
        lessonsCount: 0,
        lessonsAmd: 0,
        groupsCount: 0,
        groupsAmd: 0,
        adjustmentsAmd: 0,
        totalAmd: 0,
        cardTransferAmd: null,
        unpaidHoursCount: 0,
        status: 'calculated',
        paid: null,
        lines: [],
      };
    }
    return row;
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
      status: 'paid',
      breakdownJson: null,
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    return paymentRowToDto(row);
  }

  static async createPayrollPayment(
    input: CreatePayrollSalaryInput,
    createdByUserId?: number,
  ): Promise<SalaryPaymentDto> {
    const { start, end } = parseDateRange(input.periodStart, input.periodEnd);
    const status: SalaryPaymentStatus = input.status === 'approved' ? 'approved' : 'paid';

    const employee = await User.findByPk(input.employeeUserId, { attributes: ['id', 'name'] });
    if (!employee) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    const existing = await SalaryPayment.findOne({
      where: {
        employeeUserId: input.employeeUserId,
        periodStartIso: { [Op.lte]: end },
        periodEndIso: { [Op.gte]: start },
        kind: { [Op.in]: ['payroll', 'instructor', 'theory_teacher'] },
      },
    });
    if (existing) {
      throw new InputValidationError(
        'A salary payment for this employee already overlaps this period',
        HttpStatusCodesUtil.CONFLICT,
      );
    }

    const detail = await this.employeeDetail(input.employeeUserId, start, end);
    if (detail.totalAmd <= 0) {
      throw new InputValidationError(
        'Calculated salary is zero for this employee in the selected period',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const row = await SalaryPayment.create({
      title: input.title.trim(),
      kind: 'payroll',
      employeeUserId: input.employeeUserId,
      employeeName: employee.name?.trim() || `Employee #${employee.id}`,
      periodStartIso: start,
      periodEndIso: end,
      lessonsCount: detail.hoursCount + detail.lessonsCount,
      ratePerLessonAmd: null,
      totalAmd: detail.totalAmd,
      status,
      breakdownJson: JSON.stringify(detail.lines),
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    return paymentRowToDto(row);
  }

  static async markPaymentPaid(id: number): Promise<SalaryPaymentDto> {
    const row = await SalaryPayment.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Salary payment not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    await row.update({ status: 'paid' });
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
      status: 'paid',
      breakdownJson: null,
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

  static async listCompensationRules(staffEmployeeId?: number): Promise<{ items: CompensationRuleDto[] }> {
    const where =
      staffEmployeeId != null && Number.isFinite(staffEmployeeId) && staffEmployeeId > 0
        ? { staffEmployeeId }
        : {};
    const rows = await EmployeeCompensationRule.findAll({
      where,
      order: [
        ['staffEmployeeId', 'ASC'],
        ['compensationType', 'ASC'],
        ['effectiveFrom', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [
        { model: StaffEmployee, as: 'staffEmployee', required: false, attributes: ['id', 'name'] },
        { model: User, as: 'employee', required: false, attributes: ['id', 'name'] },
      ],
    });
    return {
      items: rows.map((row) => {
        const staff = row.get('staffEmployee') as StaffEmployee | null | undefined;
        const emp = row.get('employee') as User | null | undefined;
        const name =
          staff?.name?.trim() ||
          emp?.name?.trim() ||
          (row.employeeUserId != null ? `Employee #${row.employeeUserId}` : `Rule #${row.id}`);
        return ruleToDto(row, name);
      }),
    };
  }

  static async createCompensationRule(
    input: CreateCompensationRuleInput,
    createdByUserId?: number,
  ): Promise<CompensationRuleDto> {
    if (!DATE_RE.test(input.effectiveFrom)) {
      throw new InputValidationError('Invalid effectiveFrom', HttpStatusCodesUtil.BAD_REQUEST);
    }
    if (input.effectiveTo != null && input.effectiveTo !== '' && !DATE_RE.test(input.effectiveTo)) {
      throw new InputValidationError('Invalid effectiveTo', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const rate = Math.round(input.rateAmd);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new InputValidationError('Rate must be positive', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const staff = await StaffEmployee.findByPk(input.staffEmployeeId);
    if (!staff) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }

    const needsAccount =
      input.compensationType === 'hourly_practical' ||
      input.compensationType === 'per_theory_lesson' ||
      input.compensationType === 'per_group';
    if (needsAccount && (staff.userId == null || staff.userId <= 0)) {
      throw new InputValidationError(
        'This pay type needs an employee linked to an instructor account',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const effectiveTo =
      input.effectiveTo && DATE_RE.test(input.effectiveTo) ? input.effectiveTo : null;
    if (effectiveTo && effectiveTo < input.effectiveFrom) {
      throw new InputValidationError(
        'End date must be on or after start date',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    if (effectiveTo == null) {
      const open = await EmployeeCompensationRule.findAll({
        where: {
          staffEmployeeId: input.staffEmployeeId,
          compensationType: input.compensationType,
          effectiveTo: null,
        },
      });
      const closeTo = addDaysIso(input.effectiveFrom, -1);
      for (const r of open) {
        if (String(r.effectiveFrom).slice(0, 10) <= closeTo) {
          await r.update({ effectiveTo: closeTo });
        }
      }
    }

    const row = await EmployeeCompensationRule.create({
      staffEmployeeId: staff.id,
      employeeUserId: staff.userId ?? null,
      compensationType: input.compensationType,
      roleLabel: input.roleLabel.trim() || DEFAULT_ROLE_LABEL[input.compensationType],
      rateAmd: rate,
      effectiveFrom: input.effectiveFrom,
      effectiveTo,
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });

    if (effectiveTo == null && staff.userId != null) {
      const profile = await InstructorProfile.findOne({ where: { userId: staff.userId } });
      if (profile) {
        if (input.compensationType === 'hourly_practical') {
          await profile.update({ practicalSalaryPerLessonAmd: rate });
        } else if (input.compensationType === 'per_theory_lesson') {
          await profile.update({ theorySalaryPerLessonAmd: rate });
        }
      }
    }

    return ruleToDto(row, staff.name);
  }

  static async updateCompensationRule(
    id: number,
    input: UpdateCompensationRuleInput,
  ): Promise<CompensationRuleDto> {
    const row = await EmployeeCompensationRule.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Compensation rule not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const patch: Partial<{
      roleLabel: string;
      rateAmd: number;
      effectiveFrom: string;
      effectiveTo: string | null;
      notes: string | null;
    }> = {};
    if (input.roleLabel !== undefined) patch.roleLabel = input.roleLabel.trim();
    if (input.rateAmd !== undefined) {
      const rate = Math.round(input.rateAmd);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new InputValidationError('Rate must be positive', HttpStatusCodesUtil.BAD_REQUEST);
      }
      patch.rateAmd = rate;
    }
    if (input.effectiveFrom !== undefined) {
      if (!DATE_RE.test(input.effectiveFrom)) {
        throw new InputValidationError('Invalid effectiveFrom', HttpStatusCodesUtil.BAD_REQUEST);
      }
      patch.effectiveFrom = input.effectiveFrom;
    }
    if (input.effectiveTo !== undefined) {
      if (input.effectiveTo != null && input.effectiveTo !== '' && !DATE_RE.test(input.effectiveTo)) {
        throw new InputValidationError('Invalid effectiveTo', HttpStatusCodesUtil.BAD_REQUEST);
      }
      patch.effectiveTo =
        input.effectiveTo && DATE_RE.test(input.effectiveTo) ? input.effectiveTo : null;
    }
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

    await row.update(patch);

    if (row.effectiveTo == null && patch.rateAmd != null && row.employeeUserId != null) {
      const profile = await InstructorProfile.findOne({ where: { userId: row.employeeUserId } });
      if (profile) {
        if (row.compensationType === 'hourly_practical') {
          await profile.update({ practicalSalaryPerLessonAmd: patch.rateAmd });
        } else if (row.compensationType === 'per_theory_lesson') {
          await profile.update({ theorySalaryPerLessonAmd: patch.rateAmd });
        }
      }
    }

    const staff =
      row.staffEmployeeId != null
        ? await StaffEmployee.findByPk(row.staffEmployeeId, { attributes: ['id', 'name'] })
        : null;
    const employee =
      row.employeeUserId != null
        ? await User.findByPk(row.employeeUserId, { attributes: ['id', 'name'] })
        : null;
    return ruleToDto(
      row,
      staff?.name?.trim() ||
        employee?.name?.trim() ||
        (row.employeeUserId != null ? `Employee #${row.employeeUserId}` : `Rule #${row.id}`),
    );
  }

  static async removeCompensationRule(id: number): Promise<void> {
    const n = await EmployeeCompensationRule.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Compensation rule not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }

  static async listAdjustments(
    startDate?: string,
    endDate?: string,
    employeeUserId?: number,
  ): Promise<{ items: SalaryAdjustmentDto[] }> {
    const where: Record<string | symbol, unknown> = {};
    if (startDate && DATE_RE.test(startDate) && endDate && DATE_RE.test(endDate)) {
      const { start, end } = parseDateRange(startDate, endDate);
      where.dateIso = { [Op.between]: [start, end] };
    }
    if (employeeUserId != null && employeeUserId > 0) {
      where.employeeUserId = employeeUserId;
    }
    const rows = await SalaryAdjustment.findAll({
      where,
      order: [
        ['dateIso', 'DESC'],
        ['id', 'DESC'],
      ],
    });
    return { items: rows.map(adjustmentToDto) };
  }

  static async createAdjustment(
    input: CreateSalaryAdjustmentInput,
    createdByUserId?: number,
  ): Promise<SalaryAdjustmentDto> {
    if (!DATE_RE.test(input.dateIso)) {
      throw new InputValidationError('Invalid date', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const amount = Math.round(input.amountAmd);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new InputValidationError('Amount must be positive', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const employee = await User.findByPk(input.employeeUserId, { attributes: ['id', 'name'] });
    if (!employee) {
      throw new ResourceNotFoundError('Employee not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    const row = await SalaryAdjustment.create({
      employeeUserId: input.employeeUserId,
      employeeName: employee.name?.trim() || `Employee #${employee.id}`,
      dateIso: input.dateIso,
      kind: input.kind,
      amountAmd: amount,
      title: input.title.trim() || input.kind,
      notes: input.notes?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    });
    return adjustmentToDto(row);
  }

  static async removeAdjustment(id: number): Promise<void> {
    const n = await SalaryAdjustment.destroy({ where: { id } });
    if (n === 0) {
      throw new ResourceNotFoundError('Salary adjustment not found', HttpStatusCodesUtil.NOT_FOUND);
    }
  }
}
