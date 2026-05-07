/** Cohorts that can be chosen for new group-theory bookings (matches server-side allowlist). */
export function isTheoryCohortBookableStatus(status: string): boolean {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (["cancelled", "canceled", "completed", "archived", "closed"].includes(s)) return false;
  return ["active", "upcoming", "scheduled", "planned", "open", "draft"].includes(s);
}
