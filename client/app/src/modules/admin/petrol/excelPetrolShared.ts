import * as XLSX from "xlsx";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeCellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  return String(value).trim();
}

function formatDateParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseExcelDateCell(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return formatDateParts(parsed.y, parsed.m, parsed.d);
    }
  }

  const text = normalizeCellText(value);
  if (DATE_RE.test(text)) return text;

  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  if (dmy) {
    const day = Number.parseInt(dmy[1]!, 10);
    const month = Number.parseInt(dmy[2]!, 10);
    const year = Number.parseInt(dmy[3]!, 10);
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return formatDateParts(year, month, day);
    }
  }

  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    return formatDateParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  return null;
}

export function parseOptionalNumber(value: unknown): number | null {
  const text = normalizeCellText(value).replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : null;
}

export function parseRequiredNumber(value: unknown): number | null {
  const n = parseOptionalNumber(value);
  return n != null && n >= 0 ? n : null;
}

export function parsePositiveNumber(value: unknown): number | null {
  const n = parseOptionalNumber(value);
  return n != null && n > 0 ? n : null;
}

export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}

export const REFERENCE_SHEET_NAMES = ["Տեղեկանք", "Reference"] as const;

export function findSheetByNames(workbook: XLSX.WorkBook, names: readonly string[]): XLSX.WorkSheet | null {
  const normalized = names.map((n) => n.trim().toLowerCase());
  for (const sheetName of workbook.SheetNames) {
    if (normalized.includes(sheetName.trim().toLowerCase())) {
      return workbook.Sheets[sheetName] ?? null;
    }
  }
  return null;
}

/** Prefer a named data sheet; otherwise use the first sheet that is not the reference sheet. */
export function findDataSheet(
  workbook: XLSX.WorkBook,
  preferredNames: readonly string[],
  excludeNames: readonly string[] = REFERENCE_SHEET_NAMES,
): XLSX.WorkSheet | null {
  const preferred = findSheetByNames(workbook, preferredNames);
  if (preferred) return preferred;

  const excluded = new Set(excludeNames.map((n) => n.trim().toLowerCase()));
  for (const sheetName of workbook.SheetNames) {
    if (excluded.has(sheetName.trim().toLowerCase())) continue;
    return workbook.Sheets[sheetName] ?? null;
  }

  return workbook.SheetNames[0] ? (workbook.Sheets[workbook.SheetNames[0]!] ?? null) : null;
}

export function sheetRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
}

export function isRowEmpty(row: unknown[]): boolean {
  return row.every((cell) => normalizeCellText(cell) === "");
}

export type LookupCar = { id: string | number; plate: string; make: string; model: string };
export type LookupInstructor = { id: string | number; name: string; teachesPractical?: boolean };

/** Trim and collapse spaces so Excel cells match registered instructor names. */
export function normalizePersonName(name: string): string {
  return name
    .normalize("NFC")
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
}

function parsePositiveId(id: string | number): number | null {
  const n = Number.parseInt(String(id), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type InstructorLookup = {
  /** Registered display names (exact strings from the system), sorted. */
  registeredNames: string[];
  byExactName: Map<string, LookupInstructor>;
  byNormalizedKey: Map<string, LookupInstructor>;
};

export function buildInstructorLookup(instructors: readonly LookupInstructor[]): InstructorLookup {
  const practical = instructors.filter((i) => i.teachesPractical !== false);
  const pool = practical.length > 0 ? practical : [...instructors];
  const byExactName = new Map<string, LookupInstructor>();
  const byNormalizedKey = new Map<string, LookupInstructor>();
  const registeredNames: string[] = [];

  for (const ins of pool) {
    const exact = ins.name.trim();
    if (!exact) continue;
    registeredNames.push(exact);
    byExactName.set(exact, ins);
    const key = normalizePersonName(exact).toLowerCase();
    if (!byNormalizedKey.has(key)) {
      byNormalizedKey.set(key, ins);
    }
  }

  registeredNames.sort((a, b) => a.localeCompare(b, "hy"));
  return { registeredNames, byExactName, byNormalizedKey };
}

export function resolveInstructorMatch(
  lookup: InstructorLookup,
  nameRaw: string,
): { userId: number; registeredName: string } | null {
  const trimmed = nameRaw.trim();
  if (!trimmed) return null;

  const exactHit = lookup.byExactName.get(trimmed);
  if (exactHit) {
    const userId = parsePositiveId(exactHit.id);
    if (userId) return { userId, registeredName: exactHit.name.trim() };
  }

  const normalizedHit = lookup.byNormalizedKey.get(normalizePersonName(trimmed).toLowerCase());
  if (normalizedHit) {
    const userId = parsePositiveId(normalizedHit.id);
    if (userId) return { userId, registeredName: normalizedHit.name.trim() };
  }

  return null;
}

export function instructorMatchError(nameRaw: string, lookup: InstructorLookup): string {
  const trimmed = normalizePersonName(nameRaw);
  if (!trimmed) return "Instructor is required";

  const key = trimmed.toLowerCase();
  for (const registered of lookup.registeredNames) {
    if (normalizePersonName(registered).toLowerCase() === key) {
      return `Copy the registered name exactly: "${registered}"`;
    }
  }

  if (lookup.registeredNames.length === 0) {
    return `Instructor not found: "${trimmed}". No practical instructors are registered yet.`;
  }

  return `Instructor not found: "${trimmed}". Use the exact name from the Տեղեկանք sheet (same as in the system).`;
}

/** @deprecated Use resolveInstructorMatch with buildInstructorLookup */
export function resolveInstructorUserId(
  instructors: readonly LookupInstructor[],
  nameRaw: string,
): number | null {
  const match = resolveInstructorMatch(buildInstructorLookup(instructors), nameRaw);
  return match?.userId ?? null;
}

export function resolveCarId(cars: readonly LookupCar[], plateRaw: string): number | null {
  const needle = plateRaw.trim().toLowerCase().replace(/\s+/g, "");
  if (!needle) return null;

  for (const car of cars) {
    const plate = car.plate.trim().toLowerCase().replace(/\s+/g, "");
    if (plate && plate === needle) {
      const id = Number.parseInt(String(car.id), 10);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
  }

  for (const car of cars) {
    const plate = car.plate.trim().toLowerCase();
    if (plate && (plate.includes(needle) || needle.includes(plate.replace(/\s+/g, "")))) {
      const id = Number.parseInt(String(car.id), 10);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
  }

  return null;
}

export function carPlateLabel(car: LookupCar): string {
  return car.plate?.trim() || `#${car.id}`;
}

/** Rows with this marker in the Note column are template examples and skipped on import. */
export const TEMPLATE_EXAMPLE_MARKER = "օրինակ";

export function isTemplateExampleRow(note: string): boolean {
  const text = note.trim().toLowerCase();
  return text.startsWith(TEMPLATE_EXAMPLE_MARKER) || text.startsWith("example");
}

export function buildReferenceSheet(
  cars: readonly LookupCar[],
  instructors: readonly LookupInstructor[],
  fuelTypeHints?: readonly string[],
): unknown[][] {
  const instructorLookup = buildInstructorLookup(instructors);
  const rows: unknown[][] = [
    ["Մեքենաներ (ներմուծման թերթում օգտագործեք պետանշանը)", "", "", ""],
    ["Պետանշան", "Մակնիշ", "Մոդել", "ID"],
    ...cars.map((c) => [carPlateLabel(c), c.make, c.model, c.id]),
    [],
    [
      "Հրահանգիչներ (պատճենեք անունը հենց այնպես, ինչպես գրանցված է համակարգում)",
      "",
      "",
    ],
    ["Գրանցված անուն", "ID", ""],
    ...instructorLookup.registeredNames.map((name) => {
      const ins = instructorLookup.byExactName.get(name)!;
      return [name, ins.id, ""];
    }),
  ];

  if (fuelTypeHints && fuelTypeHints.length > 0) {
    rows.push([], ["Վառելիքի տեսակներ", "", ""]);
    for (const hint of fuelTypeHints) {
      rows.push([hint, "", ""]);
    }
  }

  return rows;
}

/** Excel dropdown list so admins pick a registered instructor name. */
export function applyInstructorNameValidation(
  sheet: XLSX.WorkSheet,
  columnLetter: string,
  registeredNames: readonly string[],
  maxRow = 5000,
): void {
  const safeNames = registeredNames.filter((n) => n.trim() && !n.includes(","));
  if (safeNames.length === 0) return;
  const escaped = safeNames.map((n) => n.replace(/"/g, '""'));
  sheet["!dataValidation"] = [
    {
      type: "list",
      allowBlank: 1,
      showDropDown: true,
      sqref: `${columnLetter}2:${columnLetter}${maxRow}`,
      formulas: [`"${escaped.join(",")}"`],
    },
  ];
}
