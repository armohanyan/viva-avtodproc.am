import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "src/lib/utils";
import { Input } from "src/components/ui/input";
import type { AdminStudentMini } from "src/modules/admin/useAdminStudents";

export type AdminStudentSearchSelectProps = {
  students: AdminStudentMini[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** When true, the list includes a control that clears the value (e.g. optional directory pick). */
  allowClear?: boolean;
  clearLabel?: string;
  searchPlaceholder: string;
  selectPlaceholder: string;
  noResultsLabel: string;
  emptyListLabel: string;
};

export default function AdminStudentSearchSelect({
  students,
  value,
  onChange,
  disabled = false,
  allowClear = false,
  clearLabel = "—",
  searchPlaceholder,
  selectPlaceholder,
  noResultsLabel,
  emptyListLabel,
}: AdminStudentSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => students.find((s) => String(s.id) === String(value)) ?? null,
    [students, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, query]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const displayLabel = selected?.name ?? selectPlaceholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) setQuery("");
            return next;
          });
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "pointer-events-none opacity-50",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground")}>{displayLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md"
          role="presentation"
        >
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="mb-2 h-9"
            aria-label={searchPlaceholder}
          />
          <ul role="listbox" className="max-h-60 overflow-auto rounded-md p-0.5">
            {allowClear && value ? (
              <li role="presentation" className="mb-1 border-b border-border pb-1">
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {clearLabel}
                </button>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">{students.length === 0 ? emptyListLabel : noResultsLabel}</li>
            ) : (
              filtered.map((s) => (
                <li key={String(s.id)} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={String(s.id) === String(value)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      String(s.id) === String(value) && "bg-muted/80",
                    )}
                    onClick={() => {
                      onChange(String(s.id));
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="block truncate font-medium text-foreground">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
