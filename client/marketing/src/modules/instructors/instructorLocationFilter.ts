import type { Branch } from "src/modules/branches";
import type { City } from "src/modules/cities";
import type { Instructor } from "src/data/instructors";

export type InstructorRegion = {
  id: string;
  name: string;
};

export type InstructorCityGroup = {
  key: string;
  name: string;
  regions: InstructorRegion[];
};

function cityKey(name: string): string {
  return name.trim().toLocaleLowerCase("hy");
}

function regionLabel(branch: Branch, siblings: readonly Branch[]): string {
  const label = branch.label?.trim() || "";
  const address = branch.name.trim();
  const base = label || address;
  const sameLabel = siblings.filter((item) => (item.label?.trim() || item.name.trim()) === base);
  if (sameLabel.length > 1 && label && address && label !== address) {
    return `${label}, ${address}`;
  }
  return base;
}

/** Cities that have at least one branch. Same city name is one filter, even if stored twice. */
export function instructorCityGroups(cities: readonly City[], branches: readonly Branch[]): InstructorCityGroup[] {
  const byKey = new Map<string, InstructorCityGroup & { cityIds: Set<string> }>();

  for (const city of cities) {
    const name = city.name.trim();
    if (!name) continue;
    const key = cityKey(name);
    const existing = byKey.get(key);
    if (existing) {
      existing.cityIds.add(String(city.id));
      continue;
    }
    byKey.set(key, { key, name, cityIds: new Set([String(city.id)]), regions: [] });
  }

  const branchesByCity = new Map<string, Branch[]>();
  for (const branch of branches) {
    const cityId = String(branch.cityId);
    const list = branchesByCity.get(cityId) ?? [];
    list.push(branch);
    branchesByCity.set(cityId, list);
  }

  for (const group of byKey.values()) {
    const cityBranches = [...group.cityIds].flatMap((id) => branchesByCity.get(id) ?? []);
    group.regions = cityBranches
      .map((branch) => ({
        id: String(branch.id),
        name: regionLabel(branch, cityBranches),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "hy"));
  }

  return [...byKey.values()]
    .filter((group) => group.regions.length > 0)
    .map(({ key, name, regions }) => ({ key, name, regions }))
    .sort((a, b) => {
      if (b.regions.length !== a.regions.length) return b.regions.length - a.regions.length;
      return a.name.localeCompare(b.name, "hy");
    });
}

export function filterInstructorsByLocation(
  instructors: readonly Instructor[],
  groups: readonly InstructorCityGroup[],
  cityKeyValue: string,
  regionId: string,
): Instructor[] {
  const active = instructors.filter((ins) => ins.status === "active");
  const city = cityKeyValue ? groups.find((group) => group.key === cityKeyValue) : undefined;
  if (!city) return active;

  const regionIds = new Set(
    regionId && city.regions.some((region) => region.id === regionId)
      ? [regionId]
      : city.regions.map((region) => region.id),
  );

  return active.filter((ins) => (ins.availableBranchIds ?? []).some((id) => regionIds.has(String(id))));
}
