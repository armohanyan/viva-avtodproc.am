import AdminPetrolExpenseService, {
  type PetrolExpenseInput,
} from './admin-petrol-expense.service';
import ErrorsUtil from '../utils/errors.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type BulkImportPetrolExpenseRowError = {
  row: number;
  date: string;
  carPlate: string;
  instructorName: string;
  reason: string;
};

export type BulkImportPetrolExpenseResult = {
  imported: number;
  errors: BulkImportPetrolExpenseRowError[];
};

export default class PetrolExpenseBulkImportService {
  static async bulkImport(
    records: PetrolExpenseInput[],
    createdByUserId?: number,
  ): Promise<BulkImportPetrolExpenseResult> {
    const result: BulkImportPetrolExpenseResult = { imported: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const record = records[i]!;
      const rowNum = i + 2;
      try {
        await AdminPetrolExpenseService.create(record, createdByUserId);
        result.imported += 1;
      } catch (e) {
        const reason =
          e instanceof InputValidationError || e instanceof ResourceNotFoundError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Failed to create record';
        result.errors.push({
          row: rowNum,
          date: record.date,
          carPlate: String(record.carId),
          instructorName: String(record.instructorUserId),
          reason,
        });
      }
    }

    return result;
  }
}
