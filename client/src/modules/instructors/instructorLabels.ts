import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import { branchNameById, branchOptionLabel } from "src/modules/branches";
import type { City } from "src/modules/cities";
import { cityNameById } from "src/modules/cities";

export function formatInstructorCities(ins: Instructor, allBranches: readonly Branch[], citiesList: readonly City[]): string {
  const cityIds = new Set<string>();
  for (const id of ins.availableBranchIds) {
    const b = allBranches.find((x) => x.id === id);
    if (b) cityIds.add(b.cityId);
  }
  if (cityIds.size === 0) return "—";
  return [...cityIds].map((cid) => cityNameById(citiesList, cid)).join(", ");
}

export function formatInstructorBranches(ins: Instructor, allBranches: readonly Branch[], citiesList: readonly City[]): string {
  if (ins.availableBranchIds.length === 0) return "—";
  return ins.availableBranchIds
    .map((id) => {
      const b = allBranches.find((x) => x.id === id);
      return b ? branchOptionLabel(b, cityNameById(citiesList, b.cityId)) : branchNameById(allBranches, id);
    })
    .join("; ");
}

/** Public `location` string derived from branch → city names (max 128 chars for API). */
export function deriveInstructorLocationFromBranches(
  branchIds: readonly string[],
  allBranches: readonly Branch[],
  citiesList: readonly City[],
  fallback: string,
): string {
  const synthetic = { availableBranchIds: [...branchIds] } as Instructor;
  const label = formatInstructorCities(synthetic, allBranches, citiesList);
  if (label === "—" || !label.trim()) return fallback.slice(0, 128);
  return label.slice(0, 128);
}
