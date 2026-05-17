import type { TheoryCohortOption } from "./types";

/** Cohorts that can be chosen for new group-theory bookings (matches server-side allowlist). */
export function isTheoryCohortBookableStatus(status: string): boolean {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (["cancelled", "canceled", "completed", "archived", "closed"].includes(s)) return false;
  return ["active", "upcoming", "scheduled", "planned", "open", "draft"].includes(s);
}

/** When a branch is selected, only cohorts attached to that branch are shown. */
export function filterTheoryCohortsByBranchId(
  cohorts: readonly TheoryCohortOption[],
  branchId: string | null | undefined,
): TheoryCohortOption[] {
  const bid = String(branchId ?? "").trim();
  if (!bid) return [...cohorts];
  return cohorts.filter((c) => c.branchId === bid);
}
