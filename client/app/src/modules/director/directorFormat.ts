/** Paid lesson slot count for director reports and salary (whole numbers). */
export function formatDirectorLessonSlots(slots: number, opts?: { average?: boolean }): string {
  const n = Math.max(0, Number(slots) || 0);
  if (opts?.average) return (Math.round(n * 10) / 10).toFixed(1);
  return String(Math.round(n));
}

export function directorHoursNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** @deprecated Use formatDirectorLessonSlots — kept for any stale imports. */
export function formatDirectorHours(hours: number): string {
  return formatDirectorLessonSlots(hours);
}
