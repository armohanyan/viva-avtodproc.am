import type { FinanceLedgerPeriod, FinanceOverviewPeriod } from "src/types/finance.types";

export function monthRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function ledgerPeriodRange(period: FinanceLedgerPeriod, reference = new Date()): { start: Date; end: Date } {
  const ref = reference;
  if (period === "day") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
    return { start, end };
  }
  if (period === "week") {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }
  return monthRange(ref);
}

export function financePeriodMonthCount(p: FinanceOverviewPeriod): number {
  switch (p) {
    case "1m":
      return 1;
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "12m":
      return 12;
  }
}

export function rollingCalendarMonthsRange(monthCount: number, reference = new Date()): { start: Date; end: Date } {
  const { end } = monthRange(reference);
  const start = new Date(reference.getFullYear(), reference.getMonth() - (monthCount - 1), 1);
  return { start, end };
}

/** First day of each month from `rangeStart` through `rangeEnd` (same month granularity as `rangeEnd`). */
export function monthStartsInRange(rangeStart: Date, rangeEnd: Date): Date[] {
  const out: Date[] = [];
  let y = rangeStart.getFullYear();
  let m = rangeStart.getMonth();
  const yEnd = rangeEnd.getFullYear();
  const mEnd = rangeEnd.getMonth();
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    out.push(new Date(y, m, 1));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export function expenseDateInRange(dateIso: string, monthStart: Date, monthEnd: Date): boolean {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  return d >= monthStart && d <= monthEnd;
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
