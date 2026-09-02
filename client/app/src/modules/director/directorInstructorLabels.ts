import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import { branchDisplayLabel } from "src/modules/branches";

function formatDirectorInstructorBranchCodes(
  instructor: Instructor,
  allBranches: readonly Branch[],
): string {
  if (instructor.availableBranchIds.length === 0) return "";
  return instructor.availableBranchIds
    .map((id) => {
      const b = allBranches.find((x) => String(x.id) === String(id));
      return b ? branchDisplayLabel(b) : "";
    })
    .filter(Boolean)
    .join(", ");
}

export function formatDirectorInstructorLabel(
  instructor: Instructor,
  branches: readonly Branch[],
): string {
  const branchesLabel = formatDirectorInstructorBranchCodes(instructor, branches);
  if (!branchesLabel) return instructor.name;
  return `${instructor.name} · ${branchesLabel}`;
}

export function directorInstructorLabelById(
  id: number | null | undefined,
  instructors: readonly Instructor[],
  branches: readonly Branch[],
): string {
  if (id == null) return "—";
  const instructor = instructors.find((i) => String(i.id) === String(id));
  if (!instructor) return `#${id}`;
  return formatDirectorInstructorLabel(instructor, branches);
}
