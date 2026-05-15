import { Op, literal } from 'sequelize';
import { Booking, BookingSlot, Branch, Package, PackageOrder, User } from '../models';
import { normalizeBookingStatus } from './booking.service';

const YEREVAN_TZ = 'Asia/Yerevan';

export type ClassScheduleView = 'today' | 'week' | 'month' | 'custom';

export type ClassScheduleQuery = {
  view?: string;
  startDate?: string;
  endDate?: string;
  lessonType?: string;
  instructorId?: string;
  studentId?: string;
  branchId?: string;
  status?: string;
  search?: string;
  packageFilter?: string;
};

export type ClassScheduleLessonType = 'practical' | 'theory' | 'theory_personal';
export type ClassScheduleBookingType = 'single' | 'package' | 'group' | 'personal_theory';
export type ClassSchedulePaymentStatus = 'paid' | 'free' | 'pending' | 'not_required';

export type ClassScheduleItemDto = {
  id: string;
  bookingId: number;
  lessonType: ClassScheduleLessonType;
  bookingType: ClassScheduleBookingType;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  student: { id: number; name: string; phone: string | null };
  instructor: { id: number | null; name: string };
  branch: { id: number; name: string; address: string };
  package: { id: number; name: string; isIncludedLesson: boolean } | null;
  payment: { status: ClassSchedulePaymentStatus };
  notes: string;
  cancellationRequestedAt: string | null;
  lessonPassedSuccessfully: boolean | null;
  totalPriceAmd: number | null;
};

export type ClassScheduleResponse = {
  items: ClassScheduleItemDto[];
  meta: {
    view: ClassScheduleView;
    startDate: string;
    endDate: string;
    total: number;
  };
};

type BookingRow = Booking & {
  student: User;
  instructor: User | null;
  Branch?: Branch;
  slotClaims?: BookingSlot[];
};

function dateIsoString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function yerevanTodayIso(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

function yerevanAddCalendarDays(fromIso: string, deltaDays: number): string {
  const base = `${fromIso.slice(0, 10)}T12:00:00+04:00`;
  const ms = Date.parse(base);
  if (!Number.isFinite(ms)) return fromIso;
  const shifted = new Date(ms + deltaDays * 86400000);
  return shifted.toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

const WEEKDAY_SHORT_MON0 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function yerevanWeekdayIndexMonday0(dateIso: string): number {
  const ms = Date.parse(`${dateIso.slice(0, 10)}T12:00:00+04:00`);
  if (!Number.isFinite(ms)) return 0;
  const short = new Intl.DateTimeFormat('en-US', { timeZone: YEREVAN_TZ, weekday: 'short' }).format(new Date(ms));
  const idx = WEEKDAY_SHORT_MON0.indexOf(short as (typeof WEEKDAY_SHORT_MON0)[number]);
  return idx >= 0 ? idx : 0;
}

function yerevanWeekRangeContaining(todayIso: string): { start: string; end: string } {
  const start = yerevanAddCalendarDays(todayIso, -yerevanWeekdayIndexMonday0(todayIso));
  return { start, end: yerevanAddCalendarDays(start, 6) };
}

function yerevanMonthRangeContaining(todayIso: string): { start: string; end: string } {
  const [ys, ms] = todayIso.slice(0, 10).split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return { start: todayIso.slice(0, 10), end: todayIso.slice(0, 10) };
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const dim = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(dim).padStart(2, '0')}`;
  return { start, end };
}

function parseIsoDateOnly(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function normalizeTimeHHMM(v: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(v.trim());
  if (!m) return v.trim().slice(0, 5);
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function computeEndTime(startTime: string, rowEndTime: string | null): string {
  if (rowEndTime?.trim()) return normalizeTimeHHMM(rowEndTime);
  const m = /^(\d{1,2}):(\d{2})/.exec(startTime);
  if (!m) return startTime;
  const total = Number(m[1]) * 60 + Number(m[2]) + 60;
  const h = Math.floor(total / 60) % 24;
  const min = total % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function resolveViewRange(query: ClassScheduleQuery): { view: ClassScheduleView; start: string; end: string } {
  const today = yerevanTodayIso();
  const viewRaw = (query.view ?? 'today').trim().toLowerCase();
  const view: ClassScheduleView =
    viewRaw === 'week' || viewRaw === 'month' || viewRaw === 'custom' ? viewRaw : 'today';

  if (view === 'custom') {
    const start = parseIsoDateOnly(query.startDate) ?? today;
    const end = parseIsoDateOnly(query.endDate) ?? start;
    return { view, start: start <= end ? start : end, end: start <= end ? end : start };
  }
  if (view === 'week') {
    const startOverride = parseIsoDateOnly(query.startDate);
    const endOverride = parseIsoDateOnly(query.endDate);
    if (startOverride && endOverride) {
      return {
        view,
        start: startOverride <= endOverride ? startOverride : endOverride,
        end: startOverride <= endOverride ? endOverride : startOverride,
      };
    }
    const r = yerevanWeekRangeContaining(today);
    return { view, start: r.start, end: r.end };
  }
  if (view === 'month') {
    const startOverride = parseIsoDateOnly(query.startDate);
    const endOverride = parseIsoDateOnly(query.endDate);
    if (startOverride && endOverride) {
      return {
        view,
        start: startOverride <= endOverride ? startOverride : endOverride,
        end: startOverride <= endOverride ? endOverride : startOverride,
      };
    }
    const r = yerevanMonthRangeContaining(today);
    return { view, start: r.start, end: r.end };
  }
  return { view: 'today', start: today, end: today };
}

function inferBookingType(
  lessonType: ClassScheduleLessonType,
  prepaid: Record<string, unknown> | null,
): ClassScheduleBookingType {
  if (lessonType === 'theory_personal') return 'personal_theory';
  if (lessonType === 'theory') {
    const cohortId = Math.floor(Number(prepaid?.theoryCohortId) || 0);
    if (cohortId > 0) return 'group';
  }
  const packageOrderId = Math.floor(Number(prepaid?.packageOrderId) || 0);
  if (packageOrderId > 0) return 'package';
  return 'single';
}

function resolvePaymentStatus(row: Booking): ClassSchedulePaymentStatus {
  const prepaid = row.prepaidMeta as Record<string, unknown> | null;
  if (prepaid && (Number(prepaid.packageOrderId) > 0 || Number(prepaid.extraPracticalUnits) > 0)) {
    return 'free';
  }
  if (row.paymentStatus === 'paid' || row.paidAt != null) return 'paid';
  if (row.paymentStatus === 'unpaid' || row.paymentStatus === 'pending' || row.paymentStatus === 'failed') {
    return 'pending';
  }
  const price = row.totalPriceAmd != null ? Number(row.totalPriceAmd) : null;
  if (price == null || price === 0) return 'not_required';
  return 'pending';
}

function buildNotes(row: Booking): string {
  const parts: string[] = [];
  if (row.cancellationReason?.trim()) parts.push(row.cancellationReason.trim());
  if (row.cancellationRequestedAt) parts.push('cancellation_requested');
  if (row.lessonPassedSuccessfully === true) parts.push('lesson_passed');
  if (row.lessonPassedSuccessfully === false) parts.push('lesson_not_passed');
  return parts.join(' · ');
}

function matchesLessonTypeFilter(lessonType: ClassScheduleLessonType, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f || f === 'all') return true;
  if (f === 'practical') return lessonType === 'practical';
  if (f === 'theory') return lessonType === 'theory' || lessonType === 'theory_personal';
  return true;
}

function matchesPackageFilter(item: ClassScheduleItemDto, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f || f === 'all') return true;
  if (f === 'package' || f === 'included') return item.package?.isIncludedLesson === true;
  if (f === 'paid' || f === 'single') return item.package == null && item.payment.status !== 'free';
  if (f === 'free') return item.payment.status === 'free';
  return true;
}

export default class ClassScheduleService {
  static async listForAdmin(query: ClassScheduleQuery): Promise<ClassScheduleResponse> {
    const { view, start, end } = resolveViewRange(query);

    const slotRows = await BookingSlot.findAll({
      attributes: ['bookingId'],
      where: { dateIso: { [Op.between]: [start, end] } },
      group: ['bookingId'],
      raw: true,
    });
    const slotBookingIds = slotRows
      .map((r) => Number((r as { bookingId: number }).bookingId))
      .filter((id) => Number.isFinite(id) && id > 0);

    const legacyRows = await Booking.findAll({
      attributes: ['id'],
      where: {
        dateIso: { [Op.between]: [start, end] },
        [Op.and]: literal(
          'NOT EXISTS (SELECT 1 FROM `booking_slots` AS `s` WHERE s.`booking_id` = `Booking`.`id`)',
        ),
      },
      raw: true,
    });
    const legacyIds = legacyRows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);

    const bookingIds = [...new Set([...slotBookingIds, ...legacyIds])];
    if (bookingIds.length === 0) {
      return { items: [], meta: { view, startDate: start, endDate: end, total: 0 } };
    }

    const rows = (await Booking.findAll({
      where: { id: { [Op.in]: bookingIds } },
      include: [
        { model: User, as: 'student', required: true, attributes: ['id', 'name', 'phone', 'email'] },
        { model: User, as: 'instructor', required: false, attributes: ['id', 'name'] },
        { model: Branch, required: false, attributes: ['id', 'name', 'mapUrl', 'phone'] },
        {
          model: BookingSlot,
          as: 'slotClaims',
          required: false,
          where: { dateIso: { [Op.between]: [start, end] } },
        },
      ],
      order: [
        ['dateIso', 'ASC'],
        ['time', 'ASC'],
        ['id', 'ASC'],
      ],
    })) as BookingRow[];

    const packageOrderIds = new Set<number>();
    for (const row of rows) {
      const prepaid = row.prepaidMeta as Record<string, unknown> | null;
      const oid = Math.floor(Number(prepaid?.packageOrderId) || 0);
      if (oid > 0) packageOrderIds.add(oid);
    }

    const packageNameByOrderId = new Map<number, { packageId: number; name: string }>();
    if (packageOrderIds.size > 0) {
      const orders = await PackageOrder.findAll({
        where: { id: { [Op.in]: [...packageOrderIds] } },
        attributes: ['id', 'packageId'],
      });
      const packageIds = [...new Set(orders.map((o) => o.packageId).filter((id) => id > 0))];
      const packages =
        packageIds.length > 0
          ? await Package.findAll({ where: { id: { [Op.in]: packageIds } }, attributes: ['id', 'name'] })
          : [];
      const pkgName = new Map(packages.map((p) => [p.id, p.name]));
      for (const o of orders) {
        packageNameByOrderId.set(o.id, { packageId: o.packageId, name: pkgName.get(o.packageId) ?? '' });
      }
    }

    const instructorIdFilter = Math.floor(Number(query.instructorId) || 0);
    const studentIdFilter = Math.floor(Number(query.studentId) || 0);
    const branchIdFilter = Math.floor(Number(query.branchId) || 0);
    const statusFilter = (query.status ?? '').trim().toLowerCase();
    const searchQ = (query.search ?? '').trim().toLowerCase();
    const lessonTypeFilter = query.lessonType ?? 'all';
    const packageFilter = query.packageFilter ?? 'all';

    const occurrences: ClassScheduleItemDto[] = [];

    for (const row of rows) {
      const lessonType = row.lessonType as ClassScheduleLessonType;
      if (!matchesLessonTypeFilter(lessonType, lessonTypeFilter)) continue;

      const prepaid = (row.prepaidMeta as Record<string, unknown> | null) ?? null;
      const bookingType = inferBookingType(lessonType, prepaid);
      const status = normalizeBookingStatus(row.status);
      if (statusFilter && statusFilter !== 'all' && status !== statusFilter) continue;

      if (instructorIdFilter > 0 && row.instructorUserId !== instructorIdFilter) continue;
      if (studentIdFilter > 0 && row.studentUserId !== studentIdFilter) continue;
      if (branchIdFilter > 0 && row.branchId !== branchIdFilter) continue;

      const student = row.student;
      const instructor = row.instructor;
      const branchRow = row.Branch;
      const studentName = student?.name?.trim() || `Student #${row.studentUserId}`;
      const instructorName = instructor?.name?.trim() || '';

      if (searchQ) {
        const hay = `${studentName} ${instructorName} ${student?.phone ?? ''} ${student?.email ?? ''}`.toLowerCase();
        if (!hay.includes(searchQ)) continue;
      }

      const packageOrderId = Math.floor(Number(prepaid?.packageOrderId) || 0);
      const pkgInfo = packageOrderId > 0 ? packageNameByOrderId.get(packageOrderId) : undefined;
      const packageBlock =
        packageOrderId > 0 && pkgInfo
          ? {
              id: pkgInfo.packageId,
              name: pkgInfo.name || `Package #${pkgInfo.packageId}`,
              isIncludedLesson: true,
            }
          : packageOrderId > 0
            ? { id: 0, name: `Order #${packageOrderId}`, isIncludedLesson: true }
            : null;

      const payment = { status: resolvePaymentStatus(row) };
      const notes = buildNotes(row);
      const cancellationRequestedAt = row.cancellationRequestedAt
        ? new Date(row.cancellationRequestedAt).toISOString()
        : null;
      const lessonPassedSuccessfully =
        row.lessonPassedSuccessfully === null || row.lessonPassedSuccessfully === undefined
          ? null
          : Boolean(row.lessonPassedSuccessfully);

      const slots = (row.slotClaims ?? []).slice().sort((a, b) => {
        const d = dateIsoString(a.dateIso).localeCompare(dateIsoString(b.dateIso));
        if (d !== 0) return d;
        return a.slotTime.localeCompare(b.slotTime);
      });

      const slotOccurrences =
        slots.length > 0
          ? slots.map((s) => ({
              date: dateIsoString(s.dateIso),
              startTime: normalizeTimeHHMM(s.slotTime),
            }))
          : [
              {
                date: dateIsoString(row.dateIso),
                startTime: normalizeTimeHHMM(row.time),
              },
            ];

      for (const occ of slotOccurrences) {
        if (occ.date < start || occ.date > end) continue;

        const endTime = computeEndTime(occ.startTime, row.endTime ?? null);
        const item: ClassScheduleItemDto = {
          id: `${row.id}:${occ.date}:${occ.startTime}`,
          bookingId: row.id,
          lessonType,
          bookingType,
          status,
          date: occ.date,
          startTime: occ.startTime,
          endTime,
          student: {
            id: row.studentUserId,
            name: studentName,
            phone: student?.phone?.trim() || null,
          },
          instructor: {
            id: row.instructorUserId ?? null,
            name: instructorName,
          },
          branch: {
            id: row.branchId,
            name: branchRow?.name?.trim() || `Branch #${row.branchId}`,
            address: branchRow?.mapUrl?.trim() || branchRow?.phone?.trim() || '',
          },
          package: packageBlock,
          payment,
          notes,
          cancellationRequestedAt,
          lessonPassedSuccessfully,
          totalPriceAmd: row.totalPriceAmd ?? null,
        };

        if (!matchesPackageFilter(item, packageFilter)) continue;
        occurrences.push(item);
      }
    }

    occurrences.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      items: occurrences,
      meta: { view, startDate: start, endDate: end, total: occurrences.length },
    };
  }
}
