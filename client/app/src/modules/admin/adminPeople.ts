import type { Instructor } from "src/data/instructors";
import {
  filterInstructorsServingBranches,
  withSelectedInstructorByName,
  withSelectedInstructorsByIds,
} from "src/modules/instructors/instructor-booking";

/** Instructor display names for `<select>` (from API-loaded instructors). */
export function allInstructorNames(instructors: readonly Instructor[]): string[] {
  return [...instructors].map((i) => i.name).sort((a, b) => a.localeCompare(b));
}

/** Active theory instructors who serve at least one of the given branches (N:N). */
export function theoryInstructorsForBranch(
  instructors: readonly Instructor[],
  branchId: string | null | undefined,
  opts?: { selectedName?: string; selectedIds?: readonly string[] },
): Instructor[] {
  const branchIds = branchId ? [branchId] : [];
  const filtered = filterInstructorsServingBranches(
    instructors.filter((i) => i.status === "active" && i.teachesTheory),
    branchIds,
  );
  let list = withSelectedInstructorByName(filtered, opts?.selectedName, instructors);
  list = withSelectedInstructorsByIds(list, opts?.selectedIds, instructors);
  return list;
}
