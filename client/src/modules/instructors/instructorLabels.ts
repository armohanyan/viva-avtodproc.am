import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import { branchNameById, branchOptionLabel } from "src/modules/branches";
import type { City } from "src/modules/cities";
import { cityNameById } from "src/modules/cities";

export function formatInstructorBranches(ins: Instructor, allBranches: readonly Branch[], citiesList: readonly City[]): string {
  if (ins.availableBranchIds.length === 0) return "—";
  return ins.availableBranchIds
    .map((id) => {
      const b = allBranches.find((x) => x.id === id);
      return b ? branchOptionLabel(b, cityNameById(citiesList, b.cityId)) : branchNameById(allBranches, id);
    })
    .join("; ");
}
