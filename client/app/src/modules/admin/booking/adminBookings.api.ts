import { ApiRequestError } from "src/lib/api";
import { vivaApiFetch, vivaApiJson } from "src/lib/vivaApi";
import type { PaginatedList } from "src/types/pagination.types";
import type { AdminBookingsTab } from "src/modules/admin/booking/bookingsTabs";
import type { BookingPaymentFilter } from "src/modules/admin/booking/adminBookingPayment";

export type AdminBookingFinanceLink = {
  id: number;
  source: "manual" | "system";
  method: string;
  createdAt: string;
  grossAmd: number;
};

export type BookingCreatedByType = "student" | "admin" | "unknown";

export type BookingCreatedByFilter = "all" | "student" | "admin";

export type AdminBookingListItem = {
  id: number;
  studentId: number;
  createdByType: BookingCreatedByType;
  createdByUserId?: number | null;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentPhone2: string;
  instructorName: string;
  dateIso: string;
  time: string;
  endTime?: string | null;
  slotEntries?: { dateIso: string; time: string }[];
  totalPriceAmd?: number | null;
  paymentStatus?: string | null;
  paidAmountAmd?: number | null;
  paymentNotes?: string | null;
  paymentReminderDateIso?: string | null;
  type: "practical" | "theory" | "theory_personal";
  status: string;
  branchId: number;
  cancellationRequestedAt?: string | null;
  meetLink?: string | null;
  manualFinanceTx: AdminBookingFinanceLink | null;
  systemFinanceTx: AdminBookingFinanceLink | null;
};

export type AdminBookingListResponse = PaginatedList<AdminBookingListItem> & {
  debtsCount: number;
};

export type AdminBookingListFilters = {
  tab: AdminBookingsTab;
  search: string;
  status: string;
  lessonType: string;
  payment: BookingPaymentFilter;
  studentUserId: string;
  instructorUserId: string;
  createdByType: BookingCreatedByFilter;
};

export const ADMIN_BOOKINGS_PAGE_SIZE = 25;
/** Backend caps page size at 100 — use for export pagination. */
export const ADMIN_BOOKINGS_EXPORT_PAGE_SIZE = 100;

export function buildAdminBookingsQuery(
  page: number,
  pageSize: number,
  filters: AdminBookingListFilters,
): string {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    tab: filters.tab === "debts" ? "debts" : "all",
  });
  const search = filters.search.trim();
  if (search) qs.set("search", search);
  if (filters.status && filters.status !== "all") qs.set("status", filters.status);
  if (filters.lessonType && filters.lessonType !== "all") qs.set("lessonType", filters.lessonType);
  if (filters.tab === "all" && filters.payment && filters.payment !== "all") {
    qs.set("payment", filters.payment);
  }
  if (filters.studentUserId.trim()) qs.set("filterStudentUserId", filters.studentUserId.trim());
  if (filters.instructorUserId.trim()) qs.set("filterInstructorUserId", filters.instructorUserId.trim());
  if (filters.createdByType && filters.createdByType !== "all") {
    qs.set("createdByType", filters.createdByType);
  }
  return qs.toString();
}

export async function fetchAdminBookingsPage(
  page: number,
  pageSize: number,
  filters: AdminBookingListFilters,
): Promise<AdminBookingListResponse> {
  const query = buildAdminBookingsQuery(page, pageSize, filters);
  return vivaApiJson<AdminBookingListResponse>(`/bookings?${query}`);
}

/** Fetch every booking matching the current filters (paginates through the API). */
export async function fetchAllAdminBookings(
  filters: AdminBookingListFilters,
): Promise<AdminBookingRow[]> {
  const all: AdminBookingRow[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchAdminBookingsPage(page, ADMIN_BOOKINGS_EXPORT_PAGE_SIZE, filters);
    const items = Array.isArray(data.items) ? data.items.map(normalizeAdminBookingRow) : [];
    all.push(...items);
    const total = data.total ?? items.length;
    const pageSize = data.pageSize ?? ADMIN_BOOKINGS_EXPORT_PAGE_SIZE;
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    page += 1;
  }

  return all;
}

export async function fetchAdminBookingById(id: string | number): Promise<AdminBookingListItem> {
  return vivaApiJson<AdminBookingListItem>(`/bookings/${encodeURIComponent(String(id))}`);
}

export function normalizeAdminBookingRow(row: AdminBookingListItem) {
  return {
    ...row,
    id: String(row.id),
    studentId: String(row.studentId),
    branchId: String(row.branchId),
    createdByType: row.createdByType ?? "unknown",
  };
}

export type AdminBookingRow = ReturnType<typeof normalizeAdminBookingRow>;

export type BulkImportBookingItem = {
  studentName: string;
  studentPhone?: string;
  studentPhone2?: string;
  instructorName: string;
  date: string;
  timeSlot: string;
  totalPriceAmd: number;
  adminPaymentStatus: "paid" | "partial" | "unpaid";
  paidAmountAmd?: number;
  paymentNotes?: string | null;
  paymentReminderDate?: string | null;
};

export type BulkImportBookingsResponse = {
  imported: number;
  skippedDuplicates: number;
  newStudentsCreated: number;
  errors: Array<{
    studentName: string;
    instructorName: string;
    date: string;
    timeSlot: string;
    reason: string;
  }>;
  unmappableInstructors: string[];
};

export async function bulkImportBookings(input: {
  branchId: number;
  bookings: BulkImportBookingItem[];
}): Promise<BulkImportBookingsResponse> {
  const chunkSize = 500;
  const aggregated: BulkImportBookingsResponse = {
    imported: 0,
    skippedDuplicates: 0,
    newStudentsCreated: 0,
    errors: [],
    unmappableInstructors: [],
  };

  for (let i = 0; i < input.bookings.length; i += chunkSize) {
    const chunk = input.bookings.slice(i, i + chunkSize);
    const result = await vivaApiJson<BulkImportBookingsResponse>("/bookings/bulk-import", {
      method: "POST",
      body: { branchId: input.branchId, bookings: chunk },
    });
    aggregated.imported += result.imported;
    aggregated.skippedDuplicates += result.skippedDuplicates;
    aggregated.newStudentsCreated += result.newStudentsCreated;
    aggregated.errors.push(...result.errors);
    for (const name of result.unmappableInstructors) {
      if (!aggregated.unmappableInstructors.includes(name)) {
        aggregated.unmappableInstructors.push(name);
      }
    }
  }

  aggregated.unmappableInstructors.sort((a, b) => a.localeCompare(b, "hy"));
  return aggregated;
}

/** Temporary flat practical XLSX import (optional Branch column). */
export type PracticalFlatXlsxSkippedRow = {
  rowNumber: number | null;
  kind: "parse" | "resolve" | "duplicate" | "error";
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
  errors: BulkImportBookingsResponse["errors"];
  skippedRows: PracticalFlatXlsxSkippedRow[];
  unmappableInstructors: string[];
};

export async function importPracticalFlatXlsx(input: {
  file: File;
  dryRun?: boolean;
}): Promise<PracticalFlatXlsxImportResult> {
  const body = new FormData();
  body.append("file", input.file);
  const q = input.dryRun ? "?dryRun=1" : "";
  const res = await vivaApiFetch(`/bookings/import-practical-xlsx${q}`, {
    method: "POST",
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text || res.statusText;
    if (text) {
      try {
        const j = JSON.parse(text) as { message?: string };
        if (typeof j.message === "string" && j.message.trim()) message = j.message.trim();
      } catch {
        /* keep raw */
      }
    }
    throw new ApiRequestError(message, res.status, text || undefined);
  }
  try {
    return JSON.parse(text) as PracticalFlatXlsxImportResult;
  } catch {
    throw new ApiRequestError("Invalid import response", res.status, text || undefined);
  }
}
