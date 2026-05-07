/** Local session window for theory cohorts; empty if both sides unset. */
export function formatCohortSessionTimeLabel(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const a = (start && String(start).trim()) || "";
  const b = (end && String(end).trim()) || "";
  if (a && b) return `${a} – ${b}`;
  if (a) return a;
  if (b) return b;
  return "";
}
