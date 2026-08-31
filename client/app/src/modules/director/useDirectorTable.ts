import { useEffect, useMemo, useState } from "react";

export type DirectorTableSortDir = "asc" | "desc";

export type DirectorTableColumn<T> = {
  id: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  filterable?: boolean;
  filterValue?: (row: T) => string;
  filterOptions?: (rows: T[]) => { value: string; label: string }[];
  searchValue?: (row: T) => string;
};

type Options<T> = {
  rows: T[];
  columns: DirectorTableColumn<T>[];
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: DirectorTableSortDir;
};

export function useDirectorTable<T>({
  rows,
  columns,
  pageSize = 15,
  defaultSortKey = "date",
  defaultSortDir = "desc",
}: Options<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDir, setSortDir] = useState<DirectorTableSortDir>(defaultSortDir);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const matches = columns.some((col) => {
          const text = col.searchValue?.(row) ?? "";
          return text.toLowerCase().includes(q);
        });
        if (!matches) return false;
      }
      for (const col of columns) {
        const filterVal = columnFilters[col.id];
        if (!filterVal || filterVal === "all" || !col.filterValue) continue;
        if (col.filterValue(row) !== filterVal) return false;
      }
      return true;
    });
  }, [rows, search, columnFilters, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.id === sortKey);
    if (!col?.sortValue) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "hy") * dir;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, columnFilters, sortKey, sortDir, rows.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSort = (colId: string) => {
    if (sortKey === colId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(colId);
      setSortDir("asc");
    }
  };

  const setColumnFilter = (colId: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [colId]: value }));
  };

  const getFilterOptions = (col: DirectorTableColumn<T>) => {
    if (col.filterOptions) return col.filterOptions(rows);
    if (!col.filterValue) return [];
    const seen = new Map<string, string>();
    for (const row of rows) {
      const val = col.filterValue(row);
      if (!seen.has(val)) seen.set(val, val);
    }
    return [...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "hy"))
      .map(([value, label]) => ({ value, label }));
  };

  return {
    search,
    setSearch,
    sortKey,
    sortDir,
    toggleSort,
    columnFilters,
    setColumnFilter,
    getFilterOptions,
    page: safePage,
    setPage,
    totalPages,
    pageSize,
    totalCount: rows.length,
    filteredCount: sorted.length,
    rows: paginated,
  };
}
