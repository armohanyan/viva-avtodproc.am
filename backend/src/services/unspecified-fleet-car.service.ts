import {
  UNSPECIFIED_FLEET_CAR_PLATE,
  normalizeFleetPlateKey,
} from '../constants/unspecified-fleet-car';
import { FleetCar } from '../models/fleet-car.model';

/** Ensure the placeholder plate exists and return it (used when admin leaves car empty). */
export async function ensureUnspecifiedFleetCar(): Promise<FleetCar> {
  const needle = normalizeFleetPlateKey(UNSPECIFIED_FLEET_CAR_PLATE);
  const cars = await FleetCar.findAll({ attributes: ['id', 'plate'] });
  const existing = cars.find((c) => normalizeFleetPlateKey(c.plate) === needle);
  if (existing) {
    const full = await FleetCar.findByPk(existing.id);
    if (full) return full;
  }

  return FleetCar.create({
    plate: UNSPECIFIED_FLEET_CAR_PLATE,
    make: '—',
    model: 'Unspecified',
    notes: 'Placeholder vehicle for fuel records without a selected car',
  });
}
