import type { Instructor } from "src/data/instructors";
import {
  withSelectedInstructorByName,
  withSelectedInstructorsByIds,
} from "src/modules/instructors/instructor-booking";

/** Instructor display names for `<select>` (from API-loaded instructors). */
export function allInstructorNames(instructors: readonly Instructor[]): string[] {
  return [...instructors].map((i) => i.name).sort((a, b) => a.localeCompare(b));
}

/**
 * Active instructors with theory teaching enabled.
 * Not filtered by branch — theory-group cohorts may use a different branch than the instructor's practical branches.
 */
export function activeTheoryInstructors(
  instructors: readonly Instructor[],
  opts?: { selectedName?: string; selectedIds?: readonly string[] },
): Instructor[] {
  const filtered = instructors.filter((i) => i.status === "active" && i.teachesTheory);
  let list = withSelectedInstructorByName(filtered, opts?.selectedName, instructors);
  list = withSelectedInstructorsByIds(list, opts?.selectedIds, instructors);
  return list;
}
