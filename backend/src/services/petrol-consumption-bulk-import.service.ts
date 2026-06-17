import AdminPetrolConsumptionService, {
  type PetrolConsumptionInput,
} from './admin-petrol-consumption.service';
import ErrorsUtil from '../utils/errors.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type BulkImportPetrolConsumptionRowError = {
  row: number;
  date: string;
  carPlate: string;
  instructorName: string;
  reason: string;
};

export type BulkImportPetrolConsumptionResult = {
  imported: number;
  errors: BulkImportPetrolConsumptionRowError[];
};

export default class PetrolConsumptionBulkImportService {
  static async bulkImport(
    records: PetrolConsumptionInput[],
    createdByUserId?: number,
  ): Promise<BulkImportPetrolConsumptionResult> {
    const result: BulkImportPetrolConsumptionResult = { imported: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const record = records[i]!;
      const rowNum = i + 2;
      try {
        await AdminPetrolConsumptionService.create(record, createdByUserId);
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
