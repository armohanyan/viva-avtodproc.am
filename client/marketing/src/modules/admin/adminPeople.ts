import type { Instructor } from "src/data/instructors";

/** Instructor display names for `<select>` (from API-loaded instructors). */
export function allInstructorNames(instructors: readonly Instructor[]): string[] {
  return [...instructors].map((i) => i.name).sort((a, b) => a.localeCompare(b));
}
