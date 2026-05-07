import { DEFAULT_CITIES } from "./cities.defaults";
import type { City } from "./city.types";

const STORAGE_KEY = "viva-cities-v1";

const defaultById = new Map(DEFAULT_CITIES.map((c) => [c.id, c]));

function normalizeStoredCity(raw: unknown): City | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const id = String(c.id ?? "");
  if (!id) return null;
  const fallback = defaultById.get(id);
  return {
    id,
    name: String(c.name ?? fallback?.name ?? "").trim() || (fallback?.name ?? id),
  };
}

export function loadCities(): City[] {
  if (typeof window === "undefined") return DEFAULT_CITIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CITIES;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CITIES;
    const out = parsed.map(normalizeStoredCity).filter((x): x is City => x !== null);
    return out.length > 0 ? out : DEFAULT_CITIES;
  } catch {
    return DEFAULT_CITIES;
  }
}

export function saveCities(cities: City[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
  window.dispatchEvent(new CustomEvent("viva-cities-updated"));
}
