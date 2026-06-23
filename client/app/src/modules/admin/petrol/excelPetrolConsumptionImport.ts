import * as XLSX from "xlsx";
import type { Instructor } from "src/data/instructors";
import {
  DEFAULT_DISTANCE_UNIT,
  DEFAULT_PETROL_VOLUME_UNIT,
  DISTANCE_UNIT_OPTIONS,
  PETROL_VOLUME_UNIT_OPTIONS,
  type DistanceUnit,
  type PetrolVolumeUnit,
} from "src/constants/petrol-consumption-units";
import type { FleetCar } from "src/modules/cars";
import type { PetrolConsumptionBody, PetrolConsumptionRow } from "src/types/petrol-consumption.types";
import {
  applyInstructorNameValidation,
  buildInstructorLookup,
  findDataSheet,
  buildReferenceSheet,
  carPlateLabel,
  downloadWorkbook,
  findSheetByNames,
  instructorMatchError,
  isRowEmpty,
  isTemplateExampleRow,
  normalizeCellText,
  normalizePersonName,
  parseExcelDateCell,
  parseOptionalNumber,
  parsePositiveNumber,
  REFERENCE_SHEET_NAMES,
  resolveCarId,
  resolveInstructorMatch,
  sheetRows,
  TEMPLATE_EXAMPLE_MARKER,
  type InstructorLookup,
  type LookupCar,
  type LookupInstructor,
} from "./excelPetrolShared";

export const CONSUMPTION_SHEET_NAMES = ["Վառելիքի ծախսում", "Fuel consumption", "Consumption"] as const;

export const CONSUMPTION_HEADERS = [
  "Ամսաթիվ",
  "Հրահանգիչ",
  "Մեքենա (պետանշան)",
  "Հերավորություն",
  "Միավոր",
  "Վառելիքի քանակ",
  "Միավոր",
  "Նշում",
] as const;

export type ParsedPetrolConsumptionRow = {
  id: string;
  rowNumber: number;
  date: string;
  dateIso: string;
  carPlate: string;
  instructorName: string;
  distanceValue: number;
  distanceUnit: DistanceUnit;
  petrolAmount: number | null;
  petrolUnit: PetrolVolumeUnit;
  description: string;
  carId: number | null;
  instructorUserId: number | null;
  valid: boolean;
  isExample: boolean;
  errors: string[];
};

export type PetrolConsumptionParseResult = {
  rows: ParsedPetrolConsumptionRow[];
  issues: string[];
};

function parseDistanceUnit(raw: string): DistanceUnit | null {
  const text = raw.trim().toLowerCase();
  if (!text || text === "km" || text === "կմ") return DEFAULT_DISTANCE_UNIT;
  if (text === "mile" || text === "mi" || text === "մղոն") return "mile";
  return DISTANCE_UNIT_OPTIONS.some((o) => o.value === text) ? (text as DistanceUnit) : null;
}

function parsePetrolUnit(raw: string): PetrolVolumeUnit | null {
  const text = raw.trim().toLowerCase();
  if (!text || text === "liter" || text === "l" || text === "լ") return DEFAULT_PETROL_VOLUME_UNIT;
  if (text === "ml" || text === "մլ") return "ml";
  return PETROL_VOLUME_UNIT_OPTIONS.some((o) => o.value === text) ? (text as PetrolVolumeUnit) : null;
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

export function downloadPetrolConsumptionTemplate(
  cars: readonly FleetCar[],
  instructors: readonly Instructor[],
): void {
  const lookupInstructors = toLookupInstructors(instructors);
  const instructorLookup = buildInstructorLookup(lookupInstructors);
  const { plate, instructorName, date } = templateExampleContext(cars, instructors, instructorLookup);
  const wb = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    [...CONSUMPTION_HEADERS],
    [date, instructorName, plate, "120", "կմ", "10", "լ", `${TEMPLATE_EXAMPLE_MARKER} — օրինակ գրառում`],
  ]);
  applyInstructorNameValidation(dataSheet, "B", instructorLookup.registeredNames);
  XLSX.utils.book_append_sheet(wb, dataSheet, CONSUMPTION_SHEET_NAMES[0]);
  const refSheet = XLSX.utils.aoa_to_sheet(
    buildReferenceSheet(toLookupCars(cars), lookupInstructors),
  );
  XLSX.utils.book_append_sheet(wb, refSheet, REFERENCE_SHEET_NAMES[0]);
  downloadWorkbook(wb, "vayeliq-cacum-template.xlsx");
}

export function exportPetrolConsumptionRows(rows: readonly PetrolConsumptionRow[]): void {
  const wb = XLSX.utils.book_new();
  const aoa: unknown[][] = [
    [...CONSUMPTION_HEADERS],
    ...rows.map((row) => [
      row.date.slice(0, 10),
      row.instructorName,
      row.carLabel.split(" · ")[0] ?? row.carLabel,
      row.distanceValue,
      row.distanceUnitLabel,
      row.petrolAmount ?? "",
      row.petrolUnitLabel,
      row.description ?? "",
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, sheet, CONSUMPTION_SHEET_NAMES[0]);
  downloadWorkbook(wb, `petrol-consumption-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function parseConsumptionRow(
  row: unknown[],
  rowNumber: number,
  cars: readonly LookupCar[],
  instructorLookup: InstructorLookup,
): ParsedPetrolConsumptionRow {
  const dateIso = parseExcelDateCell(row[0]) ?? "";
  const instructorName = normalizePersonName(normalizeCellText(row[1]));
  const carPlate = normalizeCellText(row[2]);
  const distanceValue = parsePositiveNumber(row[3]);
  const distanceUnit = parseDistanceUnit(normalizeCellText(row[4])) ?? DEFAULT_DISTANCE_UNIT;
  const petrolAmountRaw = parseOptionalNumber(row[5]);
  const petrolAmount = petrolAmountRaw != null && petrolAmountRaw > 0 ? petrolAmountRaw : null;
  const petrolUnit = parsePetrolUnit(normalizeCellText(row[6])) ?? DEFAULT_PETROL_VOLUME_UNIT;
  const description = normalizeCellText(row[7]);
  const isExample = isTemplateExampleRow(description);

  const errors: string[] = [];
  if (!dateIso) errors.push("Invalid date");
  if (!instructorName) errors.push("Instructor is required");
  if (!carPlate) errors.push("Car plate is required");
  if (distanceValue == null) errors.push("Invalid distance");
  if (normalizeCellText(row[4]) && parseDistanceUnit(normalizeCellText(row[4])) == null) {
    errors.push("Invalid distance unit");
  }
  if (normalizeCellText(row[6]) && parsePetrolUnit(normalizeCellText(row[6])) == null) {
    errors.push("Invalid fuel unit");
  }

  const carId = carPlate ? resolveCarId(cars, carPlate) : null;
  const instructorMatch = instructorName ? resolveInstructorMatch(instructorLookup, instructorName) : null;
  if (carPlate && carId == null) errors.push(`Vehicle not found: ${carPlate}`);
  if (instructorName && instructorMatch == null) {
    errors.push(instructorMatchError(instructorName, instructorLookup));
  }

  return {
    id: `consumption-${rowNumber}`,
    rowNumber,
    date: dateIso,
    dateIso,
    carPlate,
    instructorName: instructorMatch?.registeredName ?? instructorName,
    distanceValue: distanceValue ?? 0,
    distanceUnit,
    petrolAmount,
    petrolUnit,
    description,
    carId,
    instructorUserId: instructorMatch?.userId ?? null,
    valid: errors.length === 0,
    isExample,
    errors,
  };
}

export async function parsePetrolConsumptionWorkbook(
  file: File,
  cars: readonly FleetCar[],
  instructors: readonly Instructor[],
): Promise<PetrolConsumptionParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const lookupCars = toLookupCars(cars);
  const instructorLookup = buildInstructorLookup(toLookupInstructors(instructors));

  const sheet = findDataSheet(workbook, CONSUMPTION_SHEET_NAMES);
  if (!sheet) {
    return { rows: [], issues: ["No fuel consumption sheet found in workbook."] };
  }

  const rows = sheetRows(sheet);
  const parsed: ParsedPetrolConsumptionRow[] = [];
  const issues: string[] = [];
  let exampleCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isRowEmpty(row)) continue;
    const parsedRow = parseConsumptionRow(row, i + 1, lookupCars, instructorLookup);
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

export function toPetrolConsumptionBulkPayload(row: ParsedPetrolConsumptionRow): PetrolConsumptionBody | null {
  if (row.isExample || !row.valid || row.carId == null || row.instructorUserId == null) return null;
  return {
    carId: row.carId,
    instructorUserId: row.instructorUserId,
    date: row.dateIso,
    distanceValue: row.distanceValue,
    distanceUnit: row.distanceUnit,
    petrolAmount: row.petrolAmount,
    petrolUnit: row.petrolUnit,
    description: row.description || null,
  };
}
