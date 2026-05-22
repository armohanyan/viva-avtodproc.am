import { Op, type WhereOptions } from 'sequelize';
import {
  BOOKING_STATUSES_COUNTED_FOR_PROGRESS,
  type LessonCompletionStatus,
} from '../constants/lesson-completion';
import {
  Booking,
  Branch,
  FinanceTransaction,
  PackageOrder,
  StudentProfile,
  TheoryCohortSession,
  User,
} from '../models';
import { branchIdWhere } from '../helpers';
import {
  bookingCountsTowardStudentDebt,
  isCountableAdminPaymentStatus,
  recognizedIncomeAmd,
  resolveBookingPayment,
} from '../utils/booking-admin-payment.util';
import { bookingEndUtcMs, lessonEndUtcMs, lessonInstantUtcMs } from '../utils/lesson-datetime.util';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import AdminFinanceExpenseService from './admin-finance-expense.service';

const YEREVAN_OFFSET = '+04:00';

type BookingWithIncludes = Booking & {
  student?: User;
  instructor?: User | null;
  Branch?: Branch;
};

type StudentProfileWithIncludes = StudentProfile & {
  studentAccount?: User;
  Branch?: Branch;
};

export type FinancialReportQuery = {
  startDate?: string;
  endDate?: string;
};

function parseIsoDateOnly(raw: string | undefined, fallback: string): string {
  const s = (raw ?? '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return fallback;
}

export function resolveFinancialReportDateRange(query: FinancialReportQuery): {
  startDate: string;
  endDate: string;
  startAt: Date;
  endAt: Date;
} {
  const today = yerevanTodayIso();
  const startDate = parseIsoDateOnly(query.startDate, today);
  let endDate = parseIsoDateOnly(query.endDate, today);
  if (endDate < startDate) endDate = startDate;
  const startAt = new Date(`${startDate}T00:00:00${YEREVAN_OFFSET}`);
  const endAt = new Date(`${endDate}T23:59:59.999${YEREVAN_OFFSET}`);
  return { startDate, endDate, startAt, endAt };
}

function normalizeLifecycleStatus(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'pending_prebook') return 'pending';
  if (s === 'completed') return 'confirmed';
  return s;
}

function inferBookingTypeLabel(
  lessonType: 'practical' | 'theory' | 'theory_personal',
  prepaid: Record<string, unknown> | null,
): string {
  if (lessonType === 'theory_personal') return 'personal_theory';
  if (lessonType === 'theory') {
    const cohortId = Math.floor(Number(prepaid?.theoryCohortId) || 0);
    if (cohortId > 0) return 'group';
  }
  const packageOrderId = Math.floor(Number(prepaid?.packageOrderId) || 0);
  if (packageOrderId > 0) return 'package';
  return 'single';
}

function isBookingActiveForProgress(row: Booking): boolean {
  const st = normalizeLifecycleStatus(String(row.status ?? ''));
  if (!BOOKING_STATUSES_COUNTED_FOR_PROGRESS.has(st)) return false;
  if (st === 'pending_payment') {
    const paid = row.paidAt != null || row.paymentStatus === 'paid';
    if (!paid) return false;
  }
  return true;
}

function bookingCountsAsCompleted(row: Booking, now: Date): boolean {
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed') return true;
  if (cs === 'missed' || cs === 'cancelled' || cs === 'refunded' || cs === 'cancelled_no_refund') {
    return false;
  }
  if (row.lessonPassedSuccessfully === false) return false;
  return (
    isBookingActiveForProgress(row) &&
    bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime) <= now.getTime()
  );
}

function bookingCountsAsCancelled(row: Booking): boolean {
  const st = normalizeLifecycleStatus(String(row.status ?? ''));
  if (st === 'cancelled' || st === 'refunded') return true;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  return (
    cs === 'cancelled' ||
    cs === 'cancelled_no_refund' ||
    cs === 'refunded' ||
    cs === 'missed'
  );
}

function bookingCountsAsUpcoming(row: Booking, now: Date): boolean {
  if (!isBookingActiveForProgress(row)) return false;
  const cs = row.lessonCompletionStatus as LessonCompletionStatus | null | undefined;
  if (cs === 'completed' || cs === 'missed') return false;
  return bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime) > now.getTime();
}

function sessionCountsAsCompleted(session: TheoryCohortSession, now: Date): boolean {
  if (session.status === 'cancelled') return false;
  if (session.status === 'completed') return true;
  return lessonEndUtcMs(String(session.dateIso), String(session.endTime)) <= now.getTime();
}

function sessionCountsAsCancelled(session: TheoryCohortSession): boolean {
  return session.status === 'cancelled';
}

function sessionCountsAsUpcoming(session: TheoryCohortSession, now: Date): boolean {
  if (session.status === 'cancelled' || session.status === 'completed') return false;
  return lessonEndUtcMs(String(session.dateIso), String(session.endTime)) > now.getTime();
}

function lessonHoursFromBooking(row: Booking): number {
  const startMs = lessonInstantUtcMs(String(row.dateIso), String(row.time));
  const endMs = bookingEndUtcMs(String(row.dateIso), String(row.time), row.endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 1;
  return Math.max(0.5, Math.round(((endMs - startMs) / 3_600_000) * 10) / 10);
}

function lessonHoursFromSession(session: TheoryCohortSession): number {
  const startMs = lessonInstantUtcMs(String(session.dateIso), String(session.startTime));
  const endMs = lessonEndUtcMs(String(session.dateIso), String(session.endTime));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 1;
  return Math.max(0.5, Math.round(((endMs - startMs) / 3_600_000) * 10) / 10);
}

function rowCreatedAt(row: { createdAt?: Date | string | null }): Date | null {
  const c = row.createdAt;
  if (c instanceof Date) return c;
  if (typeof c === 'string') {
    const d = new Date(c);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

export type FinancialReportSummaryDto = {
  totalIncomeAmd: number;
  totalPaidAmountAmd: number;
  totalPartialPaymentsAmd: number;
  totalUnpaidDebtAmd: number;
  newStudentsCount: number;
  bookingsCreatedCount: number;
  paidBookingsCount: number;
  partialBookingsCount: number;
  unpaidBookingsCount: number;
  refundsCount: number;
  totalRefundAmountAmd: number;
  netRevenueAmd: number;
  completedLessonsCount: number;
  cancelledLessonsCount: number;
  pendingUpcomingBookingsCount: number;
};

export type FinancialReportBookingRowDto = {
  id: number;
  createdAtIso: string;
  lessonDateIso: string;
  studentName: string;
  bookingType: string;
  instructorName: string;
  branchId: number;
  branchName: string;
  totalPriceAmd: number;
  paidAmountAmd: number;
  remainingAmd: number;
  paymentStatus: string;
  bookingStatus: string;
  createdByLabel: string | null;
};

export type FinancialReportStudentRowDto = {
  id: number;
  name: string;
  phone: string;
  registrationDateIso: string;
  branchId: number;
  branchName: string;
  sourceLabel: string | null;
};

export type FinancialReportRefundRowDto = {
  id: number;
  dateIso: string;
  studentName: string;
  serviceLabel: string;
  refundAmountAmd: number;
  reason: string | null;
  processedByLabel: string | null;
};

export type FinancialReportInstructorRowDto = {
  instructorUserId: number;
  instructorName: string;
  branchId: number;
  branchName: string;
  practicalCount: number;
  theoryGroupCount: number;
  theoryPersonalCount: number;
  completedCount: number;
  cancelledCount: number;
  totalHours: number;
};

export type FinancialReportOptionalDto = {
  expensesTotalAmd: number;
  expensesCount: number;
  netProfitAmd: number;
  packageSalesCount: number;
  packageSalesAmountAmd: number;
  paymentsOnlineAmd: number;
  paymentsManualAmd: number;
  topBookingTypes: Array<{ type: string; count: number }>;
  branchComparison: Array<{
    branchId: number;
    branchName: string;
    incomeAmd: number;
    bookingsCount: number;
    newStudentsCount: number;
  }>;
};

export type FinancialReportResponseDto = {
  meta: {
    startDate: string;
    endDate: string;
    branchId: number | null;
    branchName: string | null;
    generatedAtIso: string;
  };
  summary: FinancialReportSummaryDto;
  bookings: FinancialReportBookingRowDto[];
  newStudents: FinancialReportStudentRowDto[];
  refunds: FinancialReportRefundRowDto[];
  instructorLessons: FinancialReportInstructorRowDto[];
  optional: FinancialReportOptionalDto | null;
};

export default class AdminFinancialReportService {
  static async build(
    query: FinancialReportQuery,
    branchId: number | undefined,
  ): Promise<FinancialReportResponseDto> {
    const { startDate, endDate, startAt, endAt } = resolveFinancialReportDateRange(query);
    const now = new Date();
    const branchWhere = branchIdWhere(branchId);

    const branchRow =
      branchId != null ? await Branch.findByPk(branchId, { attributes: ['id', 'name'] }) : null;

    const bookingWhere = {
      ...(branchWhere ?? {}),
      createdAt: { [Op.between]: [startAt, endAt] },
    } as WhereOptions;

    const lessonBookingWhere = {
      ...(branchWhere ?? {}),
      dateIso: { [Op.between]: [startDate, endDate] },
    };

    const bookingsCreated = await Booking.findAll({
      where: bookingWhere,
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'instructor', attributes: ['id', 'name'], required: false },
        { model: Branch, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const lessonBookings = await Booking.findAll({
      where: lessonBookingWhere,
      include: [
        { model: User, as: 'instructor', attributes: ['id', 'name'], required: false },
        { model: Branch, attributes: ['id', 'name'] },
      ],
    });

    const cohortSessions = await TheoryCohortSession.findAll({
      where: {
        ...(branchWhere ?? {}),
        dateIso: { [Op.between]: [startDate, endDate] },
      },
    });
    const cohortBranchIds = [...new Set(cohortSessions.map((s) => s.branchId))];
    const cohortBranches =
      cohortBranchIds.length > 0
        ? await Branch.findAll({ where: { id: { [Op.in]: cohortBranchIds } }, attributes: ['id', 'name'] })
        : [];
    const cohortBranchById = new Map(cohortBranches.map((b) => [b.id, b]));
    const cohortInstructorIds = [
      ...new Set(
        cohortSessions.map((s) => s.instructorUserId).filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    ];
    const cohortInstructors =
      cohortInstructorIds.length > 0
        ? await User.findAll({ where: { id: { [Op.in]: cohortInstructorIds } }, attributes: ['id', 'name'] })
        : [];
    const cohortInstructorNameById = new Map(cohortInstructors.map((u) => [u.id, u.name?.trim() || `Instructor #${u.id}`]));

    let totalIncomeAmd = 0;
    let totalPaidAmountAmd = 0;
    let totalPartialPaymentsAmd = 0;
    let totalUnpaidDebtAmd = 0;
    let paidBookingsCount = 0;
    let partialBookingsCount = 0;
    let unpaidBookingsCount = 0;

    const bookingRows: FinancialReportBookingRowDto[] = [];
    const bookingTypeCounts = new Map<string, number>();
    const branchIncome = new Map<number, { income: number; bookings: number }>();

    for (const rawRow of bookingsCreated) {
      const row = rawRow as BookingWithIncludes;
      const prepaid = (row.prepaidMeta as Record<string, unknown> | null) ?? null;
      const bookingType = inferBookingTypeLabel(row.lessonType, prepaid);
      bookingTypeCounts.set(bookingType, (bookingTypeCounts.get(bookingType) ?? 0) + 1);

      const resolved = resolveBookingPayment(row);
      const income = recognizedIncomeAmd(row);
      totalIncomeAmd += income;
      totalPaidAmountAmd += resolved.paidAmountAmd;

      if (isCountableAdminPaymentStatus(resolved.paymentStatus)) {
        if (resolved.paymentStatus === 'paid') paidBookingsCount += 1;
        else if (resolved.paymentStatus === 'partial') {
          partialBookingsCount += 1;
          totalPartialPaymentsAmd += resolved.paidAmountAmd;
        } else unpaidBookingsCount += 1;
      }

      if (bookingCountsTowardStudentDebt(row)) {
        totalUnpaidDebtAmd += resolved.remainingAmd;
      }

      const student = row.student as User | undefined;
      const instructor = row.instructor as User | null | undefined;
      const branch = row.Branch as Branch | undefined;
      const created = rowCreatedAt(row as Booking & { createdAt?: Date });
      const bid = branch?.id ?? row.branchId;

      if (branchId == null) {
        const prev = branchIncome.get(bid) ?? { income: 0, bookings: 0 };
        branchIncome.set(bid, { income: prev.income + income, bookings: prev.bookings + 1 });
      }

      bookingRows.push({
        id: row.id,
        createdAtIso: created?.toISOString() ?? now.toISOString(),
        lessonDateIso: String(row.dateIso).slice(0, 10),
        studentName: student?.name?.trim() || `Student #${row.studentUserId}`,
        bookingType,
        instructorName: instructor?.name?.trim() || '—',
        branchId: bid,
        branchName: branch?.name?.trim() || `Branch #${bid}`,
        totalPriceAmd: resolved.totalPriceAmd,
        paidAmountAmd: resolved.paidAmountAmd,
        remainingAmd: resolved.remainingAmd,
        paymentStatus: resolved.paymentStatus,
        bookingStatus: normalizeLifecycleStatus(String(row.status)),
        createdByLabel: null,
      });
    }

    const refundTxs = await FinanceTransaction.findAll({
      where: {
        ...(branchWhere ?? {}),
        entryType: 'expense',
        expenseKind: 'booking_refund',
        createdAt: { [Op.between]: [startAt, endAt] },
      } as WhereOptions,
      order: [['createdAt', 'DESC']],
    });

    const refundBookingIds = [
      ...new Set(
        refundTxs.map((t) => t.bookingId).filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    ];
    const refundBookings =
      refundBookingIds.length > 0
        ? await Booking.findAll({
            where: { id: { [Op.in]: refundBookingIds } },
            include: [{ model: User, as: 'student', attributes: ['id', 'name'] }],
          })
        : [];
    const refundBookingById = new Map(refundBookings.map((b) => [b.id, b]));

    let totalRefundAmountAmd = 0;
    const refundRows: FinancialReportRefundRowDto[] = [];
    for (const tx of refundTxs) {
      const amt = Math.max(0, Math.round(Number(tx.grossAmd) || 0));
      totalRefundAmountAmd += amt;
      const linked =
        tx.bookingId != null ? (refundBookingById.get(tx.bookingId) as BookingWithIncludes | undefined) : undefined;
      const student = linked?.student;
      const created = rowCreatedAt(tx as FinanceTransaction & { createdAt?: Date });
      refundRows.push({
        id: tx.id,
        dateIso: created?.toISOString().slice(0, 10) ?? startDate,
        studentName: student?.name?.trim() || tx.customer?.trim() || '—',
        serviceLabel: tx.description?.trim() || '—',
        refundAmountAmd: amt,
        reason: tx.description?.trim() || null,
        processedByLabel: tx.source === 'manual' ? 'Staff' : 'System',
      });
    }

    const studentProfiles = await StudentProfile.findAll({
      where: {
        ...(branchWhere ?? {}),
        joinedAt: { [Op.between]: [startDate, endDate] },
      },
      include: [
        { model: User, as: 'studentAccount', attributes: ['id', 'name', 'phone', 'createdAt'], required: true },
        { model: Branch, attributes: ['id', 'name'], required: false },
      ],
      order: [['joinedAt', 'DESC']],
    });

    const newStudentRows: FinancialReportStudentRowDto[] = [];
    const branchNewStudents = new Map<number, number>();

    for (const rawSp of studentProfiles) {
      const sp = rawSp as StudentProfileWithIncludes;
      const stu = sp.studentAccount;
      if (!stu) continue;
      const branch = sp.Branch;
      const bid = sp.branchId;
      if (branchId == null) {
        branchNewStudents.set(bid, (branchNewStudents.get(bid) ?? 0) + 1);
      }
      const stuCreated = rowCreatedAt(stu as User & { createdAt?: Date | string });
      const reg =
        typeof sp.joinedAt === 'string'
          ? sp.joinedAt.slice(0, 10)
          : stuCreated
            ? stuCreated.toISOString().slice(0, 10)
            : String(sp.joinedAt).slice(0, 10);
      newStudentRows.push({
        id: stu.id,
        name: stu.name,
        phone: stu.phone ?? '',
        registrationDateIso: reg,
        branchId: bid,
        branchName: branch?.name?.trim() || `Branch #${bid}`,
        sourceLabel: null,
      });
    }

    let completedLessonsCount = 0;
    let cancelledLessonsCount = 0;
    let pendingUpcomingBookingsCount = 0;

    type InstKey = string;
    const instructorMap = new Map<
      InstKey,
      FinancialReportInstructorRowDto & { _hours: number }
    >();

    const bumpInstructor = (
      instructorUserId: number,
      instructorName: string,
      branchIdNum: number,
      branchName: string,
      kind: 'practical' | 'theory_group' | 'theory_personal',
      completed: boolean,
      cancelled: boolean,
      upcoming: boolean,
      hours: number,
    ) => {
      if (instructorUserId <= 0) return;
      const key = `${instructorUserId}:${branchIdNum}`;
      const prev = instructorMap.get(key) ?? {
        instructorUserId,
        instructorName,
        branchId: branchIdNum,
        branchName,
        practicalCount: 0,
        theoryGroupCount: 0,
        theoryPersonalCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        totalHours: 0,
        _hours: 0,
      };
      if (kind === 'practical') prev.practicalCount += 1;
      else if (kind === 'theory_group') prev.theoryGroupCount += 1;
      else prev.theoryPersonalCount += 1;
      if (completed) prev.completedCount += 1;
      if (cancelled) prev.cancelledCount += 1;
      if (completed) prev._hours += hours;
      instructorMap.set(key, prev);
      if (upcoming) pendingUpcomingBookingsCount += 1;
    };

    for (const rawRow of lessonBookings) {
      const row = rawRow as BookingWithIncludes;
      const completed = bookingCountsAsCompleted(row, now);
      const cancelled = bookingCountsAsCancelled(row);
      const upcoming = bookingCountsAsUpcoming(row, now);
      if (completed) completedLessonsCount += 1;
      if (cancelled) cancelledLessonsCount += 1;
      if (upcoming) pendingUpcomingBookingsCount += 1;

      const instructor = row.instructor as User | null | undefined;
      const branch = row.Branch as Branch | undefined;
      const iid = row.instructorUserId ?? 0;
      const kind =
        row.lessonType === 'practical'
          ? 'practical'
          : row.lessonType === 'theory'
            ? 'theory_group'
            : 'theory_personal';
      bumpInstructor(
        iid,
        instructor?.name?.trim() || '—',
        branch?.id ?? row.branchId,
        branch?.name?.trim() || `Branch #${row.branchId}`,
        kind,
        completed,
        cancelled,
        upcoming,
        lessonHoursFromBooking(row),
      );
    }

    for (const session of cohortSessions) {
      const completed = sessionCountsAsCompleted(session, now);
      const cancelled = sessionCountsAsCancelled(session);
      const upcoming = sessionCountsAsUpcoming(session, now);
      if (completed) completedLessonsCount += 1;
      if (cancelled) cancelledLessonsCount += 1;
      if (upcoming) pendingUpcomingBookingsCount += 1;

      const branch = cohortBranchById.get(session.branchId);
      const iid = session.instructorUserId ?? 0;
      bumpInstructor(
        iid,
        iid > 0 ? cohortInstructorNameById.get(iid) ?? `Instructor #${iid}` : '—',
        branch?.id ?? session.branchId,
        branch?.name?.trim() || `Branch #${session.branchId}`,
        'theory_group',
        completed,
        cancelled,
        upcoming,
        lessonHoursFromSession(session),
      );
    }

    const instructorLessons = [...instructorMap.values()]
      .map(({ _hours, ...rest }) => ({ ...rest, totalHours: Math.round(_hours * 10) / 10 }))
      .sort((a, b) => a.instructorName.localeCompare(b.instructorName, 'hy'));

    const netRevenueAmd = totalIncomeAmd - totalRefundAmountAmd;

    let optional: FinancialReportOptionalDto | null = null;

    const expenseList = await AdminFinanceExpenseService.list(branchId);
    const expensesInPeriod = expenseList.filter((e) => e.date >= startDate && e.date <= endDate);
    const expensesTotalAmd = expensesInPeriod.reduce((s, e) => s + e.amount, 0);

    const packageOrderWhere: Record<string, unknown> = {
      [Op.or]: [
        { paidAt: { [Op.between]: [startAt, endAt] } },
        { createdAt: { [Op.between]: [startAt, endAt] } },
      ],
    };
    if (branchId != null) {
      const studentIds = await studentUserIdsForBranch(branchId);
      packageOrderWhere.studentUserId =
        studentIds.length === 0 ? -1 : { [Op.in]: studentIds };
    }
    const packageOrders = await PackageOrder.findAll({
      where: packageOrderWhere as WhereOptions,
      attributes: ['id', 'financeTransactionId'],
    });
    const packageTxIds = packageOrders
      .map((o) => o.financeTransactionId)
      .filter((id): id is number => typeof id === 'number' && id > 0);
    const packageTxRows =
      packageTxIds.length > 0
        ? await FinanceTransaction.findAll({
            where: { id: { [Op.in]: packageTxIds }, entryType: 'income', status: 'completed' },
            attributes: ['grossAmd'],
          })
        : [];

    const incomeTxs = await FinanceTransaction.findAll({
      where: {
        ...(branchWhere ?? {}),
        entryType: 'income',
        status: 'completed',
        createdAt: { [Op.between]: [startAt, endAt] },
      } as WhereOptions,
      attributes: ['grossAmd', 'channel', 'method'],
    });

    let paymentsOnlineAmd = 0;
    let paymentsManualAmd = 0;
    for (const tx of incomeTxs) {
      const amt = Math.max(0, Math.round(Number(tx.grossAmd) || 0));
      if (tx.channel === 'online') paymentsOnlineAmd += amt;
      else paymentsManualAmd += amt;
    }

    const topBookingTypes = [...bookingTypeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    let branchComparison: FinancialReportOptionalDto['branchComparison'] = [];
    if (branchId == null && branchIncome.size > 0) {
      const allBranches = await Branch.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
      branchComparison = allBranches
        .filter((b) => branchIncome.has(b.id) || branchNewStudents.has(b.id))
        .map((b) => ({
          branchId: b.id,
          branchName: b.name,
          incomeAmd: branchIncome.get(b.id)?.income ?? 0,
          bookingsCount: branchIncome.get(b.id)?.bookings ?? 0,
          newStudentsCount: branchNewStudents.get(b.id) ?? 0,
        }));
    }

    let packageSalesAmountAmd = 0;
    for (const tx of packageTxRows) {
      packageSalesAmountAmd += Math.max(0, Math.round(Number(tx.grossAmd) || 0));
    }

    optional = {
      expensesTotalAmd,
      expensesCount: expensesInPeriod.length,
      netProfitAmd: netRevenueAmd - expensesTotalAmd,
      packageSalesCount: packageOrders.length,
      packageSalesAmountAmd,
      paymentsOnlineAmd,
      paymentsManualAmd,
      topBookingTypes,
      branchComparison,
    };

    return {
      meta: {
        startDate,
        endDate,
        branchId: branchId ?? null,
        branchName: branchRow?.name ?? null,
        generatedAtIso: now.toISOString(),
      },
      summary: {
        totalIncomeAmd,
        totalPaidAmountAmd,
        totalPartialPaymentsAmd,
        totalUnpaidDebtAmd,
        newStudentsCount: newStudentRows.length,
        bookingsCreatedCount: bookingsCreated.length,
        paidBookingsCount,
        partialBookingsCount,
        unpaidBookingsCount,
        refundsCount: refundRows.length,
        totalRefundAmountAmd,
        netRevenueAmd,
        completedLessonsCount,
        cancelledLessonsCount,
        pendingUpcomingBookingsCount,
      },
      bookings: bookingRows,
      newStudents: newStudentRows,
      refunds: refundRows,
      instructorLessons,
      optional,
    };
  }
}

async function studentUserIdsForBranch(branchId: number): Promise<number[]> {
  const rows = await StudentProfile.findAll({
    where: { branchId },
    attributes: ['userId'],
  });
  return rows.map((r) => r.userId);
}
