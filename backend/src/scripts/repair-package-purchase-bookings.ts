/**
 * One-off repair: package orders that have no package-sale booking.
 *
 * For each package order:
 * - booking already exists for that order -> leave it
 * - otherwise create a package-sale booking
 * - if a completed package payment already exists, attach it to that booking
 * - if no payment was recorded, the booking stays unpaid (no invented cash)
 *
 * Dry-run is the default. Pass --apply to write.
 *
 * Production (on the server, after this file is deployed):
 *   cd /var/www/viva-avtodproc.am/backend
 *   npx tsx src/scripts/repair-package-purchase-bookings.ts
 *   npx tsx src/scripts/repair-package-purchase-bookings.ts --apply
 */
import 'dotenv/config';
import { QueryTypes } from 'sequelize';
import { connectDatabase, sequelize } from '../database/sequelize';
import { Booking, FinanceTransaction, PackageOrder } from '../models';
import { parseAmdFromPriceDisplay } from '../utils/price-display.util';

type OrderRow = {
  id: number;
  student_user_id: number;
  package_id: number;
  status: string;
  paid_at: Date | null;
  finance_transaction_id: number | null;
  created_at: Date;
  package_name: string;
  price_display: string;
  student_name: string;
  branch_id: number | null;
};

type FinanceRow = {
  id: number;
  customer: string;
  description: string;
  gross_amd: number;
  status: string;
  method: string;
  booking_id: number | null;
  branch_id: number;
  created_at: Date;
  created_by_user_id: number | null;
};

const APPLY = process.argv.includes('--apply');

function yerevanDateIso(raw: Date | string): string {
  const d = raw instanceof Date ? raw : new Date(raw);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

async function findPurchaseBookingId(orderId: number): Promise<number | null> {
  const rows = await sequelize.query<{ id: number }>(
    `SELECT b.id
     FROM bookings b
     WHERE CAST(JSON_EXTRACT(b.prepaid_meta, '$.packageOrderId') AS UNSIGNED) = :orderId
       AND JSON_CONTAINS(COALESCE(b.prepaid_meta, CAST('{}' AS JSON)), 'true', '$.packagePurchase')
     ORDER BY b.id
     LIMIT 1`,
    { replacements: { orderId }, type: QueryTypes.SELECT },
  );
  const id = Number(rows[0]?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function findCreditLessonPayment(orderId: number, studentUserId: number): Promise<FinanceRow | null> {
  const rows = await sequelize.query<FinanceRow>(
    `SELECT f.id, f.customer, f.description, f.gross_amd, f.status, f.method,
            f.booking_id, f.branch_id, f.created_at, f.created_by_user_id
     FROM finance_transactions f
     INNER JOIN bookings b ON b.id = f.booking_id
     WHERE f.entry_type = 'income'
       AND f.status = 'completed'
       AND b.student_user_id = :studentUserId
       AND COALESCE(b.total_price_amd, 0) = 0
       AND CAST(JSON_EXTRACT(b.prepaid_meta, '$.packageOrderId') AS UNSIGNED) = :orderId
       AND COALESCE(JSON_CONTAINS(COALESCE(b.prepaid_meta, CAST('{}' AS JSON)), 'true', '$.packagePurchase'), 0) = 0
     ORDER BY f.id
     LIMIT 1`,
    { replacements: { orderId, studentUserId }, type: QueryTypes.SELECT },
  );
  return rows[0] ?? null;
}

async function findUnlinkedPackagePayment(
  studentName: string,
  priceAmd: number,
  usedIds: Set<number>,
): Promise<FinanceRow | null> {
  const rows = await sequelize.query<FinanceRow>(
    `SELECT f.id, f.customer, f.description, f.gross_amd, f.status, f.method,
            f.booking_id, f.branch_id, f.created_at, f.created_by_user_id
     FROM finance_transactions f
     WHERE f.entry_type = 'income'
       AND f.status = 'completed'
       AND f.booking_id IS NULL
       AND f.description LIKE 'Package:%'
       AND f.gross_amd = :priceAmd
       AND LOWER(TRIM(f.customer)) = LOWER(TRIM(:studentName))
     ORDER BY f.id`,
    { replacements: { priceAmd, studentName }, type: QueryTypes.SELECT },
  );
  return rows.find((row) => !usedIds.has(Number(row.id))) ?? null;
}

async function main() {
  await connectDatabase();
  const orders = await sequelize.query<OrderRow>(
    `SELECT o.id, o.student_user_id, o.package_id, o.status, o.paid_at, o.finance_transaction_id, o.created_at,
            p.name AS package_name, p.price_display,
            u.name AS student_name,
            sp.branch_id
     FROM package_orders o
     INNER JOIN packages p ON p.id = o.package_id
     INNER JOIN users u ON u.id = o.student_user_id
     LEFT JOIN student_profiles sp ON sp.user_id = o.student_user_id
     WHERE o.status NOT IN ('cancelled', 'refunded')
     ORDER BY o.id`,
    { type: QueryTypes.SELECT },
  );

  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} package orders: ${orders.length}`);
  const usedFinanceIds = new Set<number>();

  for (const order of orders) {
    const existingId = await findPurchaseBookingId(order.id);
    if (existingId != null) {
      console.log(`skip order ${order.id}: purchase booking ${existingId} already exists (${order.student_name})`);
      continue;
    }

    const catalogPrice = parseAmdFromPriceDisplay(order.price_display);
    const lessonPayment = await findCreditLessonPayment(order.id, order.student_user_id);
    const unlinked =
      lessonPayment == null && catalogPrice > 0
        ? await findUnlinkedPackagePayment(order.student_name, catalogPrice, usedFinanceIds)
        : null;
    const finance = lessonPayment ?? unlinked;
    if (finance) usedFinanceIds.add(Number(finance.id));

    const total = catalogPrice > 0 ? catalogPrice : Math.max(0, Number(finance?.gross_amd ?? 0));
    const paid = finance ? Math.max(0, Number(finance.gross_amd)) : 0;
    const paymentStatus = paid <= 0 ? 'unpaid' : paid >= total && total > 0 ? 'paid' : 'partial';
    const branchId = Number(order.branch_id ?? finance?.branch_id ?? 0);
    const dateIso = yerevanDateIso(order.created_at);

    if (!Number.isFinite(branchId) || branchId <= 0) {
      console.log(`skip order ${order.id}: no branch for ${order.student_name}`);
      continue;
    }

    console.log(
      `${APPLY ? 'write' : 'would write'} order ${order.id} -> booking for ${order.student_name} ` +
        `"${order.package_name}" date ${dateIso} total ${total} paid ${paid} ` +
        `payment ${finance ? finance.id : 'none'}`,
    );

    if (!APPLY) continue;

    await sequelize.transaction(async (transaction) => {
      const created = await Booking.create(
        {
          studentUserId: order.student_user_id,
          instructorUserId: null,
          branchId,
          dateIso,
          time: '00:00',
          endTime: null,
          totalPriceAmd: total,
          lessonType: 'practical',
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
          paidAt: finance ? new Date(finance.created_at) : null,
          holdExpiresAt: null,
          prepaidMeta: {
            packagePurchase: true,
            packageOrderId: order.id,
            packageId: order.package_id,
            packageName: order.package_name,
          },
          paymentStatus,
          paidAmountAmd: paid,
          lessonCompletionStatus: null,
          createdByType: 'admin',
          createdByUserId: finance?.created_by_user_id ?? null,
        },
        { transaction },
      );

      if (finance) {
        await FinanceTransaction.update(
          { bookingId: created.id, description: `Package: ${order.package_name}` },
          { where: { id: finance.id }, transaction },
        );
        await PackageOrder.update(
          {
            financeTransactionId: finance.id,
            paidAt: new Date(finance.created_at),
            ...(paymentStatus === 'paid' ? { status: 'paid' } : {}),
          },
          { where: { id: order.id }, transaction },
        );
      }
      console.log(`order ${order.id} -> booking ${created.id} payment ${finance ? finance.id : 'none'}`);
    });
  }

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
