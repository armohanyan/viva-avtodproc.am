function isoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export type HalfMonthPeriod = { start: string; end: string };

/** Half-month pay period (1–15 or 16–end) containing the given date. */
export function halfMonthPeriod(date: Date): HalfMonthPeriod {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (date.getDate() <= 15) {
    return { start: isoDate(y, m, 1), end: isoDate(y, m, 15) };
  }
  return { start: isoDate(y, m, 16), end: isoDate(y, m, new Date(y, m + 1, 0).getDate()) };
}

/** Half-month period immediately before the one containing the given date. */
export function previousHalfMonthPeriod(date: Date): HalfMonthPeriod {
  if (date.getDate() <= 15) {
    const prevMonthMid = new Date(date.getFullYear(), date.getMonth(), 0);
    return halfMonthPeriod(prevMonthMid);
  }
  return halfMonthPeriod(new Date(date.getFullYear(), date.getMonth(), 1));
}
