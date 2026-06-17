import type { PetrolConsumptionBody } from "src/types/petrol-consumption.types";
import type { PetrolExpenseBody } from "src/types/petrol-expense.types";
import { vivaApiJson } from "src/lib/vivaApi";

export type BulkImportPetrolRowError = {
  row: number;
  date: string;
  carPlate: string;
  instructorName: string;
  reason: string;
};

export type BulkImportPetrolResult = {
  imported: number;
  errors: BulkImportPetrolRowError[];
};

export async function bulkImportPetrolExpenses(records: PetrolExpenseBody[]): Promise<BulkImportPetrolResult> {
  return vivaApiJson<BulkImportPetrolResult>("/admin/petrol-expenses/bulk-import", {
    method: "POST",
    body: { records },
  });
}

export async function bulkImportPetrolConsumptions(
  records: PetrolConsumptionBody[],
): Promise<BulkImportPetrolResult> {
  return vivaApiJson<BulkImportPetrolResult>("/admin/petrol-consumptions/bulk-import", {
    method: "POST",
    body: { records },
  });
}
