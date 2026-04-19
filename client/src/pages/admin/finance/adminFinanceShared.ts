import type { TranslationKey } from "src/lib/i18n";

export type TxStatus = "completed" | "pending" | "failed" | "refunded";
export type TxChannel = "online" | "pos" | "office" | "bank";
export type TxMethod = "card" | "idram" | "cash" | "transfer";
export type TxSource = "system" | "manual";

export type ManualFormShape = {
  studentDirectoryId: string;
  customer: string;
  email: string;
  description: string;
  branchId: string;
  channel: TxChannel;
  method: TxMethod;
  grossStr: string;
  feeStr: string;
  status: TxStatus;
  ref: string;
  datetimeLocal: string;
  bookingIdStr: string;
};

export type FinanceTx = {
  id: number;
  createdAt: string;
  customer: string;
  email: string;
  description: string;
  branchId: string;
  channel: TxChannel;
  method: TxMethod;
  grossAmd: number;
  feeAmd: number;
  status: TxStatus;
  providerRef: string;
  source: TxSource;
  bookingId: string | null;
};

export function monthRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatAmd(n: number): string {
  return `${n.toLocaleString("en-US")} ֏`;
}

export function parseAmdInput(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/[\s,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n);
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

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Completed income in [monthStart, monthEnd] grouped by channel + method. */
export function incomeBreakdownCompletedInRange(
  transactions: readonly FinanceTx[],
  monthStart: Date,
  monthEnd: Date,
): { key: string; channel: TxChannel; method: TxMethod; gross: number; net: number; count: number }[] {
  const map = new Map<string, { channel: TxChannel; method: TxMethod; gross: number; net: number; count: number }>();
  for (const tx of transactions) {
    if (tx.status !== "completed") continue;
    const d = new Date(tx.createdAt);
    if (d < monthStart || d > monthEnd) continue;
    const key = `${tx.channel}|${tx.method}`;
    const prev = map.get(key) ?? { channel: tx.channel, method: tx.method, gross: 0, net: 0, count: 0 };
    prev.gross += tx.grossAmd;
    prev.net += netOf(tx);
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.gross - a.gross);
}

export function expenseDateInRange(dateIso: string, monthStart: Date, monthEnd: Date): boolean {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  return d >= monthStart && d <= monthEnd;
}

export type ExpenseBreakdownRow = {
  key: string;
  channel: TxChannel;
  method: TxMethod;
  total: number;
  count: number;
};

export function outcomesBreakdownInRange(
  rows: readonly { date: string; amount: number; channel?: TxChannel; method?: TxMethod }[],
  monthStart: Date,
  monthEnd: Date,
): ExpenseBreakdownRow[] {
  const map = new Map<string, { channel: TxChannel; method: TxMethod; total: number; count: number }>();
  for (const row of rows) {
    if (!expenseDateInRange(row.date, monthStart, monthEnd)) continue;
    const channel = row.channel ?? "office";
    const method = row.method ?? "cash";
    const key = `${channel}|${method}`;
    const prev = map.get(key) ?? { channel, method, total: 0, count: 0 };
    prev.total += row.amount;
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).map((v) => ({ ...v, key: `${v.channel}|${v.method}` }));
}
