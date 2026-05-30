import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Phone, Plus, X } from "lucide-react";
import { cn } from "src/lib/utils";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type { AdminStudentMini } from "src/modules/admin/useAdminStudents";

export type AdminStudentPickerStudent = AdminStudentMini;

export type AdminStudentPickerProps = {
  students: readonly AdminStudentPickerStudent[];
  /** Selected student id, or "" when nothing is selected. */
  value: string;
  onChange: (student: AdminStudentPickerStudent | null) => void;
  /** Required when admin wants to create a new student inline. */
  branchIdForNewStudent: string;
  /** Called when a new student is created so the parent can keep its directory in sync. */
  onStudentCreated?: (student: AdminStudentPickerStudent) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholderKey?: TranslationKey;
};

type CreateMode = "closed" | "open";

const TRIGGER_DEFAULT_PLACEHOLDER_KEY: TranslationKey = "adminStudentPickerSelectPlaceholder";

function formatPhone(phone: string): string {
  return phone.trim();
}

function normalizeForSearch(s: string): string {
  return s.trim().toLowerCase();
}

function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "");
}

function studentMatchesQuery(student: AdminStudentPickerStudent, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  if (student.name.toLowerCase().includes(q)) return true;
  if (student.email && student.email.toLowerCase().includes(q)) return true;
  if (student.phone && student.phone.toLowerCase().includes(q)) return true;
  const qDigits = digitsOnly(query);
  if (qDigits && student.phone && digitsOnly(student.phone).includes(qDigits)) return true;
  return false;
}

export default function AdminStudentPicker({
  students,
  value,
  onChange,
  branchIdForNewStudent,
  onStudentCreated,
  disabled = false,
  invalid = false,
  placeholderKey,
}: AdminStudentPickerProps) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>("closed");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const valueKey = value === "" || value == null ? "" : String(value);
  const selected = useMemo(
    () => students.find((s) => String(s.id) === valueKey) ?? null,
    [students, valueKey],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return students;
    return students.filter((s) => studentMatchesQuery(s, q));
  }, [students, query]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreateMode("closed");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setCreateMode("closed");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const triggerLabel = useMemo(() => {
    if (selected) {
      const phone = formatPhone(selected.phone);
      return phone ? `${selected.name} · ${phone}` : selected.name;
    }
    return t(placeholderKey ?? TRIGGER_DEFAULT_PLACEHOLDER_KEY);
  }, [selected, placeholderKey, t]);

  const closeAll = () => {
    setOpen(false);
    setCreateMode("closed");
    setQuery("");
    setNewName("");
    setNewPhone("");
  };

  const openCreate = () => {
    setCreateMode("open");
    const q = query.trim();
    const looksLikePhone = q.length > 0 && q.length === digitsOnly(q).length + (q.startsWith("+") ? 1 : 0);
    if (looksLikePhone) {
      setNewPhone((prev) => prev || q);
    } else {
      setNewName((prev) => prev || q);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    const phone = newPhone.trim();
    if (!name) {
      showToast(t("adminStudentPickerErrorNameRequired"), "error");
      return;
    }
    if (!branchIdForNewStudent) {
      showToast(t("adminStudentPickerErrorBranchRequired"), "error");
      return;
    }
    setCreating(true);
    try {
      const row = await vivaApiJson<{ id: number | string; name: string; email?: string; phone?: string | null }>(
        "/students",
        {
          method: "POST",
          body: {
            name,
            branchId: Number(branchIdForNewStudent),
            inviteToSystem: false,
            ...(phone ? { phone } : {}),
          },
        },
      );
      const created: AdminStudentPickerStudent = {
        id: String(row.id),
        name: row.name,
        email: (row.email ?? "").trim(),
        phone: (row.phone ?? phone ?? "").trim(),
      };
      onStudentCreated?.(created);
      onChange(created);
      showToast(t("adminStudentPickerCreatedToast"), "success");
      closeAll();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) {
              setQuery("");
              setCreateMode("closed");
            }
            return next;
          });
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          invalid && "border-red-500 focus:ring-red-500",
          disabled && "pointer-events-none opacity-50",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground")}>
          {triggerLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md"
          role="presentation"
        >
          {createMode === "open" ? (
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{t("adminStudentPickerCreateTitle")}</p>
                <button
                  type="button"
                  onClick={() => setCreateMode("closed")}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label={t("cancel")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t("adminStudentPickerNameLabel")} *
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleCreate();
                    }
                  }}
                  placeholder={t("adminStudentPickerNamePlaceholder")}
                  className="h-9"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t("adminStudentPickerPhoneLabel")}
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleCreate();
                    }
                  }}
                  placeholder={t("adminStudentPickerPhonePlaceholder")}
                  inputMode="tel"
                  className="h-9"
                />
              </div>
              {!branchIdForNewStudent ? (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {t("adminStudentPickerErrorBranchRequired")}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setCreateMode("closed")}
                  disabled={creating}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleCreate}
                  disabled={creating || !branchIdForNewStudent}
                >
                  {creating ? t("adminStudentPickerCreating") : t("adminStudentPickerCreate")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    if (filtered.length === 1) {
                      onChange(filtered[0]);
                      closeAll();
                    }
                  }
                }}
                placeholder={t("adminStudentPickerSearchPlaceholder")}
                className="mb-2 h-9"
                aria-label={t("adminStudentPickerSearchPlaceholder")}
              />
              <ul role="listbox" className="max-h-60 overflow-auto rounded-md p-0.5">
                {filtered.length === 0 ? (
                  <li className="px-2 py-2 text-sm text-muted-foreground">
                    {students.length === 0
                      ? t("adminStudentPickerEmpty")
                      : t("adminStudentPickerNoResults")}
                  </li>
                ) : (
                  filtered.map((s) => (
                    <li key={s.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={String(s.id) === valueKey}
                        className={cn(
                          "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                          String(s.id) === valueKey && "bg-muted/80",
                        )}
                        onClick={() => {
                          onChange(s);
                          closeAll();
                        }}
                      >
                        <span className="block truncate font-medium text-foreground">{s.name}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {formatPhone(s.phone) ? (
                            <>
                              <Phone className="h-3 w-3 shrink-0" aria-hidden />
                              <span className="truncate tabular-nums">{formatPhone(s.phone)}</span>
                            </>
                          ) : s.email ? (
                            <span className="truncate">{s.email}</span>
                          ) : (
                            <span className="italic">{t("adminStudentPickerNoPhone")}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  {t("adminStudentPickerAddNew")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
