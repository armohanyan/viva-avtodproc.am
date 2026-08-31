import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import type { City } from "src/modules/cities";
import { formatInstructorBranches } from "src/modules/instructors/instructorLabels";

export function formatDirectorInstructorLabel(
  instructor: Instructor,
  branches: readonly Branch[],
  cities: readonly City[],
): string {
  const branchesLabel = formatInstructorBranches(instructor, branches, cities);
  if (!branchesLabel || branchesLabel === "—") return instructor.name;
  return `${instructor.name} · ${branchesLabel}`;
}

export function directorInstructorLabelById(
  id: number | null | undefined,
  instructors: readonly Instructor[],
  branches: readonly Branch[],
  cities: readonly City[],
): string {
  if (id == null) return "—";
  const instructor = instructors.find((i) => String(i.id) === String(id));
  if (!instructor) return `#${id}`;
  return formatDirectorInstructorLabel(instructor, branches, cities);
}
