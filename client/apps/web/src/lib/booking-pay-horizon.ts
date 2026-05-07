/**
 * Mirrors backend `calendar-month.util.ts`: same calendar day next month from `todayIso` (YYYY-MM-DD).
 */
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const m = ISO_RE.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

export function addOneCalendarMonth(isoDate: string): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) throw new Error(`Invalid ISO date: ${isoDate}`);
  const { y, m, d } = parts;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const dim = lastDayOfMonth(nextY, nextM);
  const day = Math.min(d, dim);
  return `${String(nextY).padStart(4, "0")}-${String(nextM).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Lesson date is on or before the “pay now / hold” horizon (same calendar day next month from today). */
export function isLessonOnOrBeforePayHorizon(lessonIso: string, todayIso: string): boolean {
  if (!parseIsoDateParts(lessonIso) || !parseIsoDateParts(todayIso)) return false;
  const horizon = addOneCalendarMonth(todayIso);
  return lessonIso <= horizon;
}
