import type { TranslationKey } from "src/lib/i18n";
import type {
  ExpenseBreakdownRow,
  FinanceTx,
  TxChannel,
  TxMethod,
  TxStatus,
} from "src/types/finance.types";
import { expenseDateInRange } from "src/utils/date.utils";

export type {
  ExpenseBreakdownRow,
  FinanceLedgerPeriod,
  FinanceOverviewPeriod,
  FinanceTx,
  ManualFormShape,
  TxChannel,
  TxEntryType,
  TxExpenseKind,
  TxMethod,
  TxSource,
  TxStatus,
} from "src/types/finance.types";

export { formatAmd, parseAmdInput } from "src/utils/currency.utils";
export {
  expenseDateInRange,
  financePeriodMonthCount,
  ledgerPeriodRange,
  monthRange,
  monthStartsInRange,
  rollingCalendarMonthsRange,
  toDatetimeLocalValue,
} from "src/utils/date.utils";

export function grossCompletedInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let sum = 0;
  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "income" || tx.status !== "completed") continue;
    const d = new Date(tx.createdAt);
    if (d < rangeStart || d > rangeEnd) continue;
    sum += tx.grossAmd;
  }
  return sum;
}

export function financeOutcomeTotalInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let sum = 0;
  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "expense" || tx.status !== "completed") continue;
    const d = new Date(tx.createdAt);
    if (d < rangeStart || d > rangeEnd) continue;
    sum += tx.grossAmd;
  }
  return sum;
}

/** Ledger expenses in range, excluding customer booking refunds (operating costs only). */
export function financeOperatingExpenseTotalInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let sum = 0;
  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "expense" || tx.status !== "completed") continue;
    if (tx.expenseKind === "booking_refund") continue;
    const d = new Date(tx.createdAt);
    if (d < rangeStart || d > rangeEnd) continue;
    sum += tx.grossAmd;
  }
  return sum;
}

/** Completed `booking_refund` expense rows in range (money returned to customers). */
export function bookingRefundExpenseCompletedInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let sum = 0;
  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "expense" || tx.status !== "completed") continue;
    if (tx.expenseKind !== "booking_refund") continue;
    const d = new Date(tx.createdAt);
    if (d < rangeStart || d > rangeEnd) continue;
    sum += tx.grossAmd;
  }
  return sum;
}

/** Legacy ledger: income rows marked `refunded` (before separate refund expense lines). */
export function legacyRefundedIncomeGrossInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let sum = 0;
  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "income" || tx.status !== "refunded") continue;
    const d = new Date(tx.createdAt);
    if (d < rangeStart || d > rangeEnd) continue;
    sum += tx.grossAmd;
  }
  return sum;
}

export function totalRefundMoneyInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  return bookingRefundExpenseCompletedInRange(transactions, rangeStart, rangeEnd) +
    legacyRefundedIncomeGrossInRange(transactions, rangeStart, rangeEnd);
}

/** Net intake: completed lesson payments minus refunds (new expense rows + legacy refunded income). */
export function netRevenueAfterRefundsInRange(
  transactions: readonly FinanceTx[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const gross = grossCompletedInRange(transactions, rangeStart, rangeEnd);
  return gross - bookingRefundExpenseCompletedInRange(transactions, rangeStart, rangeEnd) -
    legacyRefundedIncomeGrossInRange(transactions, rangeStart, rangeEnd);
}

export function expensesTotalInRange(
  rows: readonly { date: string; amount: number }[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let sum = 0;
  for (const row of rows) {
    if (!expenseDateInRange(row.date, rangeStart, rangeEnd)) continue;
    sum += Math.abs(row.amount);
  }
  return sum;
}

export function netOf(tx: FinanceTx): number {
  return tx.grossAmd - tx.feeAmd;
}

export const statusClass: Record<TxStatus, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-200 text-slate-700",
};

export function statusTKey(s: TxStatus): TranslationKey {
  switch (s) {
    case "completed":
      return "financeStatusCompleted";
    case "pending":
      return "financeStatusPending";
    case "failed":
      return "financeStatusFailed";
    case "refunded":
      return "financeStatusRefunded";
  }
}

export function channelTKey(c: TxChannel): TranslationKey {
  switch (c) {
    case "online":
      return "financeChannelOnline";
    case "pos":
      return "financeChannelPos";
    case "office":
      return "financeChannelOffice";
    case "bank":
      return "financeChannelBank";
  }
}

export function methodTKey(m: TxMethod): TranslationKey {
  switch (m) {
    case "card":
      return "financeMethodCard";
    case "idram":
      return "financeMethodIdram";
    case "cash":
      return "financeMethodCash";
    case "transfer":
      return "financeMethodTransfer";
  }
}

/** Completed income in [monthStart, monthEnd] grouped by channel + method. */
export function incomeBreakdownCompletedInRange(
  transactions: readonly FinanceTx[],
  monthStart: Date,
  monthEnd: Date,
): { key: string; channel: TxChannel; method: TxMethod; gross: number; net: number; count: number }[] {
  const map = new Map<string, { channel: TxChannel; method: TxMethod; gross: number; net: number; count: number }>();
  for (const tx of transactions) {
    if ((tx.entryType ?? "income") !== "income" || tx.status !== "completed") continue;
    const d = new Date(tx.createdAt);
    if (d < monthStart || d > monthEnd) continue;
    const key = `${tx.channel}|${tx.method}`;
    const prev = map.get(key) ?? { channel: tx.channel, method: tx.method, gross: 0, net: 0, count: 0 };
    prev.gross += tx.grossAmd;
    prev.net += netOf(tx);
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.entries()]
    .map(([key, prev]) => ({
      key,
      channel: prev.channel,
      method: prev.method,
      gross: prev.gross,
      net: prev.net,
      count: prev.count,
    }))
    .sort((a, b) => b.gross - a.gross);
}

export function outcomesBreakdownInRange(
  rows: readonly { date: string; amount: number }[],
  monthStart: Date,
  monthEnd: Date,
): ExpenseBreakdownRow[] {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    if (!expenseDateInRange(row.date, monthStart, monthEnd)) continue;
    total += Math.abs(row.amount);
    count += 1;
  }
  if (count === 0) return [];
  return [{ key: "fleet", total, count }];
}
