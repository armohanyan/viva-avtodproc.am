import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { cn } from "src/lib/utils";
import type { Branch } from "src/modules/branches/branch.types";
import type { Instructor } from "src/data/instructors";
import {
  bulkImportBookings,
  type BulkImportBookingsResponse,
} from "src/modules/admin/booking/adminBookings.api";
import {
  adminPaymentStatusLabelKey,
  validateAdminBookingPayment,
  type AdminBookingPaymentStatus,
} from "src/modules/admin/booking/adminBookingPayment";
import {
  applyBookingFieldPatch,
  applyImportPaymentDefaults,
  parseExcelBookingWorkbook,
  rowTotalPriceAmd,
  toBulkImportPayload,
  type ParsedExcelBooking,
} from "src/modules/admin/booking/excelBookingImport";

export type ExcelBookingImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: readonly Branch[];
  instructors: readonly Instructor[];
  defaultBranchId: string;
  onImported?: () => void;
};

type GroupRow =
  | { kind: "date"; dateIso: string; monthKey: string; label: string; isMonthStart: boolean }
  | { kind: "instructor"; instructorName: string; dateIso: string }
  | { kind: "booking"; booking: ParsedExcelBooking };

function monthKeyFromDateIso(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function formatMonthLabel(monthKey: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const locale = lang === "am" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US";
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function buildGroupedRows(bookings: ParsedExcelBooking[], lang: string): GroupRow[] {
  const rows: GroupRow[] = [];
  let lastDate = "";
  let lastInstructor = "";
  let lastMonthKey = "";

  for (const booking of bookings) {
    const monthKey = monthKeyFromDateIso(booking.dateIso);
    if (booking.dateIso !== lastDate) {
      const isMonthStart = monthKey !== lastMonthKey;
      rows.push({
        kind: "date",
        dateIso: booking.dateIso,
        monthKey,
        label: formatShortDateFromIso(booking.dateIso, lang),
        isMonthStart,
      });
      lastDate = booking.dateIso;
      lastMonthKey = monthKey;
      lastInstructor = "";
    }
    const instructorKey = `${booking.dateIso}|${booking.instructorName}`;
    const prevInstructorKey = lastInstructor ? `${lastDate}|${lastInstructor}` : "";
    if (instructorKey !== prevInstructorKey) {
      rows.push({ kind: "instructor", instructorName: booking.instructorName, dateIso: booking.dateIso });
      lastInstructor = booking.instructorName;
    }
    rows.push({ kind: "booking", booking });
  }

  return rows;
}

export default function ExcelBookingImportModal({
  open,
  onOpenChange,
  branches,
  instructors,
  defaultBranchId,
  onImported,
}: ExcelBookingImportModalProps) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bookings, setBookings] = useState<ParsedExcelBooking[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parseIssues, setParseIssues] = useState<string[]>([]);
  const [fileLabel, setFileLabel] = useState("");
  const [branchId, setBranchId] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const resetState = useCallback(() => {
    setBookings([]);
    setSelectedIds(new Set());
    setParseIssues([]);
    setFileLabel("");
    setParsing(false);
    setImporting(false);
    setMonthFilter("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    const fallback = branches[0]?.id != null ? String(branches[0].id) : "";
    const preferred =
      defaultBranchId && branches.some((b) => String(b.id) === String(defaultBranchId))
        ? String(defaultBranchId)
        : fallback;
    setBranchId(preferred);
  }, [open, defaultBranchId, branches, resetState]);

  const availableMonths = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookings) {
      const key = monthKeyFromDateIso(booking.dateIso);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, count, label: formatMonthLabel(key, lang) }));
  }, [bookings, lang]);

  const groupedRows = useMemo(() => buildGroupedRows(bookings, lang), [bookings, lang]);

  const scrollToMonth = useCallback((monthKey: string) => {
    setMonthFilter(monthKey);
    window.requestAnimationFrame(() => {
      if (!monthKey) {
        tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = tableScrollRef.current?.querySelector<HTMLElement>(`[data-import-month="${monthKey}"]`);
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, []);

  const selectedCount = useMemo(
    () => bookings.filter((b) => selectedIds.has(b.id)).length,
    [bookings, selectedIds],
  );

  const allSelected = bookings.length > 0 && selectedCount === bookings.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map((b) => b.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateBooking = useCallback(
    (id: string, patch: Parameters<typeof applyBookingFieldPatch>[1]) => {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? applyBookingFieldPatch(booking, patch, { instructors }) : booking,
        ),
      );
    },
    [instructors],
  );

  const selectedBookings = useMemo(
    () => bookings.filter((b) => selectedIds.has(b.id)),
    [bookings, selectedIds],
  );

  const missingPhoneCount = useMemo(
    () => selectedBookings.filter((b) => !b.studentPhone.trim()).length,
    [selectedBookings],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setFileLabel(file.name);
    try {
      const result = await parseExcelBookingWorkbook(file);
      setBookings(applyImportPaymentDefaults(result.bookings, instructors));
      setSelectedIds(new Set(result.bookings.map((b) => b.id)));
      setMonthFilter("");

      const issues: string[] = [];
      if (result.skippedSheets.length > 0) {
        issues.push(
          t("adminBookingsImportSkippedSheets").replace("{count}", String(result.skippedSheets.length)),
        );
      }
      for (const issue of result.issues) {
        issues.push(`${issue.sheetName}: ${issue.message}`);
      }
      setParseIssues(issues);

      if (result.bookings.length === 0) {
        showToast(t("adminBookingsImportNoBookings"), "error");
      } else {
        showToast(
          t("adminBookingsImportParsedToast").replace("{count}", String(result.bookings.length)),
          "success",
        );
      }
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
      resetState();
    } finally {
      setParsing(false);
    }
  };

  const showImportSummary = (summary: BulkImportBookingsResponse) => {
    const parts = [
      t("adminBookingsImportSummaryImported").replace("{count}", String(summary.imported)),
      t("adminBookingsImportSummaryNewStudents").replace("{count}", String(summary.newStudentsCreated)),
    ];
    if (summary.skippedDuplicates > 0) {
      parts.push(
        t("adminBookingsImportSummaryDuplicates").replace("{count}", String(summary.skippedDuplicates)),
      );
    }
    if (summary.unmappableInstructors.length > 0) {
      parts.push(
        t("adminBookingsImportSummaryUnmappedInstructors").replace(
          "{names}",
          summary.unmappableInstructors.join(", "),
        ),
      );
    }
    if (summary.errors.length > 0) {
      parts.push(t("adminBookingsImportSummaryErrors").replace("{count}", String(summary.errors.length)));
    }
    showToast(parts.join(" · "), summary.errors.length > 0 ? "error" : "success");
  };

  const handleConfirmImport = async () => {
    if (!branchId) {
      showToast(t("adminBookingsImportBranchRequired"), "error");
      return;
    }
    const selected = selectedBookings;
    if (selected.length === 0) {
      showToast(t("adminBookingsImportNothingSelected"), "error");
      return;
    }
    if (selected.some((b) => !b.studentName.trim())) {
      showToast(t("adminBookingsImportStudentNameRequired"), "error");
      return;
    }
    if (selected.some((b) => !b.instructorName.trim())) {
      showToast(t("adminBookingsImportInstructorRequired"), "error");
      return;
    }
    for (const booking of selected) {
      const total = rowTotalPriceAmd(booking, instructors);
      const payErr = validateAdminBookingPayment(
        {
          status: booking.paymentStatus,
          paidStr: booking.paidStr,
          method: "cash",
          datetimeLocal: "",
          paymentNotes: "",
          paymentReminderDate: "",
        },
        total,
      );
      if (payErr) {
        showToast(t(payErr), "error");
        return;
      }
    }

    setImporting(true);
    try {
      const summary = await bulkImportBookings({
        branchId: Number(branchId),
        bookings: toBulkImportPayload(selected, instructors),
      });
      showImportSummary(summary);
      onImported?.();
      onOpenChange(false);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("adminBookingsImportModalTitle")}
        description={t("adminBookingsImportModalDescription")}
        contentClassName="w-full max-w-[min(100vw-2rem,90rem)] sm:max-w-[min(100vw-2rem,90rem)] h-[min(96vh,980px)]"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <p className="text-sm text-muted-foreground">
              {bookings.length > 0
                ? t("adminBookingsImportSelectedCount")
                    .replace("{selected}", String(selectedCount))
                    .replace("{total}", String(bookings.length))
                : t("adminBookingsImportPickFileHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={importing || selectedCount === 0 || !branchId}
                onClick={handleConfirmImport}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("adminBookingsImportConfirming")}
                  </>
                ) : (
                  t("adminBookingsImportConfirm")
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {t("adminBookingsImportBranchLabel")}
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={importing || branches.length === 0}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {branches.length === 0 ? (
                  <option value="">{t("adminBookingsImportBranchRequired")}</option>
                ) : (
                  branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={parsing || importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {fileLabel ? t("adminBookingsImportChooseAnother") : t("adminBookingsImportChooseFile")}
              </Button>
              {fileLabel ? (
                <span className="text-sm text-muted-foreground truncate max-w-[20rem]">{fileLabel}</span>
              ) : null}
            </div>
          </div>

          <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
            {t("adminBookingsImportPaymentNote")}
          </p>

          {missingPhoneCount > 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              {t("adminBookingsImportMissingPhoneWarning").replace("{count}", String(missingPhoneCount))}
            </div>
          ) : null}

          {parseIssues.length > 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100 space-y-1">
              {parseIssues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          ) : null}

          {bookings.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-end gap-2 min-w-0">
                  <div className="min-w-[min(100%,14rem)]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {t("adminBookingsImportMonthFilter")}
                    </label>
                    <select
                      value={monthFilter}
                      onChange={(e) => scrollToMonth(e.target.value)}
                      disabled={importing}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    >
                      <option value="">{t("adminBookingsImportAllMonths")}</option>
                      {availableMonths.map((month) => (
                        <option key={month.key} value={month.key}>
                          {month.label} ({month.count})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={importing || !monthFilter}
                    onClick={() => scrollToMonth(monthFilter)}
                  >
                    {t("adminBookingsImportGoToMonth")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pb-1">
                  {t("adminBookingsImportMonthJumpHint")}
                </p>
              </div>
              <div ref={tableScrollRef} className="overflow-auto max-h-[min(68vh,680px)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b border-border">
                    <tr>
                      <th className="w-10 px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label={t("adminBookingsImportSelectAll")}
                          className="h-4 w-4 rounded border-input"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-medium min-w-[8rem]">{t("date")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[5.5rem]">{t("bookingColTime")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[8rem]">{t("cohortColInstructor")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[10rem]">{t("bookingColStudent")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[9rem]">{t("adminStudentPickerPhoneLabel")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[6.5rem]">{t("adminBookingPaymentTotalPrice")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[6rem]">{t("adminBookingPaymentPaidAmount")}</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[7rem]">{t("adminBookingPaymentStatusLabel")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRows.map((row) => {
                      if (row.kind === "date") {
                        return (
                          <tr
                            key={`date-${row.dateIso}`}
                            id={row.isMonthStart ? `import-month-${row.monthKey}` : undefined}
                            data-import-month={row.isMonthStart ? row.monthKey : undefined}
                            className={cn(
                              "bg-primary/5 scroll-mt-12",
                              row.isMonthStart && row.monthKey === monthFilter && "ring-2 ring-inset ring-primary/30",
                            )}
                          >
                            <td colSpan={9} className="px-3 py-2 font-semibold text-primary">
                              {row.isMonthStart ? (
                                <span className="block text-[11px] font-medium uppercase tracking-wide text-primary/70 mb-0.5">
                                  {formatMonthLabel(row.monthKey, lang)}
                                </span>
                              ) : null}
                              {row.label}
                            </td>
                          </tr>
                        );
                      }
                      if (row.kind === "instructor") {
                        return (
                          <tr key={`inst-${row.dateIso}-${row.instructorName}`} className="bg-muted/40">
                            <td colSpan={9} className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {row.instructorName}
                            </td>
                          </tr>
                        );
                      }

                      const booking = row.booking;
                      const checked = selectedIds.has(booking.id);
                      const phoneMissing = !booking.studentPhone.trim();
                      return (
                        <tr
                          key={booking.id}
                          className={cn("border-t border-border/60", !checked && "opacity-60")}
                        >
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(booking.id)}
                              aria-label={booking.studentName}
                              className="h-4 w-4 rounded border-input"
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              value={booking.date}
                              onChange={(e) => updateBooking(booking.id, { date: e.target.value })}
                              className="h-8 text-xs min-w-[7.5rem]"
                              disabled={importing}
                              aria-label={`${t("date")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              value={booking.timeSlot}
                              onChange={(e) => updateBooking(booking.id, { timeSlot: e.target.value })}
                              className="h-8 text-xs min-w-[5rem]"
                              disabled={importing}
                              aria-label={`${t("bookingColTime")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              value={booking.instructorName}
                              onChange={(e) => updateBooking(booking.id, { instructorName: e.target.value })}
                              className="h-8 text-xs min-w-[7rem]"
                              disabled={importing}
                              aria-label={`${t("cohortColInstructor")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              value={booking.studentName}
                              onChange={(e) => updateBooking(booking.id, { studentName: e.target.value })}
                              className="h-8 text-xs min-w-[9rem]"
                              disabled={importing}
                              title={booking.rawCellText !== booking.studentName ? booking.rawCellText : undefined}
                              aria-label={`${t("bookingColStudent")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              value={booking.studentPhone}
                              onChange={(e) => updateBooking(booking.id, { studentPhone: e.target.value })}
                              className={cn(
                                "h-8 text-xs min-w-[8rem]",
                                phoneMissing && "border-amber-500 focus-visible:ring-amber-500/40",
                              )}
                              disabled={importing}
                              placeholder={t("adminStudentPickerPhonePlaceholder")}
                              aria-invalid={phoneMissing}
                              aria-label={`${t("adminStudentPickerPhoneLabel")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              inputMode="decimal"
                              value={booking.totalPriceStr}
                              onChange={(e) => updateBooking(booking.id, { totalPriceStr: e.target.value })}
                              className="h-8 text-xs min-w-[5.5rem] tabular-nums"
                              disabled={importing}
                              aria-label={`${t("adminBookingPaymentTotalPrice")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              inputMode="decimal"
                              value={booking.paidStr}
                              onChange={(e) => updateBooking(booking.id, { paidStr: e.target.value })}
                              className="h-8 text-xs min-w-[5rem] tabular-nums"
                              disabled={importing}
                              placeholder="0"
                              aria-label={`${t("adminBookingPaymentPaidAmount")} ${booking.studentName}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <select
                              value={booking.paymentStatus}
                              onChange={(e) =>
                                updateBooking(booking.id, {
                                  paymentStatus: e.target.value as AdminBookingPaymentStatus,
                                })
                              }
                              disabled={importing}
                              className="h-8 w-full min-w-[6.5rem] rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                              aria-label={`${t("adminBookingPaymentStatusLabel")} ${booking.studentName}`}
                            >
                              <option value="paid">{t("adminBookingPaymentStatusPaid")}</option>
                              <option value="partial">{t("adminBookingPaymentStatusPartial")}</option>
                              <option value="unpaid">{t("adminBookingPaymentStatusUnpaid")}</option>
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                              {t(adminPaymentStatusLabelKey(booking.paymentStatus))}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {parsing ? t("adminBookingsImportParsing") : t("adminBookingsImportEmptyState")}
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}
