import { DEFAULT_FLEET_CARS } from "./cars.defaults";
import type { FleetCar } from "./car.types";

const STORAGE_KEY = "viva-fleet-cars-v1";

export function loadFleetCars(): FleetCar[] {
  if (typeof window === "undefined") return DEFAULT_FLEET_CARS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLEET_CARS;
    const parsed = JSON.parse(raw) as FleetCar[];
    if (!Array.isArray(parsed)) return DEFAULT_FLEET_CARS;
    return parsed.map((c) => ({
      ...c,
      id: String(c.id),
      plate: String(c.plate ?? ""),
      make: String(c.make ?? ""),
      model: String(c.model ?? ""),
      year: c.year != null ? Number(c.year) : undefined,
      transmission:
        c.transmission === "manual" || c.transmission === "automatic" ? c.transmission : undefined,
      notes: c.notes != null ? String(c.notes) : undefined,
      assignedInstructorEmails: Array.isArray((c as FleetCar).assignedInstructorEmails)
        ? (c as FleetCar).assignedInstructorEmails!.map(String)
        : undefined,
    }));
  } catch {
    return DEFAULT_FLEET_CARS;
  }
}

export function saveFleetCars(cars: FleetCar[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
  window.dispatchEvent(new CustomEvent("viva-fleet-updated"));
}
