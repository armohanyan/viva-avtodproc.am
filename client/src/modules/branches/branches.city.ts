import type { Branch } from "./branch.types";

export function branchesInCity(branches: readonly Branch[], cityId: string): Branch[] {
  return branches.filter((b) => b.cityId === cityId);
}

export function branchIdsInCity(branches: readonly Branch[], cityId: string): string[] {
  return branchesInCity(branches, cityId).map((b) => b.id);
}

export function branchOptionLabel(branch: Branch, cityName: string): string {
  const cn = cityName.trim();
  return cn ? `${cn} · ${branch.name}` : branch.name;
}
