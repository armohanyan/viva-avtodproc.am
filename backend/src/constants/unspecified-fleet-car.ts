/** Placeholder fleet plate used when a petrol expense has no vehicle selected. */
export const UNSPECIFIED_FLEET_CAR_PLATE = '00 XX 000';

export function normalizeFleetPlateKey(plate: string): string {
  return plate.trim().toLowerCase().replace(/\s+/g, '');
}

export function isUnspecifiedFleetPlate(plate: string): boolean {
  return normalizeFleetPlateKey(plate) === normalizeFleetPlateKey(UNSPECIFIED_FLEET_CAR_PLATE);
}
