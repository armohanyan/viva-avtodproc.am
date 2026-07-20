/**
 * Flat practical-lessons XLSX import (CLI + admin upload).
 *
 * Columns (header-aware aliases):
 *   date | time | instructor | student | phone | status | amount | [branch] | …
 *
 * Branch resolution:
 *   - non-empty Branch cell → match by id/code (1–4), address, or name (instructor must serve it)
 *   - empty / missing → instructor must have exactly one linked branch
 */
import * as XLSX from 'xlsx';

import { Branch, User } from '../models';
import BookingBulkImportService, {
  type BulkImportBookingInput,
  type BulkImportResult,
  type BulkImportRowError,
} from './booking-bulk-import.service';
import InstructorBranchService from './instructor-branch.service';
import { normalizeTimeHHMM } from '../utils/booking-slot.util';
import { matchBranchFromExcelCell } from '../utils/excel-branch-codes.util';
import { parseStudentPhones } from '../utils/student-phones.util';
import type { AdminBookingPaymentStatus } from '../utils/booking-admin-payment.util';

export type PracticalFlatXlsxImportOptions = {
  dryRun?: boolean;
  /** CLI override: force one branch for every row (still checks instructor link unless skipped). */
  forceBranchId?: number | null;
  createdByUserId?: number | null;
};

export type PracticalFlatXlsxSkippedRow = {
  rowNumber: number | null;
  kind: 'parse' | 'resolve' | 'duplicate' | 'error';
  studentName: string;
  instructorName: string;
  date: string;
  timeSlot: string;
  reason: string;
  studentPhone?: string;
  studentPhone2?: string;
  totalPriceAmd?: number;
  adminPaymentStatus?: string;
  branchName?: string;
};

export type PracticalFlatXlsxImportResult = {
  dryRun: boolean;
  parsedRows: number;
  importableRows: number;
  skippedUnresolved: number;
  dualPhoneRows: number;
  paidRows: number;
  parseIssues: string[];
  resolveWarnings: string[];
  resolveErrors: string[];
  instructorMappings: Array<{
    excelName: string;
    canonicalName: string;
    branchId: number | null;
    branchName: string | null;
  }>;
  imported: number;
  skippedDuplicates: number;
  newStudentsCreated: number;
  errors: BulkImportRowError[];
  /** Every row that did not import (parse / resolve / duplicate / error), with Excel row + reason. */
  skippedRows: PracticalFlatXlsxSkippedRow[];
  unmappableInstructors: string[];
};

type ColKey = 'date' | 'time' | 'instructor' | 'student' | 'phone' | 'status' | 'amount' | 'branch';

const HEADER_ALIASES: Record<ColKey, readonly string[]> = {
  date: ['ամսաթիվ', 'date', 'дата'],
  time: ['ժամ', 'time', 'время', 'slot', 'час'],
  instructor: ['հրահանգիչ', 'instructor', 'инструктор'],
  student: ['ուսանող', 'student', 'студент', 'ученик'],
  phone: ['հեռախոս', 'phone', 'телефон'],
  status: ['статус', 'status', 'վիճակ', 'կարգավիճակ'],
  amount: ['сумма', 'amount', 'գումար', 'price', 'цена'],
  branch: ['մասնաճյուղ', 'branch', 'филиал', 'բրենչ', 'հասցե'],
};

type ParsedRow = {
  rowNumber: number;
  dateIso: string;
  timeSlot: string;
  instructorName: string;
  studentName: string;
  branchName?: string;
  studentPhone?: string;
  studentPhone2?: string;
  totalPriceAmd: number;
  adminPaymentStatus: AdminBookingPaymentStatus;
  paidAmountAmd?: number;
};

type InstructorCache = {
  excelName: string;
  canonicalName: string;
  userId: number;
  branchIds: number[];
};

type ResolvedRow = {
  branchId: number;
  branchName: string;
  booking: BulkImportBookingInput;
};

function normalizeSeparators(raw: string): string {
  return raw
    .replace(/[\u2024\u00B7\u2219]/g, '.')
    .replace(/[;։]/g, ':')
    .trim();
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (value.getFullYear() <= 1900) {
      const h = value.getHours();
      const min = value.getMinutes();
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
    const d = String(value.getDate()).padStart(2, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const y = value.getFullYear();
    return `${d}.${m}.${y}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const h = Math.floor(totalMinutes / 60) % 24;
      const min = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
    if (value > 40000 && value < 60000) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return `${String(parsed.d).padStart(2, '0')}.${String(parsed.m).padStart(2, '0')}.${parsed.y}`;
      }
    }
    return String(value);
  }
  return String(value).trim();
}

function readSheetCellText(sheet: XLSX.WorkSheet, rowIndex: number, colIndex: number, fallback: unknown): string {
  const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const cell = sheet[addr] as XLSX.CellObject | undefined;
  if (cell?.w && String(cell.w).trim()) {
    const formatted = String(cell.w).trim();
    if (!/1899|1900/.test(formatted)) return formatted;
  }
  if (cell?.v !== undefined) return cellText(cell.v);
  return cellText(fallback);
}

function parseDateToIso(raw: string): string | null {
  const trimmed = normalizeSeparators(raw);
  if (!trimmed) return null;
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(trimmed);
  if (!m) return null;
  const d = m[1]!.padStart(2, '0');
  const mo = m[2]!.padStart(2, '0');
  const y = m[3]!;
  return `${y}-${mo}-${d}`;
}

function parsePaymentStatus(raw: string): AdminBookingPaymentStatus {
  const s = raw.trim().toLowerCase();
  if (!s) return 'unpaid';
  if (/չվճարված|не\s*опла|unpaid/i.test(s)) return 'unpaid';
  if (/մասնական|частич|partial/i.test(s)) return 'partial';
  if (/վճարված|оплачен|paid/i.test(s)) return 'paid';
  return 'unpaid';
}

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[:：]/g, '');
}

function detectColumns(headerRow: unknown[]): Partial<Record<ColKey, number>> {
  const cols: Partial<Record<ColKey, number>> = {};
  headerRow.forEach((cell, index) => {
    const key = normalizeHeaderKey(cellText(cell));
    if (!key) return;
    (Object.keys(HEADER_ALIASES) as ColKey[]).forEach((colKey) => {
      if (cols[colKey] != null) return;
      const aliases = HEADER_ALIASES[colKey];
      if (aliases.some((a) => key === a || key.includes(a))) {
        cols[colKey] = index;
      }
    });
  });
  return cols;
}

/** Fallback when headers are missing/unknown — original fixed layout. */
function defaultColumns(): Record<ColKey, number> {
  return {
    date: 0,
    time: 1,
    instructor: 2,
    student: 3,
    phone: 4,
    status: 5,
    amount: 6,
    branch: -1,
  };
}

function resolveColumnMap(headerRow: unknown[]): { cols: Partial<Record<ColKey, number>>; usedFallback: boolean } {
  const detected = detectColumns(headerRow);
  const required: ColKey[] = ['date', 'time', 'instructor', 'student'];
  const missingRequired = required.some((k) => detected[k] == null);
  if (missingRequired) {
    return { cols: defaultColumns(), usedFallback: true };
  }
  return { cols: detected, usedFallback: false };
}

function parseWorkbookBuffer(buffer: Buffer): {
  rows: ParsedRow[];
  issues: string[];
  parseFailures: PracticalFlatXlsxSkippedRow[];
  hasBranchColumn: boolean;
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheetRows: 20000 });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], issues: ['Workbook has no sheets'], parseFailures: [], hasBranchColumn: false };
  }

  const sheet = workbook.Sheets[sheetName]!;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (matrix.length === 0) {
    return { rows: [], issues: ['Sheet is empty'], parseFailures: [], hasBranchColumn: false };
  }

  const { cols, usedFallback } = resolveColumnMap(matrix[0] ?? []);
  const issues: string[] = [];
  const parseFailures: PracticalFlatXlsxSkippedRow[] = [];
  if (usedFallback) {
    issues.push('Header row not recognized; using fixed column order (date, time, instructor, student, phone, status, amount)');
  }

  const dateCol = cols.date ?? 0;
  const timeCol = cols.time ?? 1;
  const instructorCol = cols.instructor ?? 2;
  const studentCol = cols.student ?? 3;
  const phoneCol = cols.phone ?? 4;
  const statusCol = cols.status ?? 5;
  const amountCol = cols.amount ?? 6;
  const branchCol = cols.branch ?? -1;
  const hasBranchColumn = branchCol >= 0;

  const rows: ParsedRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const dateRaw = readSheetCellText(sheet, i, dateCol, line[dateCol]);
    const timeRaw = normalizeSeparators(readSheetCellText(sheet, i, timeCol, line[timeCol]));
    const instructorName = cellText(line[instructorCol]).trim();
    const studentName = cellText(line[studentCol]).trim();
    const phoneRaw = phoneCol >= 0 ? cellText(line[phoneCol]) : '';
    const statusRaw = statusCol >= 0 ? cellText(line[statusCol]) : '';
    const amountRaw = amountCol >= 0 ? cellText(line[amountCol]) : '';
    const branchName = branchCol >= 0 ? cellText(line[branchCol]).trim() : '';

    if (!dateRaw && !timeRaw && !instructorName && !studentName) continue;

    const rowNumber = i + 1;
    const dateIso = parseDateToIso(dateRaw);
    const timeSlot = normalizeTimeHHMM(timeRaw);
    const totalPriceAmd = parseAmount(amountRaw);
    const adminPaymentStatus = parsePaymentStatus(statusRaw);
    const { phone, phone2 } = parseStudentPhones(phoneRaw);

    const fail = (reason: string) => {
      const msg = `Row ${rowNumber}: ${reason}`;
      issues.push(msg);
      parseFailures.push({
        rowNumber,
        kind: 'parse',
        studentName,
        instructorName,
        date: dateIso ?? dateRaw,
        timeSlot: timeSlot ?? timeRaw,
        reason,
        ...(phone ? { studentPhone: phone } : {}),
        ...(phone2 ? { studentPhone2: phone2 } : {}),
        totalPriceAmd,
        adminPaymentStatus,
        ...(branchName ? { branchName } : {}),
      });
    };

    if (!dateIso) {
      fail(`invalid date "${dateRaw}"`);
      continue;
    }
    if (!timeSlot) {
      fail(`invalid time "${timeRaw}"`);
      continue;
    }
    if (!instructorName) {
      fail('missing instructor');
      continue;
    }
    if (!studentName) {
      fail('missing student');
      continue;
    }

    rows.push({
      rowNumber,
      dateIso,
      timeSlot,
      instructorName,
      studentName,
      ...(branchName ? { branchName } : {}),
      ...(phone ? { studentPhone: phone } : {}),
      ...(phone2 ? { studentPhone2: phone2 } : {}),
      totalPriceAmd,
      adminPaymentStatus,
      ...(adminPaymentStatus === 'paid' && totalPriceAmd > 0 ? { paidAmountAmd: totalPriceAmd } : {}),
    });
  }

  return { rows, issues, parseFailures, hasBranchColumn };
}

function matchInstructorUser(
  excelName: string,
  instructors: Array<{ id: number; name: string }>,
): { user: { id: number; name: string }; warning?: string } | { error: string } {
  const needle = excelName.trim();
  if (!needle) return { error: 'Empty instructor name' };

  const exact = instructors.find((i) => i.name.trim() === needle);
  if (exact) return { user: exact };

  const lower = needle.toLowerCase();
  const ciExact = instructors.filter((i) => i.name.trim().toLowerCase() === lower);
  if (ciExact.length === 1) return { user: ciExact[0]! };
  if (ciExact.length > 1) {
    return { error: `Ambiguous instructor "${needle}" (exact CI matches: ${ciExact.map((i) => i.name).join(', ')})` };
  }

  const prefixHits = instructors.filter((i) => {
    const n = i.name.trim();
    const nl = n.toLowerCase();
    return nl === lower || nl.startsWith(`${lower} `) || nl.startsWith(`${lower}\u00a0`);
  });

  if (prefixHits.length === 1) {
    return {
      user: prefixHits[0]!,
      warning: `Mapped Excel "${needle}" → DB "${prefixHits[0]!.name}"`,
    };
  }
  if (prefixHits.length > 1) {
    return {
      error: `Ambiguous instructor "${needle}" (candidates: ${prefixHits.map((i) => i.name).join(', ')})`,
    };
  }

  return { error: `Instructor not found: "${needle}"` };
}

function matchBranchByName(
  branchName: string,
  branches: Array<{ id: number; name: string }>,
): { branch: { id: number; name: string } } | { error: string } {
  return matchBranchFromExcelCell(branchName, branches);
}

function toBulkInput(row: ParsedRow, canonicalInstructorName: string): BulkImportBookingInput {
  return {
    studentName: row.studentName,
    studentPhone: row.studentPhone,
    studentPhone2: row.studentPhone2,
    instructorName: canonicalInstructorName,
    date: row.dateIso,
    timeSlot: row.timeSlot,
    totalPriceAmd: row.totalPriceAmd,
    adminPaymentStatus: row.adminPaymentStatus,
    paidAmountAmd: row.paidAmountAmd,
    rowNumber: row.rowNumber,
  };
}

function emptyBulkResult(): BulkImportResult {
  return {
    imported: 0,
    skippedDuplicates: 0,
    newStudentsCreated: 0,
    errors: [],
    skippedRows: [],
    unmappableInstructors: [],
  };
}

function mergeBulkResults(into: BulkImportResult, from: BulkImportResult): void {
  into.imported += from.imported;
  into.skippedDuplicates += from.skippedDuplicates;
  into.newStudentsCreated += from.newStudentsCreated;
  into.errors.push(...from.errors);
  into.skippedRows.push(...from.skippedRows);
  for (const name of from.unmappableInstructors) {
    if (!into.unmappableInstructors.includes(name)) into.unmappableInstructors.push(name);
  }
}

function rowError(row: ParsedRow, reason: string, instructorName?: string): BulkImportRowError {
  return {
    rowNumber: row.rowNumber,
    studentName: row.studentName,
    instructorName: instructorName ?? row.instructorName,
    date: row.dateIso,
    timeSlot: row.timeSlot,
    reason,
    kind: 'error',
    ...(row.studentPhone ? { studentPhone: row.studentPhone } : {}),
    ...(row.studentPhone2 ? { studentPhone2: row.studentPhone2 } : {}),
    totalPriceAmd: row.totalPriceAmd,
    adminPaymentStatus: row.adminPaymentStatus,
    ...(row.branchName ? { branchName: row.branchName } : {}),
  };
}

function toSkippedRow(
  entry: BulkImportRowError,
  kind: PracticalFlatXlsxSkippedRow['kind'],
): PracticalFlatXlsxSkippedRow {
  return {
    rowNumber: entry.rowNumber ?? null,
    kind: entry.kind === 'duplicate' ? 'duplicate' : kind,
    studentName: entry.studentName,
    instructorName: entry.instructorName,
    date: entry.date,
    timeSlot: entry.timeSlot,
    reason: entry.reason,
    ...(entry.studentPhone ? { studentPhone: entry.studentPhone } : {}),
    ...(entry.studentPhone2 ? { studentPhone2: entry.studentPhone2 } : {}),
    ...(entry.totalPriceAmd != null ? { totalPriceAmd: entry.totalPriceAmd } : {}),
    ...(entry.adminPaymentStatus ? { adminPaymentStatus: entry.adminPaymentStatus } : {}),
    ...(entry.branchName ? { branchName: entry.branchName } : {}),
  };
}

function sortSkippedRows(rows: PracticalFlatXlsxSkippedRow[]): PracticalFlatXlsxSkippedRow[] {
  return [...rows].sort((a, b) => {
    const ar = a.rowNumber ?? Number.MAX_SAFE_INTEGER;
    const br = b.rowNumber ?? Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    return a.reason.localeCompare(b.reason);
  });
}

export default class PracticalFlatXlsxImportService {
  static async importFromBuffer(
    buffer: Buffer,
    options: PracticalFlatXlsxImportOptions = {},
  ): Promise<PracticalFlatXlsxImportResult> {
    const dryRun = Boolean(options.dryRun);
    const forceBranchId =
      options.forceBranchId != null && Number.isFinite(options.forceBranchId) && options.forceBranchId > 0
        ? Math.floor(options.forceBranchId)
        : null;

    const { rows, issues: parseIssues, parseFailures, hasBranchColumn } = parseWorkbookBuffer(buffer);

    const skippedRows: PracticalFlatXlsxSkippedRow[] = [...parseFailures];

    const result: PracticalFlatXlsxImportResult = {
      dryRun,
      parsedRows: rows.length,
      importableRows: 0,
      skippedUnresolved: 0,
      dualPhoneRows: rows.filter((r) => Boolean(r.studentPhone2)).length,
      paidRows: rows.filter((r) => r.adminPaymentStatus === 'paid').length,
      parseIssues,
      resolveWarnings: [],
      resolveErrors: [],
      instructorMappings: [],
      imported: 0,
      skippedDuplicates: 0,
      newStudentsCreated: 0,
      errors: [],
      skippedRows: [],
      unmappableInstructors: [],
    };

    if (hasBranchColumn) {
      result.resolveWarnings.push(
        'Branch column detected; cells may be codes 1–4 (or address). Non-empty cells override instructor branch lookup',
      );
    }

    if (rows.length === 0) {
      result.resolveErrors.push('No importable rows found');
      result.skippedRows = sortSkippedRows(skippedRows);
      return result;
    }

    const instructors = (
      await User.findAll({
        where: { accountType: 'instructor' },
        attributes: ['id', 'name'],
      })
    ).map((u) => ({ id: u.id, name: u.name ?? '' }));

    const allBranches = (
      await Branch.findAll({
        attributes: ['id', 'name'],
      })
    ).map((b) => ({ id: b.id, name: b.name ?? '' }));

    let forcedBranch: { id: number; name: string } | null = null;
    if (forceBranchId != null) {
      const branch = allBranches.find((b) => b.id === forceBranchId);
      if (!branch) {
        result.resolveErrors.push(`Forced branch id ${forceBranchId} not found`);
        return result;
      }
      forcedBranch = branch;
      result.resolveWarnings.push(`Using forced branch ${branch.name} (id=${branch.id}) for all rows`);
    }

    const instructorCache = new Map<string, InstructorCache | { error: string }>();
    const excelNames = [...new Set(rows.map((r) => r.instructorName))];

    for (const excelName of excelNames) {
      const matched = matchInstructorUser(excelName, instructors);
      if ('error' in matched) {
        instructorCache.set(excelName, { error: matched.error });
        result.resolveErrors.push(matched.error);
        continue;
      }
      if (matched.warning) result.resolveWarnings.push(matched.warning);
      const branchIds = await InstructorBranchService.listBranchIdsForInstructor(matched.user.id);
      instructorCache.set(excelName, {
        excelName,
        canonicalName: matched.user.name.trim(),
        userId: matched.user.id,
        branchIds,
      });
    }

    const resolved: ResolvedRow[] = [];
    const mappingSeen = new Set<string>();

    for (const row of rows) {
      const cached = instructorCache.get(row.instructorName);
      if (!cached || 'error' in cached) {
        result.skippedUnresolved += 1;
        const err = rowError(row, cached && 'error' in cached ? cached.error : 'Instructor not found');
        result.errors.push(err);
        skippedRows.push(toSkippedRow(err, 'resolve'));
        continue;
      }

      let branchId: number | null = null;
      let branchName: string | null = null;
      let resolveReason: string | null = null;

      if (forcedBranch) {
        if (!cached.branchIds.includes(forcedBranch.id)) {
          resolveReason = `Instructor "${cached.canonicalName}" does not serve forced branch "${forcedBranch.name}"`;
        } else {
          branchId = forcedBranch.id;
          branchName = forcedBranch.name;
        }
      } else if (row.branchName) {
        const matchedBranch = matchBranchByName(row.branchName, allBranches);
        if ('error' in matchedBranch) {
          resolveReason = matchedBranch.error;
        } else if (!cached.branchIds.includes(matchedBranch.branch.id)) {
          resolveReason = `Instructor "${cached.canonicalName}" does not serve branch "${matchedBranch.branch.name}"`;
        } else {
          branchId = matchedBranch.branch.id;
          branchName = matchedBranch.branch.name;
        }
      } else if (cached.branchIds.length === 0) {
        resolveReason = `Instructor "${cached.canonicalName}" has no linked branch (provide Branch column)`;
      } else if (cached.branchIds.length > 1) {
        const names = allBranches
          .filter((b) => cached.branchIds.includes(b.id))
          .map((b) => b.name)
          .join(', ');
        resolveReason = `Instructor "${cached.canonicalName}" serves multiple branches (${names}); Branch column required`;
      } else {
        const onlyId = cached.branchIds[0]!;
        const only = allBranches.find((b) => b.id === onlyId);
        if (!only) {
          resolveReason = `Instructor "${cached.canonicalName}" branch id ${onlyId} not found`;
        } else {
          branchId = only.id;
          branchName = only.name;
        }
      }

      const mapKey = `${row.instructorName}|${branchId ?? 'x'}|${branchName ?? ''}`;
      if (!mappingSeen.has(mapKey)) {
        mappingSeen.add(mapKey);
        result.instructorMappings.push({
          excelName: row.instructorName,
          canonicalName: cached.canonicalName,
          branchId,
          branchName,
        });
      }

      if (resolveReason || branchId == null || branchName == null) {
        result.skippedUnresolved += 1;
        const err = rowError(row, resolveReason ?? 'Branch unresolved', cached.canonicalName);
        result.errors.push(err);
        skippedRows.push(toSkippedRow(err, 'resolve'));
        continue;
      }

      resolved.push({
        branchId,
        branchName,
        booking: toBulkInput(row, cached.canonicalName),
      });
    }

    result.importableRows = resolved.length;

    if (resolved.length === 0) {
      result.resolveErrors.push('Nothing to import (no rows resolved to a branch)');
      result.skippedRows = sortSkippedRows(skippedRows);
      return result;
    }

    const byBranch = new Map<number, { branchName: string; bookings: BulkImportBookingInput[] }>();
    for (const item of resolved) {
      const bucket = byBranch.get(item.branchId) ?? { branchName: item.branchName, bookings: [] };
      bucket.bookings.push(item.booking);
      byBranch.set(item.branchId, bucket);
    }

    const totals = emptyBulkResult();
    for (const [branchId, bucket] of byBranch) {
      const imported = await BookingBulkImportService.bulkImportPractical({
        branchId,
        bookings: bucket.bookings,
        createdByUserId: options.createdByUserId,
        dryRun,
      });
      mergeBulkResults(totals, imported);
    }

    // dryRun: `imported` = rows that would be written (slot free)
    result.imported = totals.imported;
    result.skippedDuplicates = totals.skippedDuplicates;
    result.newStudentsCreated = dryRun ? 0 : totals.newStudentsCreated;
    result.errors.push(...totals.errors);
    result.unmappableInstructors = totals.unmappableInstructors;
    for (const s of totals.skippedRows) {
      skippedRows.push(toSkippedRow(s, s.kind === 'duplicate' ? 'duplicate' : 'error'));
    }
    result.skippedRows = sortSkippedRows(skippedRows);
    return result;
  }
}
