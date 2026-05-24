import type { DistanceUnit, PetrolVolumeUnit } from "src/constants/petrol-consumption-units";

export type PetrolConsumptionRow = {
  id: number;
  carId: number;
  carLabel: string;
  instructorUserId: number;
  instructorName: string;
  date: string;
  distanceValue: number;
  distanceUnit: DistanceUnit;
  distanceUnitLabel: string;
  petrolAmount: number | null;
  petrolUnit: PetrolVolumeUnit;
  petrolUnitLabel: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type PetrolConsumptionInstructorAnalytics = {
  instructorId: number;
  instructorName: string;
  totalDistanceKm: number;
  totalPetrolLiters: number;
  recordsCount: number;
};

export type PetrolConsumptionCarAnalytics = {
  carId: number;
  carLabel: string;
  totalDistanceKm: number;
  totalPetrolLiters: number;
  recordsCount: number;
};

export type PetrolConsumptionListResponse = {
  items: PetrolConsumptionRow[];
  summary: {
    totalDistanceKm: number;
    totalPetrolLiters: number;
    recordsCount: number;
    litersPer100Km: number | null;
  };
  byInstructor: PetrolConsumptionInstructorAnalytics[];
  byCar: PetrolConsumptionCarAnalytics[];
};

export type PetrolConsumptionBody = {
  carId: number;
  instructorUserId: number;
  date: string;
  distanceValue: number;
  distanceUnit: DistanceUnit;
  petrolAmount: number | null;
  petrolUnit: PetrolVolumeUnit;
  description?: string | null;
};
