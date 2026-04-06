import { DEFAULT_BRANCHES } from "./branches.defaults";
import type { Branch } from "./branch.types";

const STORAGE_KEY = "viva-branches-v1";

export function loadBranches(): Branch[] {
  if (typeof window === "undefined") return DEFAULT_BRANCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANCHES;
    const parsed = JSON.parse(raw) as Branch[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BRANCHES;
    return parsed.map((b) => ({
      ...b,
      id: String(b.id),
      name: String(b.name ?? ""),
      mapUrl: String(b.mapUrl ?? ""),
    }));
  } catch {
    return DEFAULT_BRANCHES;
  }
}

export function saveBranches(branches: Branch[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
  window.dispatchEvent(new CustomEvent("viva-branches-updated"));
}
