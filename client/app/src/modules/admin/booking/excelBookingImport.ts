import * as XLSX from "xlsx";
import type { Instructor } from "src/data/instructors";
import { parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import {
  adminPaymentApiPayload,
  adminPaymentStateAfterPaidStrChange,
  defaultAdminBookingPayment,
  paidStrForStatusChange,
  type AdminBookingPaymentStatus,
} from "src/modules/admin/booking/adminBookingPayment";

export type ParsedExcelBooking = {
  id: string;
  studentName: string;
  studentPhone: string;
  rawCellText: string;
  instructorName: string;
  date: string;
  dateIso: string;
  timeSlot: string;
  sheetName: string;
  /** Editable lesson total; defaults to instructor hourly rate for one slot. */
  totalPriceStr: string;
  paymentStatus: AdminBookingPaymentStatus;
  paidStr: string;
};

export type ExcelParseIssue = {
  sheetName: string;
  message: string;
};

export type ExcelParseResult = {
  bookings: ParsedExcelBooking[];
  issues: ExcelParseIssue[];
  skippedSheets: string[];
};

const DATE_TAB_RE = /^\d{2}\.\d{2}\.\d{4}$/;
const BREAK_LABEL = "Ընդմիջում";
const METADATA_RE = /\s*(գ\/փ|տ\/փ|գ\/հ)\s*\d*(ժ)?\s*/gi;
const TRAILING_LESSON_NUM_RE = /\s+\d+ժ?\s*$/u;

/** Armenian full stop used as time separator in Google Sheets exports. */
function normalizeColon(s: string): string {
  return s.replace(/։/g, ":").replace(/\./g, ":");
}

export function parseTabDateToIso(tabName: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(tabName.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function isoToDisplayDate(dateIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!m) return dateIso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function normalizeTimeCell(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  const raw = String(value).trim();
  if (!raw || raw === BREAK_LABEL) return null;

  const normalized = normalizeColon(raw);
  const m = /^(\d{1,2}):(\d{2})/.exec(normalized);
  if (!m) return null;

  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function cleanStudentName(raw: string): string {
  let name = raw.trim();
  name = name.replace(METADATA_RE, " ").trim();
  name = name.replace(TRAILING_LESSON_NUM_RE, "").trim();
  name = name.replace(/\s+/g, " ").trim();
  return name;
}

export function normalizeStudentPhone(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function splitCellStudentNames(cellValue: unknown): { raw: string; cleaned: string }[] {
  const raw = String(cellValue ?? "").trim();
  if (!raw) return [];

  return raw
    .split(/[\r\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ raw: part, cleaned: cleanStudentName(part) }))
    .filter((entry) => entry.cleaned.length > 0);
}

function extractCellCommentText(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  if (!cell?.c?.length) return "";
  return cell.c
    .map((comment) => String(comment.t ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

function isBreakRow(row: unknown[]): boolean {
  for (let c = 0; c < Math.min(row.length, 3); c++) {
    const cell = String(row[c] ?? "").trim();
    if (cell === BREAK_LABEL) return true;
  }
  return false;
}

function detectInstructorRow(rows: unknown[][]): { rowIndex: number; instructors: { colIndex: number; name: string }[] } | null {
  let best: { rowIndex: number; instructors: { colIndex: number; name: string }[] } | null = null;

  for (let r = 0; r < Math.min(rows.length, 4); r++) {
    const row = rows[r] ?? [];
    const instructors: { colIndex: number; name: string }[] = [];
    for (let c = 2; c < row.length; c++) {
      const name = String(row[c] ?? "").trim();
      if (!name || name === BREAK_LABEL) continue;
      if (/^\d+([.:]\d+)?$/.test(name)) continue;
      instructors.push({ colIndex: c, name });
    }
    if (instructors.length >= 2 && (!best || instructors.length > best.instructors.length)) {
      best = { rowIndex: r, instructors };
    }
  }

  return best;
}

function detectTimeColumnIndex(rows: unknown[][], instructorRowIndex: number): number {
  for (let r = instructorRowIndex + 1; r < Math.min(rows.length, instructorRowIndex + 20); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c <= 2; c++) {
      const time = normalizeTimeCell(row[c]);
      if (time) return c;
    }
  }
  return 1;
}

function makeBookingId(parts: {
  dateIso: string;
  timeSlot: string;
  instructorName: string;
  studentName: string;
  sheetName: string;
  index: number;
}): string {
  return [
    parts.sheetName,
    parts.dateIso,
    parts.timeSlot,
    parts.instructorName,
    parts.studentName,
    String(parts.index),
  ].join("|");
}

function parseSheetRows(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): { bookings: ParsedExcelBooking[]; issues: ExcelParseIssue[] } {
  const bookings: ParsedExcelBooking[] = [];
  const issues: ExcelParseIssue[] = [];

  const dateIso = parseTabDateToIso(sheetName);
  if (!dateIso) {
    issues.push({ sheetName, message: "Invalid date tab name" });
    return { bookings, issues };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const header = detectInstructorRow(rows);
  if (!header) {
    issues.push({ sheetName, message: "Could not find instructor header row" });
    return { bookings, issues };
  }

  const timeCol = detectTimeColumnIndex(rows, header.rowIndex);
  const seen = new Set<string>();

  for (let r = header.rowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (isBreakRow(row)) continue;

    const timeSlot = normalizeTimeCell(row[timeCol]);
    if (!timeSlot) continue;

    for (const { colIndex, name: instructorName } of header.instructors) {
      const addr = XLSX.utils.encode_cell({ r, c: colIndex });
      const cell = sheet[addr];
      const cellValue = cell?.v ?? row[colIndex];
      const commentPhone = normalizeStudentPhone(extractCellCommentText(sheet, r, colIndex));
      const students = splitCellStudentNames(cellValue);

      students.forEach(({ raw, cleaned }, index) => {
        const dedupeKey = `${dateIso}\t${timeSlot}\t${instructorName}\t${cleaned}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        bookings.push({
          id: makeBookingId({ sheetName, dateIso, timeSlot, instructorName, studentName: cleaned, index }),
          studentName: cleaned,
          studentPhone: index === 0 ? commentPhone : "",
          rawCellText: raw,
          instructorName,
          date: sheetName,
          dateIso,
          timeSlot,
          sheetName,
          totalPriceStr: "",
          paidStr: "",
          paymentStatus: "unpaid",
        });
      });
    }
  }

  return { bookings, issues };
}

export async function parseExcelBookingWorkbook(file: File): Promise<ExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const bookings: ParsedExcelBooking[] = [];
  const issues: ExcelParseIssue[] = [];
  const skippedSheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!DATE_TAB_RE.test(sheetName.trim())) {
      skippedSheets.push(sheetName);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const parsed = parseSheetRows(sheetName, sheet);
    bookings.push(...parsed.bookings);
    issues.push(...parsed.issues);
  }

  bookings.sort((a, b) => {
    const byDate = a.dateIso.localeCompare(b.dateIso);
    if (byDate !== 0) return byDate;
    const byInstructor = a.instructorName.localeCompare(b.instructorName, "hy");
    if (byInstructor !== 0) return byInstructor;
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  return { bookings, issues, skippedSheets };
}

export type BulkImportBookingPayload = {
  studentName: string;
  studentPhone?: string;
  instructorName: string;
  date: string;
  timeSlot: string;
  totalPriceAmd: number;
  adminPaymentStatus: AdminBookingPaymentStatus;
  paidAmountAmd?: number;
  paymentNotes?: string | null;
  paymentReminderDate?: string | null;
};

export function instructorHourlyPriceAmd(instructors: readonly Instructor[], instructorName: string): number {
  const name = instructorName.trim();
  const ins = instructors.find((i) => i.name.trim() === name);
  return ins && Number.isFinite(ins.hourlyPrice) ? Math.max(0, Math.round(ins.hourlyPrice)) : 0;
}

export function defaultTotalPriceStrForImport(instructors: readonly Instructor[], instructorName: string): string {
  const hourly = instructorHourlyPriceAmd(instructors, instructorName);
  return hourly > 0 ? String(hourly) : "";
}

export function parseImportTotalPriceAmd(totalPriceStr: string, fallbackHourly: number): number {
  const parsed = parseAmdInput(totalPriceStr);
  if (!Number.isFinite(parsed) || parsed < 0) return Math.max(0, Math.round(fallbackHourly));
  return Math.max(0, Math.round(parsed));
}

export function rowTotalPriceAmd(booking: ParsedExcelBooking, instructors: readonly Instructor[]): number {
  const fallback = instructorHourlyPriceAmd(instructors, booking.instructorName);
  return parseImportTotalPriceAmd(booking.totalPriceStr, fallback);
}

export function withImportPaymentDefaults(
  booking: Omit<ParsedExcelBooking, "totalPriceStr" | "paidStr" | "paymentStatus">,
  instructors: readonly Instructor[],
): ParsedExcelBooking {
  const totalPriceStr = defaultTotalPriceStrForImport(instructors, booking.instructorName);
  return {
    ...booking,
    totalPriceStr,
    paidStr: "",
    paymentStatus: "unpaid",
  };
}

export function applyImportPaymentDefaults(
  bookings: ParsedExcelBooking[],
  instructors: readonly Instructor[],
): ParsedExcelBooking[] {
  return bookings.map((booking) =>
    withImportPaymentDefaults(
      {
        id: booking.id,
        studentName: booking.studentName,
        studentPhone: booking.studentPhone,
        rawCellText: booking.rawCellText,
        instructorName: booking.instructorName,
        date: booking.date,
        dateIso: booking.dateIso,
        timeSlot: booking.timeSlot,
        sheetName: booking.sheetName,
      },
      instructors,
    ),
  );
}

export function toBulkImportPayload(
  bookings: ParsedExcelBooking[],
  instructors: readonly Instructor[],
): BulkImportBookingPayload[] {
  return bookings.map((b) => {
    const total = rowTotalPriceAmd(b, instructors);
    const paymentPayload = adminPaymentApiPayload(
      {
        ...defaultAdminBookingPayment(b.paymentStatus),
        status: b.paymentStatus,
        paidStr: b.paidStr,
      },
      total,
    );
    return {
      studentName: b.studentName.trim(),
      studentPhone: b.studentPhone.trim() || undefined,
      instructorName: b.instructorName.trim(),
      date: b.dateIso,
      timeSlot: b.timeSlot,
      totalPriceAmd: total,
      ...paymentPayload,
    };
  });
}

type BookingFieldPatch = Partial<
  Pick<
    ParsedExcelBooking,
    "studentName" | "studentPhone" | "instructorName" | "date" | "timeSlot" | "totalPriceStr" | "paymentStatus" | "paidStr"
  >
>;

export function applyBookingFieldPatch(
  booking: ParsedExcelBooking,
  patch: BookingFieldPatch,
  opts?: { instructors?: readonly Instructor[] },
): ParsedExcelBooking {
  const next: ParsedExcelBooking = { ...booking, ...patch };

  if (patch.date !== undefined) {
    const trimmed = patch.date.trim();
    next.date = trimmed;
    const iso = parseTabDateToIso(trimmed);
    if (iso) next.dateIso = iso;
  }

  if (patch.timeSlot !== undefined) {
    next.timeSlot = normalizeTimeCell(patch.timeSlot) ?? patch.timeSlot.trim();
  }

  if (patch.studentName !== undefined) {
    next.studentName = cleanStudentName(patch.studentName) || patch.studentName.trim();
  }

  if (patch.studentPhone !== undefined) {
    next.studentPhone = normalizeStudentPhone(patch.studentPhone);
  }

  if (patch.instructorName !== undefined) {
    next.instructorName = patch.instructorName.trim();
    if (opts?.instructors) {
      next.totalPriceStr = defaultTotalPriceStrForImport(opts.instructors, next.instructorName);
      if (next.paymentStatus === "paid") {
        next.paidStr = next.totalPriceStr;
      }
    }
  }

  if (patch.totalPriceStr !== undefined) {
    next.totalPriceStr = patch.totalPriceStr;
  }

  if (patch.paymentStatus !== undefined) {
    const total = opts?.instructors
      ? rowTotalPriceAmd({ ...next, totalPriceStr: next.totalPriceStr }, opts.instructors)
      : parseImportTotalPriceAmd(next.totalPriceStr, 0);
    next.paymentStatus = patch.paymentStatus;
    next.paidStr = paidStrForStatusChange(patch.paymentStatus, total, next.paidStr);
  }

  if (patch.paidStr !== undefined) {
    const total = opts?.instructors
      ? rowTotalPriceAmd({ ...next, totalPriceStr: next.totalPriceStr }, opts.instructors)
      : parseImportTotalPriceAmd(next.totalPriceStr, 0);
    const synced = adminPaymentStateAfterPaidStrChange(
      { ...defaultAdminBookingPayment(next.paymentStatus), status: next.paymentStatus, paidStr: next.paidStr },
      patch.paidStr,
      total,
    );
    next.paidStr = synced.paidStr;
    next.paymentStatus = synced.status;
  }

  if (patch.totalPriceStr !== undefined && patch.paymentStatus === undefined && patch.paidStr === undefined) {
    const total = opts?.instructors
      ? rowTotalPriceAmd({ ...next, totalPriceStr: next.totalPriceStr }, opts.instructors)
      : parseImportTotalPriceAmd(next.totalPriceStr, 0);
    const synced = adminPaymentStateAfterPaidStrChange(
      { ...defaultAdminBookingPayment(next.paymentStatus), status: next.paymentStatus, paidStr: next.paidStr },
      next.paidStr,
      total,
    );
    next.paidStr = synced.paidStr;
    next.paymentStatus = synced.status;
  }

  return next;
}
