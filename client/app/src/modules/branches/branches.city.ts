import type { Branch } from "./branch.types";

export function branchesInCity(branches: readonly Branch[], cityId: string): Branch[] {
  const want = String(cityId);
  return branches.filter((b) => String(b.cityId) === want);
}

/** Branches for the selected city, including other city rows that share the same name. */
export function branchesMatchingCityName(
  branches: readonly Branch[],
  cities: readonly { id: string; name: string }[],
  cityId: string,
): Branch[] {
  const selected = cities.find((c) => String(c.id) === String(cityId));
  if (!selected) return branchesInCity(branches, cityId);
  const nameKey = selected.name.trim().toLowerCase();
  const ids = new Set(
    cities.filter((c) => c.name.trim().toLowerCase() === nameKey).map((c) => String(c.id)),
  );
  return branches.filter((b) => ids.has(String(b.cityId)));
}

export function branchIdsInCity(branches: readonly Branch[], cityId: string): string[] {
  return branchesInCity(branches, cityId).map((b) => b.id);
}

export function branchOptionLabel(branch: Branch, cityName: string): string {
  const cn = cityName.trim();
  return cn ? `${cn} · ${branch.name}` : branch.name;
}
