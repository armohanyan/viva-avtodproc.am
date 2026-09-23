import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "src/lib/api";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import {
  ADMIN_STUDENTS_PAGE_SIZE,
  fetchAdminStudentsPage,
  fetchAllAdminStudents,
  type AdminStudentListFilters,
  type AdminStudentListItem,
} from "src/modules/admin/adminStudents.api";

type State = {
  items: AdminStudentListItem[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  error: string | null;
};

export function useAdminStudentsList(search: string, instructor: string) {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const [state, setState] = useState<State>({
    items: [],
    page: 1,
    pageSize: ADMIN_STUDENTS_PAGE_SIZE,
    total: 0,
    loading: true,
    error: null,
  });
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filterKey = `${debouncedSearch}\0${instructor}\0${branchFilterRevision}`;
  const filterKeyRef = useRef(filterKey);
  if (filterKeyRef.current !== filterKey) {
    filterKeyRef.current = filterKey;
    if (page !== 1) setPage(1);
  }

  const queryFilters = useMemo<AdminStudentListFilters>(
    () => ({
      search: debouncedSearch,
      instructor,
    }),
    [debouncedSearch, instructor],
  );

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAdminStudentsPage(page, ADMIN_STUDENTS_PAGE_SIZE, queryFilters);
      if (seq !== requestSeq.current) return;
      const total = data.total ?? 0;
      const size = data.pageSize ?? ADMIN_STUDENTS_PAGE_SIZE;
      const lastPage = Math.max(1, Math.ceil(total / Math.max(1, size)));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setState({
        items: data.items,
        page: data.page ?? page,
        pageSize: size,
        total,
        loading: false,
        error: null,
      });
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getApiErrorMessage(e),
      }));
    }
  }, [page, queryFilters]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  const refresh = useCallback(async () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    await load();
  }, [load, page]);

  const fetchAll = useCallback(async () => fetchAllAdminStudents(queryFilters), [queryFilters]);

  const totalPages = Math.max(1, Math.ceil(state.total / Math.max(1, state.pageSize)));

  return {
    students: state.items,
    loading: state.loading,
    error: state.error,
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    totalPages,
    setPage,
    refresh,
    fetchAll,
  };
}
