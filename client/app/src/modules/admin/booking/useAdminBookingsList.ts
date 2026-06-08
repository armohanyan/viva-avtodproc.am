import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "src/lib/api";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import type { AdminBookingsTab } from "src/modules/admin/booking/bookingsTabs";
import type { BookingPaymentFilter } from "src/modules/admin/booking/adminBookingPayment";
import {
  ADMIN_BOOKINGS_PAGE_SIZE,
  fetchAdminBookingsPage,
  normalizeAdminBookingRow,
  type AdminBookingRow,
  type BookingCreatedByFilter,
} from "src/modules/admin/booking/adminBookings.api";

export type AdminBookingsListFilters = {
  tab: AdminBookingsTab;
  search: string;
  status: string;
  lessonType: string;
  payment: BookingPaymentFilter;
  studentUserId: string;
  instructorUserId: string;
  createdByType: BookingCreatedByFilter;
};

type State = {
  items: AdminBookingRow[];
  page: number;
  pageSize: number;
  total: number;
  debtsCount: number;
  loading: boolean;
  error: string | null;
};

export function useAdminBookingsList(filters: AdminBookingsListFilters) {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const [state, setState] = useState<State>({
    items: [],
    page: 1,
    pageSize: ADMIN_BOOKINGS_PAGE_SIZE,
    total: 0,
    debtsCount: 0,
    loading: true,
    error: null,
  });
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.tab,
    debouncedSearch,
    filters.status,
    filters.lessonType,
    filters.payment,
    filters.studentUserId,
    filters.instructorUserId,
    filters.createdByType,
    branchFilterRevision,
  ]);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAdminBookingsPage(page, ADMIN_BOOKINGS_PAGE_SIZE, queryFilters);
      setState({
        items: Array.isArray(data.items) ? data.items.map(normalizeAdminBookingRow) : [],
        page: data.page ?? page,
        pageSize: data.pageSize ?? ADMIN_BOOKINGS_PAGE_SIZE,
        total: data.total ?? 0,
        debtsCount: data.debtsCount ?? 0,
        loading: false,
        error: null,
      });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        items: [],
        loading: false,
        error: getApiErrorMessage(e),
      }));
    }
  }, [page, queryFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));

  return {
    bookings: state.items,
    loading: state.loading,
    error: state.error,
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    totalPages,
    debtsCount: state.debtsCount,
    setPage,
    refresh,
  };
}
