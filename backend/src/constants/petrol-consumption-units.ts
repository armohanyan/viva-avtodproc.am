export const DISTANCE_UNITS = ['km', 'mile'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const PETROL_VOLUME_UNITS = ['liter', 'ml'] as const;
export type PetrolVolumeUnit = (typeof PETROL_VOLUME_UNITS)[number];

export const DISTANCE_UNIT_LABELS_AM: Record<DistanceUnit, string> = {
  km: 'կմ',
  mile: 'մղոն',
};

export const PETROL_VOLUME_UNIT_LABELS_AM: Record<PetrolVolumeUnit, string> = {
  liter: 'լ',
  ml: 'մլ',
};

export function distanceUnitLabelAm(unit: string): string {
  if (unit === 'km' || unit === 'mile') return DISTANCE_UNIT_LABELS_AM[unit];
  return unit;
}

export function petrolVolumeUnitLabelAm(unit: string): string {
  if (unit === 'liter' || unit === 'ml') return PETROL_VOLUME_UNIT_LABELS_AM[unit];
  return unit;
}

export function isDistanceUnit(value: string): value is DistanceUnit {
  return (DISTANCE_UNITS as readonly string[]).includes(value);
}

export function isPetrolVolumeUnit(value: string): value is PetrolVolumeUnit {
  return (PETROL_VOLUME_UNITS as readonly string[]).includes(value);
}

const KM_PER_MILE = 1.609344;
const ML_PER_LITER = 1000;

export function distanceToKm(value: number, unit: DistanceUnit): number {
  if (unit === 'mile') return value * KM_PER_MILE;
  return value;
}

export function petrolToLiters(value: number, unit: PetrolVolumeUnit): number {
  if (unit === 'ml') return value / ML_PER_LITER;
  return value;
}

/** Liters per 100 km when both totals are positive; otherwise null. */
export function litersPer100Km(totalKm: number, totalLiters: number): number | null {
  if (!(totalKm > 0) || !(totalLiters >= 0)) return null;
  return Math.round((totalLiters / totalKm) * 100 * 100) / 100;
}
