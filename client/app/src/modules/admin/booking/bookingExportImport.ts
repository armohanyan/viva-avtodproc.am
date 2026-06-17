import * as XLSX from "xlsx";
import type { TranslationKey } from "src/lib/i18n";
import type { AdminBookingRow } from "src/modules/admin/booking/adminBookings.api";
import {
  bookingListPaymentRow,
  type AdminBookingPaymentStatus,
} from "src/modules/admin/booking/adminBookingPayment";

/** Sheet name for round-trip export/import workbooks. */
export const BOOKING_EXPORT_SHEET_NAME = "Bookings";

export type BookingExportColumnKey =
  | "studentName"
  | "studentPhone"
  | "branchName"
  | "instructorName"
  | "date"
  | "time"
  | "lessonType"
  | "totalPrice"
  | "paymentStatus"
  | "paidAmount"
  | "remainingAmount";

export const BOOKING_EXPORT_COLUMN_KEYS: BookingExportColumnKey[] = [
  "studentName",
  "studentPhone",
  "branchName",
  "instructorName",
  "date",
  "time",
  "lessonType",
  "totalPrice",
  "paymentStatus",
  "paidAmount",
  "remainingAmount",
];

export type BookingExportHeaderLabels = Record<BookingExportColumnKey, string>;

export const BOOKING_EXPORT_HEADER_ALIASES: Record<BookingExportColumnKey, string[]> = {
  studentName: ["studentName", "student", "Ուսանող", "Ученик"],
  studentPhone: ["studentPhone", "phone", "Հեռախոս", "Հեռախոսահամար", "Телефон"],
  branchName: ["branchName", "branch", "Մասնաճյուղ", "Филиал"],
  instructorName: ["instructorName", "instructor", "Դասavանդող", "Инструктор"],
  date: ["date", "dateIso", "Ամսաթիվ", "Дата"],
  time: ["time", "timeSlot", "Ժամ", "Время"],
  lessonType: ["lessonType", "type", "Տեսակ", "Тип"],
  totalPrice: ["totalPrice", "totalPriceAmd", "total", "Ընդհանուր գին", "Общая цена"],
  paymentStatus: ["paymentStatus", "payment", "Վճարում", "Оплата"],
  paidAmount: ["paidAmount", "paidAmountAmd", "paid", "Վճարված", "Оплачено"],
  remainingAmount: ["remainingAmount", "remaining", "Մնացորդ", "Остаток"],
};

export function normalizeExportHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function resolveBookingExportColumnKey(header: unknown): BookingExportColumnKey | null {
  const normalized = normalizeExportHeader(header);
  if (!normalized) return null;
  for (const key of BOOKING_EXPORT_COLUMN_KEYS) {
    for (const alias of BOOKING_EXPORT_HEADER_ALIASES[key]) {
      if (normalizeExportHeader(alias) === normalized) return key;
    }
  }
  return null;
}

export function isBookingExportHeaderRow(headerRow: unknown[]): boolean {
  let matches = 0;
  for (const cell of headerRow) {
    if (resolveBookingExportColumnKey(cell)) matches += 1;
  }
  return matches >= 4;
}

function bookingLessonTypeCode(type: AdminBookingRow["type"]): string {
  if (type === "theory") return "theory";
  if (type === "theory_personal") return "theory_personal";
  return "practical";
}

function paymentStatusCode(pay: ReturnType<typeof bookingListPaymentRow>): AdminBookingPaymentStatus {
  if (pay.status === "paid") return "paid";
  if (pay.status === "partial") return "partial";
  return "unpaid";
}

export type BookingExportRowInput = {
  booking: AdminBookingRow;
  studentLabel: string;
  branchLabel: string;
};

export function buildBookingExportSheetRows(items: BookingExportRowInput[]): string[][] {
  return items.map(({ booking, studentLabel, branchLabel }) => {
    const pay = bookingListPaymentRow(booking);
    const status = paymentStatusCode(pay);
    return [
      studentLabel,
      booking.studentPhone?.trim() ?? "",
      branchLabel,
      booking.instructorName,
      booking.dateIso.slice(0, 10),
      booking.time,
      bookingLessonTypeCode(booking.type),
      pay.totalAmd > 0 ? String(pay.totalAmd) : "",
      status,
      pay.paidAmd > 0 ? String(pay.paidAmd) : "",
      pay.remainingAmd > 0 ? String(pay.remainingAmd) : "",
    ];
  });
}

export function buildBookingExportWorkbook(
  headers: BookingExportHeaderLabels,
  items: BookingExportRowInput[],
): XLSX.WorkBook {
  const headerRow = BOOKING_EXPORT_COLUMN_KEYS.map((key) => headers[key]);
  const dataRows = buildBookingExportSheetRows(items);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, BOOKING_EXPORT_SHEET_NAME);
  return workbook;
}

export function downloadBookingExportXlsx(filename: string, workbook: XLSX.WorkBook): void {
  const name = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, name, { bookType: "xlsx", compression: true });
}

export function bookingExportHeaderLabels(t: (key: TranslationKey) => string): BookingExportHeaderLabels {
  return {
    studentName: t("bookingColStudent"),
    studentPhone: t("phone"),
    branchName: t("adminColBranch"),
    instructorName: t("cohortColInstructor"),
    date: t("date"),
    time: t("bookingColTime"),
    lessonType: t("bookingColType"),
    totalPrice: t("adminBookingPaymentTotalPrice"),
    paymentStatus: t("adminBookingsColPayment"),
    paidAmount: t("adminBookingPaymentPaidAmount"),
    remainingAmount: t("adminBookingPaymentRemaining"),
  };
}

export function bookingExportRowInputs(
  items: AdminBookingRow[],
  ctx: {
    studentLabel: (id: string, row?: Pick<AdminBookingRow, "studentName">) => string;
    branchLabel: (branchId: string) => string;
  },
): BookingExportRowInput[] {
  return items.map((booking) => ({
    booking,
    studentLabel: ctx.studentLabel(booking.studentId, booking),
    branchLabel: ctx.branchLabel(booking.branchId),
  }));
}
