import { DEFAULT_PRIMARY_CITY_ID } from "src/modules/cities";
import { DEFAULT_BRANCHES } from "./branches.defaults";
import type { Branch } from "./branch.types";

const STORAGE_KEY = "viva-branches-v1";

const defaultById = new Map(DEFAULT_BRANCHES.map((b) => [b.id, b]));

function normalizeStoredBranch(raw: unknown): Branch | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const id = String(b.id ?? "");
  if (!id) return null;
  const fallback = defaultById.get(id);
  let cityId = typeof b.cityId === "string" ? b.cityId : fallback?.cityId;
  if (!cityId) {
    cityId = fallback?.cityId ?? DEFAULT_PRIMARY_CITY_ID;
  }
  return {
    id,
    cityId,
    name: String(b.name ?? fallback?.name ?? ""),
    mapUrl: String(b.mapUrl ?? fallback?.mapUrl ?? ""),
    phone: typeof b.phone === "string" ? b.phone : fallback?.phone,
    email: typeof b.email === "string" ? b.email : fallback?.email,
    workHours: typeof b.workHours === "string" ? b.workHours : fallback?.workHours,
  };
}

export function loadBranches(): Branch[] {
  if (typeof window === "undefined") return DEFAULT_BRANCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANCHES;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BRANCHES;
    const out = parsed.map(normalizeStoredBranch).filter((x): x is Branch => x !== null);
    return out.length > 0 ? out : DEFAULT_BRANCHES;
  } catch {
    return DEFAULT_BRANCHES;
  }
}

export function saveBranches(branches: Branch[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
  window.dispatchEvent(new CustomEvent("viva-branches-updated"));
}
