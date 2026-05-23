import type { PetrolTypeValue } from "src/pages/admin/petrolTypeAm";

export type PetrolExpenseRow = {
  id: number;
  carId: number;
  carLabel: string;
  instructorUserId: number;
  instructorName: string;
  date: string;
  petrolType: PetrolTypeValue;
  petrolTypeLabel: string;
  petrolCount: number | null;
  price: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type PetrolInstructorAnalytics = {
  instructorId: number;
  instructorName: string;
  totalPetrolCount: number;
  totalPrice: number;
  recordsCount: number;
};

export type PetrolExpenseListResponse = {
  items: PetrolExpenseRow[];
  summary: {
    totalPetrolCount: number;
    totalPrice: number;
    instructorCount: number;
  };
  byInstructor: PetrolInstructorAnalytics[];
};

export type PetrolExpenseBody = {
  carId: number;
  instructorUserId: number;
  date: string;
  petrolType: PetrolTypeValue;
  petrolCount?: number | null;
  price: number;
  description?: string | null;
};
