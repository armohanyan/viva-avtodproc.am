export const DISTANCE_UNITS = ["km", "mile"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const PETROL_VOLUME_UNITS = ["liter", "ml"] as const;
export type PetrolVolumeUnit = (typeof PETROL_VOLUME_UNITS)[number];

export const DISTANCE_UNIT_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: "km", label: "կմ" },
  { value: "mile", label: "մղոն" },
];

export const PETROL_VOLUME_UNIT_OPTIONS: { value: PetrolVolumeUnit; label: string }[] = [
  { value: "liter", label: "լ" },
  { value: "ml", label: "մլ" },
];

export const DEFAULT_DISTANCE_UNIT: DistanceUnit = "km";
export const DEFAULT_PETROL_VOLUME_UNIT: PetrolVolumeUnit = "liter";

const KM_PER_MILE = 1.609344;
const ML_PER_LITER = 1000;

export function distanceToKm(value: number, unit: DistanceUnit): number {
  if (unit === "mile") return value * KM_PER_MILE;
  return value;
}

export function petrolToLiters(value: number, unit: PetrolVolumeUnit): number {
  if (unit === "ml") return value / ML_PER_LITER;
  return value;
}

export function litersPer100Km(totalKm: number, totalLiters: number): number | null {
  if (!(totalKm > 0) || !(totalLiters >= 0)) return null;
  return Math.round((totalLiters / totalKm) * 100 * 100) / 100;
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return DISTANCE_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;
}

export function petrolVolumeUnitLabel(unit: PetrolVolumeUnit): string {
  return PETROL_VOLUME_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;
}
