import * as XLSX from "xlsx";
import type { Instructor } from "src/data/instructors";
import type { FleetCar } from "src/modules/cars";
import type { PetrolExpenseBody, PetrolExpenseRow } from "src/types/petrol-expense.types";
import {
  PETROL_PAYMENT_CASH,
  PETROL_PAYMENT_OPTIONS,
  type PetrolPaymentTypeValue,
} from "src/pages/admin/petrolPaymentType";
import {
  PETROL_TYPE_BENZIN,
  PETROL_TYPE_LPG,
  PETROL_TYPE_OPTIONS,
  type PetrolTypeValue,
} from "src/pages/admin/petrolTypeAm";
import {
  applyInstructorNameValidation,
  buildInstructorLookup,
  findDataSheet,
  buildReferenceSheet,
  carPlateLabel,
  downloadWorkbook,
  instructorMatchError,
  isRowEmpty,
  isTemplateExampleRow,
  normalizeCellText,
  normalizePersonName,
  parseExcelDateCell,
  parseRequiredNumber,
  REFERENCE_SHEET_NAMES,
  resolveCarId,
  resolveInstructorMatch,
  sheetRows,
  TEMPLATE_EXAMPLE_MARKER,
  type InstructorLookup,
  type LookupCar,
  type LookupInstructor,
} from "src/modules/admin/petrol/excelPetrolShared";

/** Excel sheet tab name — must not contain \\ / ? * [ ] */
export const FUEL_KM_EXPENSE_SHEET_NAME = "Վառելիք ԿՄ";

export const FUEL_KM_EXPENSE_SHEET_NAMES = [FUEL_KM_EXPENSE_SHEET_NAME, "Վառելիք", "Fuel KM"] as const;

export const FUEL_KM_EXPENSE_HEADERS = [
  "Ամսաթիվ",
  "Մեքենա (պետանշան)",
  "Հրահանգիչ",
  "Տեսակ",
  "Լիտր",
  "Գումար (֏)",
  "Վճարում",
  "Նշում",
] as const;

const BENZIN_LABEL = PETROL_TYPE_OPTIONS[0]!.label;
const LPG_LABEL = PETROL_TYPE_OPTIONS[1]!.label;
const PAYMENT_LABELS = PETROL_PAYMENT_OPTIONS.map((o) => o.label);

export type ParsedFuelKmExpenseRow = {
  id: string;
  rowNumber: number;
  date: string;
  dateIso: string;
  carPlate: string;
  instructorName: string;
  petrolType: PetrolTypeValue;
  petrolTypeLabel: string;
  petrolCount: number;
  price: number;
  paymentType: PetrolPaymentTypeValue;
  paymentTypeLabel: string;
  description: string;
  carId: number | null;
  instructorUserId: number | null;
  valid: boolean;
  isExample: boolean;
  errors: string[];
};

export type FuelKmExpenseParseResult = {
  rows: ParsedFuelKmExpenseRow[];
  issues: string[];
};

function parsePetrolType(raw: string): PetrolTypeValue | null {
  const text = raw.trim().toLowerCase();
  if (!text) return PETROL_TYPE_BENZIN;
  if (
    text === "benzin" ||
    text === "petrol" ||
    text === "gasoline" ||
    text.includes("բենզին") ||
    text === BENZIN_LABEL.toLowerCase()
  ) {
    return PETROL_TYPE_BENZIN;
  }
  if (
    text === "lpg" ||
    text === "gas" ||
    text.includes("գազ") ||
    text.includes("հեղուկ") ||
    text === LPG_LABEL.toLowerCase()
  ) {
    return PETROL_TYPE_LPG;
  }
  return null;
}

function parsePaymentType(raw: string): PetrolPaymentTypeValue | null {
  const text = raw.trim().toLowerCase();
  if (!text) return PETROL_PAYMENT_CASH;
  if (text === "card" || text.includes("քարտ")) return "card";
  if (text === "cash" || text.includes("կանխիկ")) return "cash";
  if (text === "pos") return "pos";
  return null;
}

function petrolTypeLabel(type: PetrolTypeValue): string {
  return type === PETROL_TYPE_BENZIN ? "Բենզին" : "Գազ (Հեղուկ Գազ)";
}

function paymentTypeLabel(type: PetrolPaymentTypeValue): string {
  return PETROL_PAYMENT_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function toLookupCars(cars: readonly FleetCar[]): LookupCar[] {
  return cars.map((c) => ({ id: c.id, plate: c.plate, make: c.make, model: c.model }));
}

function toLookupInstructors(instructors: readonly Instructor[]): LookupInstructor[] {
  return instructors.map((i) => ({
    id: i.id,
    name: i.name,
    teachesPractical: i.teachesPractical,
  }));
}

function templateExampleContext(
  cars: readonly FleetCar[],
  instructors: readonly Instructor[],
  instructorLookup: InstructorLookup,
): { plate: string; instructorName: string; date: string } {
  const practical = instructors.filter((i) => i.teachesPractical && i.status === "active");
  const car = cars[0];
  const registeredName = instructorLookup.registeredNames[0];
  const instructor = registeredName
    ? (practical.find((i) => i.name.trim() === registeredName) ?? practical[0] ?? instructors[0])
    : (practical[0] ?? instructors[0]);
  return {
    plate: car ? carPlateLabel(car) : "00AA000",
    instructorName: instructor?.name.trim() ?? registeredName ?? "Հրահանգիչի անուն",
    date: "2024-01-15",
  };
}

export function downloadFuelKmExpenseTemplate(
  cars: readonly FleetCar[],
  instructors: readonly Instructor[],
): void {
  const lookupInstructors = toLookupInstructors(instructors);
  const instructorLookup = buildInstructorLookup(lookupInstructors);
  const { plate, instructorName, date } = templateExampleContext(cars, instructors, instructorLookup);
  const wb = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    [...FUEL_KM_EXPENSE_HEADERS],
    [
      date,
      plate,
      instructorName,
      BENZIN_LABEL,
      "40",
      "15000",
      PAYMENT_LABELS[1],
      `${TEMPLATE_EXAMPLE_MARKER} — ${BENZIN_LABEL}`,
    ],
    [
      date,
      plate,
      instructorName,
      LPG_LABEL,
      "35",
      "12000",
      "POS",
      `${TEMPLATE_EXAMPLE_MARKER} — ${LPG_LABEL}`,
    ],
  ]);
  applyInstructorNameValidation(dataSheet, "C", instructorLookup.registeredNames);
  XLSX.utils.book_append_sheet(wb, dataSheet, FUEL_KM_EXPENSE_SHEET_NAME);
  const refSheet = XLSX.utils.aoa_to_sheet(
    buildReferenceSheet(toLookupCars(cars), lookupInstructors, [
      BENZIN_LABEL,
      LPG_LABEL,
      ...PAYMENT_LABELS,
    ]),
  );
  XLSX.utils.book_append_sheet(wb, refSheet, REFERENCE_SHEET_NAMES[0]);
  downloadWorkbook(wb, "vayeliq-km-template.xlsx");
}

export function exportFuelKmExpenseRows(rows: readonly PetrolExpenseRow[]): void {
  const wb = XLSX.utils.book_new();
  const aoa: unknown[][] = [
    [...FUEL_KM_EXPENSE_HEADERS],
    ...rows.map((row) => [
      row.date.slice(0, 10),
      row.carLabel.split(" · ")[0] ?? row.carLabel,
      row.instructorName,
      row.petrolTypeLabel,
      row.petrolCount ?? "",
      row.price,
      row.paymentTypeLabel,
      row.description ?? "",
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, sheet, FUEL_KM_EXPENSE_SHEET_NAME);
  downloadWorkbook(wb, `petrol-fuel-km-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function parseExpenseRow(
  row: unknown[],
  rowNumber: number,
  cars: readonly LookupCar[],
  instructorLookup: InstructorLookup,
): ParsedFuelKmExpenseRow {
  const dateIso = parseExcelDateCell(row[0]) ?? "";
  const carPlate = normalizeCellText(row[1]);
  const instructorName = normalizePersonName(normalizeCellText(row[2]));
  const petrolTypeRaw = normalizeCellText(row[3]);
  const petrolType = parsePetrolType(petrolTypeRaw);
  const petrolCount = parseRequiredNumber(row[4]);
  const price = parseRequiredNumber(row[5]);
  const paymentTypeRaw = normalizeCellText(row[6]);
  const paymentType = parsePaymentType(paymentTypeRaw);
  const description = normalizeCellText(row[7]);
  const isExample = isTemplateExampleRow(description);

  const errors: string[] = [];
  if (!dateIso) errors.push("Invalid date");
  if (!carPlate) errors.push("Car plate is required");
  if (!instructorName) errors.push("Instructor is required");
  if (!petrolType) errors.push("Invalid fuel type");
  if (petrolCount == null || petrolCount <= 0) errors.push("Liters is required");
  if (price == null) errors.push("Invalid price");
  if (!paymentType) errors.push("Invalid payment type");

  const carId = carPlate ? resolveCarId(cars, carPlate) : null;
  const instructorMatch = instructorName ? resolveInstructorMatch(instructorLookup, instructorName) : null;
  if (carPlate && carId == null) errors.push(`Vehicle not found: ${carPlate}`);
  if (instructorName && instructorMatch == null) {
    errors.push(instructorMatchError(instructorName, instructorLookup));
  }

  const resolvedType = petrolType ?? PETROL_TYPE_BENZIN;
  const resolvedPayment = paymentType ?? PETROL_PAYMENT_CASH;

  return {
    id: `fuel-km-expense-${rowNumber}`,
    rowNumber,
    date: dateIso,
    dateIso,
    carPlate,
    instructorName: instructorMatch?.registeredName ?? instructorName,
    petrolType: resolvedType,
    petrolTypeLabel: petrolTypeLabel(resolvedType),
    petrolCount: petrolCount ?? 0,
    price: price ?? 0,
    paymentType: resolvedPayment,
    paymentTypeLabel: paymentTypeLabel(resolvedPayment),
    description,
    carId,
    instructorUserId: instructorMatch?.userId ?? null,
    valid: errors.length === 0,
    isExample,
    errors,
  };
}

export async function parseFuelKmExpenseWorkbook(
  file: File,
  cars: readonly FleetCar[],
  instructors: readonly Instructor[],
): Promise<FuelKmExpenseParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const lookupCars = toLookupCars(cars);
  const instructorLookup = buildInstructorLookup(toLookupInstructors(instructors));

  const sheet = findDataSheet(workbook, FUEL_KM_EXPENSE_SHEET_NAMES);
  if (!sheet) {
    return { rows: [], issues: ["No fuel expense sheet found in workbook."] };
  }

  const rows = sheetRows(sheet);
  const parsed: ParsedFuelKmExpenseRow[] = [];
  const issues: string[] = [];
  let exampleCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isRowEmpty(row)) continue;
    const parsedRow = parseExpenseRow(row, i + 1, lookupCars, instructorLookup);
    if (parsedRow.isExample) exampleCount += 1;
    parsed.push(parsedRow);
  }

  parsed.sort((a, b) => {
    const byDate = a.dateIso.localeCompare(b.dateIso);
    if (byDate !== 0) return byDate;
    return a.rowNumber - b.rowNumber;
  });

  const importableCount = parsed.filter((r) => !r.isExample).length;
  if (importableCount === 0 && exampleCount > 0) {
    issues.push(
      "Only template example rows found. Add your records below them, or remove «օրինակ» from the Note column to import a row.",
    );
  } else if (parsed.length === 0) {
    issues.push("No data rows found below the header.");
  }

  return { rows: parsed, issues };
}

export function toFuelKmExpenseBulkPayload(row: ParsedFuelKmExpenseRow): PetrolExpenseBody | null {
  if (row.isExample || !row.valid || row.carId == null || row.instructorUserId == null) return null;
  return {
    carId: row.carId,
    instructorUserId: row.instructorUserId,
    date: row.dateIso,
    petrolType: row.petrolType,
    petrolCount: row.petrolCount,
    paymentType: row.paymentType,
    price: Math.round(row.price),
    description: row.description || null,
  };
}
