import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import DataTableToolbar from "src/components/DataTableToolbar";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import { Button } from "src/components/ui/button";
import { cn } from "src/lib/utils";
import {
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableWrap,
} from "./DirectorUi";
import type { DirectorTableColumn, DirectorTableSortDir } from "../useDirectorTable";
import type { useDirectorTable } from "../useDirectorTable";

type TableState<T> = ReturnType<typeof useDirectorTable<T>>;

export type DirectorDataTableColumn<T> = DirectorTableColumn<T> & {
  header: string;
  align?: "start" | "end";
  render: (row: T) => ReactNode;
};

type Props<T> = {
  table: TableState<T>;
  columns: DirectorDataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

function SortIcon({ active, dir }: { active: boolean; dir: DirectorTableSortDir }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export default function DirectorDataTable<T>({
  table,
  columns,
  rowKey,
  searchPlaceholder = "Որոնել…",
  emptyMessage = "Գրառումներ չկան",
}: Props<T>) {
  const {
    search,
    setSearch,
    sortKey,
    sortDir,
    toggleSort,
    columnFilters,
    setColumnFilter,
    getFilterOptions,
    page,
    setPage,
    totalPages,
    pageSize,
    totalCount,
    filteredCount,
    rows,
  } = table;

  return (
    <div className="mt-6 rounded-lg border border-border overflow-hidden bg-card">
      <DataTableToolbar value={search} onChange={setSearch} placeholder={searchPlaceholder} />
      <DirectorTableWrap className="mt-0 border-0 rounded-none">
        <DirectorTableHead>
          {columns.map((col) => {
            const filterOptions = col.filterable
              ? [{ value: "all", label: "Բոլորը" }, ...getFilterOptions(col)]
              : [];
            const filter =
              col.filterable && filterOptions.length > 1 ? (
                <TableColumnFilter
                  value={columnFilters[col.id] ?? "all"}
                  onChange={(v) => setColumnFilter(col.id, v)}
                  options={filterOptions}
                  ariaLabel={`Զտել ${col.header}`}
                />
              ) : undefined;

            if (col.sortable) {
              const active = sortKey === col.id;
              return (
                <th
                  key={col.id}
                  className={cn(
                    "text-left py-2.5 px-3 font-medium text-muted-foreground",
                    col.align === "end" && "text-right",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.id)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground transition-colors",
                      active && "text-foreground",
                      col.align === "end" && "ml-auto",
                    )}
                  >
                    <span>{col.header}</span>
                    <SortIcon active={active} dir={sortDir} />
                  </button>
                  {filter}
                </th>
              );
            }

            return (
              <TableColumnHeaderWithFilter
                key={col.id}
                title={col.header}
                filter={filter}
                align={col.align}
                className="py-2.5 px-3 text-sm"
              />
            );
          })}
        </DirectorTableHead>
        <DirectorTableBody>
          {rows.length === 0 ? (
            <DirectorTableRow>
              <DirectorTableTd colSpan={columns.length} className="text-center text-muted-foreground py-8">
                {emptyMessage}
              </DirectorTableTd>
            </DirectorTableRow>
          ) : (
            rows.map((row) => (
              <DirectorTableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <DirectorTableTd
                    key={col.id}
                    className={cn(col.align === "end" && "text-right")}
                  >
                    {col.render(row)}
                  </DirectorTableTd>
                ))}
              </DirectorTableRow>
            ))
          )}
        </DirectorTableBody>
      </DirectorTableWrap>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
        <span>
          Ցուցադրվում է {filteredCount === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, filteredCount)} / {filteredCount}
          {filteredCount !== totalCount ? ` (ընդամենը ${totalCount})` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Նախորդ
          </Button>
          <span className="tabular-nums px-1">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Հաջորդ
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
