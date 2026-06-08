import { vivaApiJson } from "src/lib/vivaApi";
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
