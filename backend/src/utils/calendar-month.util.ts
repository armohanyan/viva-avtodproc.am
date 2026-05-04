/**
 * Date-only (YYYY-MM-DD) helpers using the same calendar day next month rule:
 * e.g. 2026-04-13 → 2026-05-13. If the target month is shorter (Jan 31 → Feb),
 * the day is clamped to that month’s last day.
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const m = ISO_RE.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** Last calendar day of month `m` (1–12) in year `y`. */
export function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Add one calendar month to a DATEONLY string. */
export function addOneCalendarMonth(isoDate: string): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) throw new Error(`Invalid ISO date: ${isoDate}`);
  const { y, m, d } = parts;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const dim = lastDayOfMonth(nextY, nextM);
  const day = Math.min(d, dim);
  return `${String(nextY).padStart(4, '0')}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Subtract one calendar month from a DATEONLY string (inverse of {@link addOneCalendarMonth} rules). */
export function subtractOneCalendarMonth(isoDate: string): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) throw new Error(`Invalid ISO date: ${isoDate}`);
  const { y, m, d } = parts;
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const dim = lastDayOfMonth(prevY, prevM);
  const day = Math.min(d, dim);
  return `${String(prevY).padStart(4, '0')}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Today as UTC YYYY-MM-DD (matches `Date.toISOString().slice(0, 10)` for server-local “today” in UTC). */
export function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lesson is in the “must be able to pay now” horizon: on or before the same calendar day next month from `todayIso`.
 * Example: today 2026-04-13 → horizon 2026-05-13; lesson 2026-05-13 returns true; 2026-05-14 returns false.
 */
export function isLessonOnOrBeforePayHorizon(lessonIso: string, todayIso: string): boolean {
  if (!parseIsoDateParts(lessonIso) || !parseIsoDateParts(todayIso)) return false;
  const horizon = addOneCalendarMonth(todayIso);
  return lessonIso <= horizon;
}
