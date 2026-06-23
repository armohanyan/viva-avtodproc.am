import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { cn } from "src/lib/utils";
import type { Instructor } from "src/data/instructors";
import type { FleetCar } from "src/modules/cars";
import { bulkImportPetrolExpenses } from "src/modules/admin/petrol/adminPetrol.api";
import {
  parseFuelKmExpenseWorkbook,
  toFuelKmExpenseBulkPayload,
  type ParsedFuelKmExpenseRow,
} from "src/modules/admin/petrol-fuel-km/excelPetrolFuelKmExpenseImport";

export type ExcelFuelKmExpenseImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cars: readonly FleetCar[];
  instructors: readonly Instructor[];
  onImported?: () => void;
};

export default function ExcelFuelKmExpenseImportModal({
  open,
  onOpenChange,
  cars,
  instructors,
  onImported,
}: ExcelFuelKmExpenseImportModalProps) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedFuelKmExpenseRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parseIssues, setParseIssues] = useState<string[]>([]);
  const [fileLabel, setFileLabel] = useState("");

  const resetState = useCallback(() => {
    setRows([]);
    setSelectedIds(new Set());
    setParseIssues([]);
    setFileLabel("");
    setParsing(false);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const validRows = useMemo(() => rows.filter((r) => r.valid && !r.isExample), [rows]);
  const importableRows = useMemo(() => rows.filter((r) => !r.isExample), [rows]);
  const selectedValidRows = useMemo(
    () => validRows.filter((r) => selectedIds.has(r.id)),
    [validRows, selectedIds],
  );
  const selectedCount = selectedValidRows.length;

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.filter((r) => r.valid).map((r) => r.id)));
  }, [rows]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setFileLabel(file.name);
    try {
      const result = await parseFuelKmExpenseWorkbook(file, cars, instructors);
      setRows(result.rows);
      setParseIssues(result.issues);
      if (result.rows.length > 0) {
        showToast(
          t("adminPetrolImportParsedToast").replace("{count}", String(result.rows.length)),
          "success",
        );
      } else {
        showToast(t("adminPetrolImportNoRows"), "error");
      }
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
      resetState();
    } finally {
      setParsing(false);
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllValid = () => {
    if (selectedCount === validRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validRows.map((r) => r.id)));
    }
  };

  const handleConfirmImport = async () => {
    if (selectedCount === 0) {
      showToast(t("adminPetrolImportNothingSelected"), "error");
      return;
    }
    const payloads = selectedValidRows
      .map(toFuelKmExpenseBulkPayload)
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (payloads.length === 0) return;

    setImporting(true);
    try {
      const summary = await bulkImportPetrolExpenses(payloads);
      const parts = [t("adminPetrolImportSummaryImported").replace("{count}", String(summary.imported))];
      if (summary.errors.length > 0) {
        parts.push(t("adminPetrolImportSummaryErrors").replace("{count}", String(summary.errors.length)));
      }
      showToast(parts.join(" · "), summary.errors.length > 0 ? "error" : "success");
      onOpenChange(false);
      onImported?.();
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
        title={t("adminPetrolFuelKmImportModalTitle")}
        description={t("adminPetrolImportModalDescription")}
        contentClassName="w-full max-w-[min(100vw-2rem,72rem)] sm:max-w-[min(100vw-2rem,72rem)] max-h-[min(92vh,860px)]"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <p className="text-sm text-muted-foreground">
              {rows.length > 0
                ? t("adminPetrolImportSelectedCount")
                    .replace("{selected}", String(selectedCount))
                    .replace("{total}", String(validRows.length))
                : t("adminPetrolImportPickFileHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                {t("cancel")}
              </Button>
              <Button type="button" disabled={importing || selectedCount === 0} onClick={handleConfirmImport}>
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("adminPetrolImportConfirming")}
                  </>
                ) : (
                  t("adminPetrolImportConfirm")
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={parsing || importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("adminPetrolImportParsing")}
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  {fileLabel ? t("adminPetrolImportChooseAnother") : t("adminPetrolImportChooseFile")}
                </>
              )}
            </Button>
            {fileLabel ? (
              <span className="text-sm text-muted-foreground truncate max-w-[20rem]">{fileLabel}</span>
            ) : null}
          </div>

          {parseIssues.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              {parseIssues.join(" ")}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("adminPetrolImportEmptyState")}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {t("adminPetrolImportValidCount")
                    .replace("{valid}", String(validRows.length))
                    .replace("{total}", String(importableRows.length))}
                </p>
                {validRows.length > 0 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={toggleAllValid}>
                    {selectedCount === validRows.length
                      ? t("adminPetrolImportClearSelection")
                      : t("adminPetrolImportSelectAll")}
                  </Button>
                ) : null}
              </div>

              <div className="overflow-auto rounded-md border max-h-[min(52vh,520px)]">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 w-10" />
                      <th className="px-3 py-2">{t("adminPetrolColDate")}</th>
                      <th className="px-3 py-2">{t("adminPetrolColCar")}</th>
                      <th className="px-3 py-2">{t("adminPetrolColInstructor")}</th>
                      <th className="px-3 py-2">{t("adminPetrolColType")}</th>
                      <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmColLiters")}</th>
                      <th className="px-3 py-2 text-right">{t("adminPetrolColPrice")}</th>
                      <th className="px-3 py-2">{t("adminPetrolFuelKmColPayment")}</th>
                      <th className="px-3 py-2">{t("adminPetrolImportStatusCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-b last:border-0",
                          row.isExample && "bg-muted/50",
                          !row.isExample && !row.valid && "bg-destructive/5",
                          row.valid && !row.isExample && selectedIds.has(row.id) && "bg-primary/5",
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            disabled={row.isExample || !row.valid || importing}
                            checked={!row.isExample && row.valid && selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            aria-label={`Row ${row.rowNumber}`}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.dateIso ? formatShortDateFromIso(row.dateIso, lang) : "—"}
                        </td>
                        <td className="px-3 py-2">{row.carPlate || "—"}</td>
                        <td className="px-3 py-2">{row.instructorName || "—"}</td>
                        <td className="px-3 py-2">{row.petrolTypeLabel}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.petrolCount || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.price || "—"}</td>
                        <td className="px-3 py-2">{row.paymentTypeLabel}</td>
                        <td className="px-3 py-2 text-xs">
                          {row.isExample ? (
                            <span className="text-muted-foreground">{t("adminPetrolImportExampleRow")}</span>
                          ) : row.valid ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {t("adminPetrolImportStatusOk")}
                            </span>
                          ) : (
                            <span className="text-destructive">{row.errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </AppModal>
    </>
  );
}
