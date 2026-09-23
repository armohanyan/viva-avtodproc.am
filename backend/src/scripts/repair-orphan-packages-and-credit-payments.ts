/**
 * One-off repair:
 * 1. Detach a student's package when that package has no live booking (sale or lesson).
 * 2. Lesson bookings paid with package credits follow the package:
 *    - package paid → those lessons are paid
 *    - package not paid → those lessons are unpaid, with a note for admins
 *
 * Dry-run is the default. Pass --apply to write.
 *
 *   cd backend
 *   npx tsx src/scripts/repair-orphan-packages-and-credit-payments.ts
 *   npx tsx src/scripts/repair-orphan-packages-and-credit-payments.ts --apply
 */
import 'dotenv/config';
import { QueryTypes, Transaction } from 'sequelize';
import { connectDatabase, sequelize } from '../database/sequelize';
import { Booking, PackageOrder, StudentProfile } from '../models';
import NotificationService from '../services/notification.service';
import StudentEntitlementsService from '../services/student-entitlements.service';

const APPLY = process.argv.includes('--apply');
const UNPAID_NOTE = 'Unpaid because the package was not paid.';
const ACTIVE_ORDER_STATUSES = new Set(['active', 'paid', 'confirmed']);
const TERMINAL_BOOKING_STATUSES = new Set(['archived', 'cancelled', 'refunded']);

type OrderRow = {
  id: number;
  student_user_id: number;
  package_id: number;
  status: string;
  paid_at: Date | null;
  finance_transaction_id: number | null;
  note: string | null;
  package_name: string;
  student_name: string;
};

type BookingRow = {
  id: number;
  student_user_id: number;
  status: string;
  payment_status: string | null;
  paid_amount_amd: number | null;
  paid_at: Date | null;
  payment_notes: string | null;
  prepaid_meta: unknown;
};

type FinanceRow = {
  id: number;
  status: string;
  entry_type: string;
  gross_amd: number;
};

type ProfileRow = {
  user_id: number;
  package_id: number | null;
};

type ParsedBooking = {
  id: number;
  studentUserId: number;
  status: string;
  paymentStatus: string;
  paidAmountAmd: number;
  paidAt: Date | null;
  paymentNotes: string | null;
  meta: Record<string, unknown>;
  packageOrderId: number;
  packageId: number;
  packagePurchase: boolean;
  terminal: boolean;
};

function readMeta(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed != null && typeof parsed === 'object' ? { ...(parsed as Record<string, unknown>) } : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return { ...(raw as Record<string, unknown>) };
  return {};
}

function positiveInt(raw: unknown): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseBooking(row: BookingRow): ParsedBooking {
  const meta = readMeta(row.prepaid_meta);
  return {
    id: Number(row.id),
    studentUserId: Number(row.student_user_id),
    status: String(row.status ?? '').trim().toLowerCase(),
    paymentStatus: String(row.payment_status ?? '').trim().toLowerCase(),
    paidAmountAmd: Math.max(0, Math.round(Number(row.paid_amount_amd ?? 0))),
    paidAt: row.paid_at,
    paymentNotes: row.payment_notes,
    meta,
    packageOrderId: positiveInt(meta.packageOrderId),
    packageId: positiveInt(meta.packageId),
    packagePurchase: meta.packagePurchase === true,
    terminal: TERMINAL_BOOKING_STATUSES.has(String(row.status ?? '').trim().toLowerCase()),
  };
}

function bookingIsPaid(row: ParsedBooking): boolean {
  if (row.paymentStatus === 'paid') return true;
  if (row.paymentStatus === 'partial' || row.paymentStatus === 'unpaid' || row.paymentStatus === 'pending' || row.paymentStatus === 'failed') {
    return false;
  }
  return row.paidAt != null;
}

function orderLooksPaid(order: OrderRow, finance: FinanceRow | undefined): boolean {
  if (order.paid_at != null) return true;
  if (String(order.status ?? '').trim().toLowerCase() === 'paid') return true;
  return (
    finance != null &&
    String(finance.status ?? '').trim().toLowerCase() === 'completed' &&
    String(finance.entry_type ?? '').trim().toLowerCase() === 'income' &&
    Number(finance.gross_amd) > 0
  );
}

function latest(rows: ParsedBooking[]): ParsedBooking | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => (row.id > best.id ? row : best));
}

function notesWithUnpaidReason(existing: string | null, unpaid: boolean): string | null {
  const base = String(existing ?? '').trim();
  const has = base.includes(UNPAID_NOTE);
  if (unpaid) {
    if (has) return base;
    const next = base ? `${base}\n${UNPAID_NOTE}` : UNPAID_NOTE;
    return next.slice(0, 4000);
  }
  if (!has) return base || null;
  const next = base
    .replace(UNPAID_NOTE, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return next || null;
}

function isCreditLesson(row: ParsedBooking): boolean {
  if (row.packagePurchase || row.terminal || row.packageOrderId <= 0) return false;
  const units = Math.max(0, Math.floor(Number(row.meta.packageBalanceUnits) || 0));
  const pkg = Math.max(0, Math.floor(Number(row.meta.pkg) || 0));
  const pkgTheory = Math.max(0, Math.floor(Number(row.meta.pkgTheory) || 0));
  return units > 0 || pkg > 0 || pkgTheory > 0 || row.packageOrderId > 0;
}

async function main() {
  await connectDatabase();

  const orders = await sequelize.query<OrderRow>(
    `SELECT o.id, o.student_user_id, o.package_id, o.status, o.paid_at, o.finance_transaction_id, o.note,
            p.name AS package_name, u.name AS student_name
     FROM package_orders o
     INNER JOIN packages p ON p.id = o.package_id
     INNER JOIN users u ON u.id = o.student_user_id
     ORDER BY o.id`,
    { type: QueryTypes.SELECT },
  );
  const bookings = (
    await sequelize.query<BookingRow>(
      `SELECT id, student_user_id, status, payment_status, paid_amount_amd, paid_at, payment_notes, prepaid_meta
       FROM bookings
       WHERE prepaid_meta IS NOT NULL`,
      { type: QueryTypes.SELECT },
    )
  ).map(parseBooking);
  const profiles = await sequelize.query<ProfileRow>(
    `SELECT user_id, package_id FROM student_profiles WHERE package_id IS NOT NULL`,
    { type: QueryTypes.SELECT },
  );
  const financeIds = [
    ...new Set(orders.map((o) => Number(o.finance_transaction_id)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const financeRows =
    financeIds.length === 0
      ? []
      : await sequelize.query<FinanceRow>(
          `SELECT id, status, entry_type, gross_amd
           FROM finance_transactions
           WHERE id IN (:ids)`,
          { replacements: { ids: financeIds }, type: QueryTypes.SELECT },
        );
  const financeById = new Map(financeRows.map((row) => [Number(row.id), row]));

  const byOrderId = new Map<number, ParsedBooking[]>();
  for (const booking of bookings) {
    if (booking.packageOrderId <= 0) continue;
    const list = byOrderId.get(booking.packageOrderId) ?? [];
    list.push(booking);
    byOrderId.set(booking.packageOrderId, list);
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} orders=${orders.length} bookingsWithMeta=${bookings.length} profilesWithPackage=${profiles.length}`);

  const cancelOrderIds = new Set<number>();
  const childUpdates: Array<{
    booking: ParsedBooking;
    paid: boolean;
    studentName: string;
    packageName: string;
  }> = [];

  for (const order of orders) {
    const linked = byOrderId.get(order.id) ?? [];
    const purchase = linked.filter((row) => row.packagePurchase && row.studentUserId === order.student_user_id);
    const livePurchase = purchase.filter((row) => !row.terminal);
    const historicalPurchase = purchase.filter((row) => row.terminal);
    const attached = ACTIVE_ORDER_STATUSES.has(String(order.status ?? '').trim().toLowerCase());
    const source = latest(livePurchase.length > 0 ? livePurchase : historicalPurchase);
    const packagePaid = source
      ? bookingIsPaid(source)
      : orderLooksPaid(order, financeById.get(Number(order.finance_transaction_id)));

    const liveLinked = linked.filter((row) => !row.terminal && row.studentUserId === order.student_user_id);
    if (attached && liveLinked.length === 0) {
      cancelOrderIds.add(order.id);
      console.log(
        `${APPLY ? 'detach' : 'would detach'} order ${order.id} student ${order.student_user_id} ${order.student_name} package "${order.package_name}" (no booking)`,
      );
    }

    for (const child of linked) {
      if (!isCreditLesson(child) || child.studentUserId !== order.student_user_id) continue;
      const already =
        packagePaid
          ? child.paymentStatus === 'paid' && !String(child.paymentNotes ?? '').includes(UNPAID_NOTE) && child.meta.unpaidBecausePackageUnpaid !== true
          : child.paymentStatus === 'unpaid' && String(child.paymentNotes ?? '').includes(UNPAID_NOTE);
      if (already) continue;
      childUpdates.push({
        booking: child,
        paid: packagePaid,
        studentName: order.student_name,
        packageName: order.package_name,
      });
      console.log(
        `${APPLY ? 'payment' : 'would set payment'} booking ${child.id} student ${order.student_name} "${order.package_name}" -> ${packagePaid ? 'paid' : 'unpaid'}`,
      );
    }
  }

  const profilePlans: Array<{ userId: number; packageId: number | null; nextOrderId: number | null }> = [];
  for (const profile of profiles) {
    const userId = Number(profile.user_id);
    const packageId = Number(profile.package_id);
    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(packageId) || packageId <= 0) continue;
    const remaining = orders.filter(
      (order) =>
        order.student_user_id === userId &&
        ACTIVE_ORDER_STATUSES.has(String(order.status ?? '').trim().toLowerCase()) &&
        !cancelOrderIds.has(order.id),
    );
    const stillThisPackage = remaining.some((order) => order.package_id === packageId);
    const livePurchaseForPackage = bookings.some(
      (row) =>
        row.studentUserId === userId &&
        !row.terminal &&
        row.packagePurchase &&
        (row.packageId === packageId ||
          remaining.some((order) => order.id === row.packageOrderId && order.package_id === packageId)),
    );
    if (stillThisPackage || livePurchaseForPackage) continue;
    const next =
      remaining.reduce<OrderRow | null>((best, order) => (!best || order.id > best.id ? order : best), null) ?? null;
    profilePlans.push({
      userId,
      packageId: next ? next.package_id : null,
      nextOrderId: next ? next.id : null,
    });
    console.log(
      `${APPLY ? 'profile' : 'would update profile'} student ${userId} package ${packageId} -> ${next ? `package ${next.package_id}` : 'none'}`,
    );
  }

  const unpaidByStudent = new Map<number, { name: string; bookingIds: number[] }>();
  for (const update of childUpdates) {
    if (update.paid) continue;
    const current = unpaidByStudent.get(update.booking.studentUserId) ?? { name: update.studentName, bookingIds: [] };
    current.bookingIds.push(update.booking.id);
    unpaidByStudent.set(update.booking.studentUserId, current);
  }

  console.log(
    `summary detachOrders=${cancelOrderIds.size} profileUpdates=${profilePlans.length} paymentUpdates=${childUpdates.length} unpaidStudents=${unpaidByStudent.size}`,
  );

  if (!APPLY) {
    await sequelize.close();
    return;
  }

  await sequelize.transaction(async (transaction) => {
    for (const orderId of cancelOrderIds) {
      const order = orders.find((row) => row.id === orderId);
      const suffix = 'Removed because no package booking exists.';
      const base = String(order?.note ?? '').trim();
      const note = (base && !base.includes(suffix) ? `${base} | ${suffix}` : base || suffix).slice(0, 255);
      await PackageOrder.update({ status: 'cancelled', note }, { where: { id: orderId }, transaction });
    }

    for (const update of childUpdates) {
      const meta = { ...update.booking.meta };
      if (update.paid) delete meta.unpaidBecausePackageUnpaid;
      else meta.unpaidBecausePackageUnpaid = true;
      await Booking.update(
        {
          paymentStatus: update.paid ? 'paid' : 'unpaid',
          paidAmountAmd: 0,
          ...(update.paid ? {} : { paidAt: null }),
          paymentNotes: notesWithUnpaidReason(update.booking.paymentNotes, !update.paid),
          prepaidMeta: meta,
        },
        { where: { id: update.booking.id }, transaction },
      );
    }

    for (const plan of profilePlans) {
      const profile = await StudentProfile.findOne({
        where: { userId: plan.userId },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!profile) continue;
      if (plan.packageId == null || plan.nextOrderId == null) {
        await profile.update(
          {
            packageId: null,
            lessonsTotal: 0,
            lessonsCompleted: 0,
            theoryLessonsTotal: 0,
            theoryLessonsCompleted: 0,
          },
          { transaction },
        );
        continue;
      }
      await profile.update({ packageId: plan.packageId }, { transaction });
      await StudentEntitlementsService.syncProfileCountersFromOrderBalances(plan.userId, plan.nextOrderId, transaction);
    }

    for (const [studentUserId, info] of unpaidByStudent) {
      const ids = info.bookingIds.join(', ');
      await NotificationService.createForRoles(
        ['admin', 'super_admin'],
        {
          type: 'BOOKING_PAYMENT_REMINDER',
          title: 'Package not paid',
          message: `${info.name} has lesson bookings (${ids}) marked unpaid because the package was not paid.`,
          entityType: 'booking',
          entityId: String(info.bookingIds[0] ?? studentUserId),
          dedupeKey: `package-unpaid-children:student:${studentUserId}`,
        },
        transaction,
      );
    }
  });

  console.log('applied');
  await sequelize.close();
}

void main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch {
    /* already closed */
  }
  process.exit(1);
});
