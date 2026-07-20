import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { Label } from "src/components/ui/label";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage } from "src/lib/vivaApi";
import {
  importPracticalFlatXlsx,
  type PracticalFlatXlsxImportResult,
  type PracticalFlatXlsxSkippedRow,
} from "src/modules/admin/booking/adminBookings.api";

function formatSkippedLine(row: PracticalFlatXlsxSkippedRow): string {
  const excelRow = row.rowNumber != null ? `#${row.rowNumber}` : "#?";
  const when = [row.date, row.timeSlot].filter(Boolean).join(" ");
  const who = [row.instructorName, row.studentName].filter(Boolean).join(" | ");
  return `${excelRow} [${row.kind}] ${when}${who ? ` | ${who}` : ""}: ${row.reason}`;
}

function isoToDisplayDate(dateIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!m) return dateIso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function paymentStatusLabel(status?: string): string {
  if (status === "paid") return "վճարված";
  if (status === "partial") return "մասնական";
  if (status === "unpaid") return "չվճարված";
  return status ?? "";
}

function phoneCell(row: PracticalFlatXlsxSkippedRow): string {
  const a = (row.studentPhone ?? "").trim();
  const b = (row.studentPhone2 ?? "").trim();
  if (a && b) return `${a}/${b}`;
  return a || b || "";
}

/** Non-duplicate failures only — ready to fix phones and re-import. */
function downloadFailedRowsExcel(rows: PracticalFlatXlsxSkippedRow[], filename: string): void {
  const exportRows = rows.filter((r) => r.kind !== "duplicate");
  const aoa: (string | number)[][] = [
    ["Ամսաթիվ", "Ժամ", "Հրահանգիչ", "Ուսանող", "Հեռախոս", "Статус", "Сумма", "Մասնաճյուղ", "ExcelRow", "Reason"],
  ];
  for (const row of exportRows) {
    aoa.push([
      /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? isoToDisplayDate(row.date) : row.date,
      row.timeSlot,
      row.instructorName,
      row.studentName,
      phoneCell(row),
      paymentStatusLabel(row.adminPaymentStatus),
      row.totalPriceAmd ?? "",
      row.branchName ?? "",
      row.rowNumber ?? "",
      row.reason,
    ]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "NotImported");
  XLSX.writeFile(book, filename);
}

export default function AdminImportPracticalXlsx() {
  const { t } = useLang();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PracticalFlatXlsxImportResult | null>(null);

  const skippedRows = result?.skippedRows ?? [];
  const failedForExport = useMemo(
    () => skippedRows.filter((r) => r.kind !== "duplicate"),
    [skippedRows],
  );

  const onRun = async () => {
    if (!file) {
      showToast(t("adminImportPracticalXlsxPickFile"), "error");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await importPracticalFlatXlsx({ file, dryRun });
      setResult(data);
      const skipped = data.skippedRows?.length ?? 0;
      showToast(
        dryRun ? t("adminImportPracticalXlsxDryRunDone") : t("adminImportPracticalXlsxImportDone"),
        skipped > 0 || data.errors.length > 0 || data.skippedUnresolved > 0 ? "error" : "success",
      );
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const onDownloadFailed = () => {
    if (failedForExport.length === 0) {
      showToast(t("adminImportPracticalXlsxDownloadEmpty"), "error");
      return;
    }
    downloadFailedRowsExcel(failedForExport, "practical-not-imported.xlsx");
    showToast(t("adminImportPracticalXlsxDownloadDone"), "success");
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={FileSpreadsheet}
        title={t("adminImportPracticalXlsxTitle")}
        subtitle={t("adminImportPracticalXlsxSubtitle")}
      />

      <div className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="practical-xlsx-file" className="text-sm font-medium">
            {t("adminImportPracticalXlsxFileLabel")}
          </Label>
          <input
            ref={fileRef}
            id="practical-xlsx-file"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="mt-1.5 block w-full text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
          {file ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          {t("adminImportPracticalXlsxDryRun")}
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onRun()} disabled={busy || !file}>
            {busy
              ? t("adminImportPracticalXlsxRunning")
              : dryRun
                ? t("adminImportPracticalXlsxRunDry")
                : t("adminImportPracticalXlsxRunImport")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setFile(null);
              setResult(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            {t("adminImportPracticalXlsxClear")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || failedForExport.length === 0}
            onClick={onDownloadFailed}
          >
            {t("adminImportPracticalXlsxDownloadFailed")} ({failedForExport.length})
          </Button>
        </div>
      </div>

      {result ? (
        <div className="mt-6 max-w-4xl space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">{t("adminImportPracticalXlsxResultTitle")}</p>
          <ul className="grid gap-1 text-muted-foreground sm:grid-cols-2">
            <li>
              {t("adminImportPracticalXlsxParsed")}: {result.parsedRows}
            </li>
            <li>
              {t("adminImportPracticalXlsxImportable")}: {result.importableRows}
            </li>
            <li className={result.dryRun ? "text-foreground" : undefined}>
              {result.dryRun
                ? t("adminImportPracticalXlsxWouldImport")
                : t("adminImportPracticalXlsxImported")}
              : {result.imported}
            </li>
            <li className={result.skippedDuplicates > 0 ? "font-medium text-amber-700 dark:text-amber-400" : undefined}>
              {result.dryRun
                ? t("adminImportPracticalXlsxWouldDuplicates")
                : t("adminImportPracticalXlsxDuplicates")}
              : {result.skippedDuplicates}
            </li>
            <li>
              {t("adminImportPracticalXlsxNewStudents")}: {result.newStudentsCreated}
            </li>
            <li>
              {t("adminImportPracticalXlsxUnresolved")}: {result.skippedUnresolved}
            </li>
            <li className={skippedRows.length > 0 ? "font-medium text-destructive" : undefined}>
              {t("adminImportPracticalXlsxNotImported")}: {skippedRows.length}
            </li>
            <li>
              {t("adminImportPracticalXlsxErrors")}: {result.errors.length}
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">{t("adminImportPracticalXlsxDupHint")}</p>
          <p className="text-xs text-muted-foreground">{t("adminImportPracticalXlsxAmbiguousHint")}</p>

          {result.instructorMappings.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">{t("adminImportPracticalXlsxMappings")}</p>
              <pre className="max-h-40 overflow-auto rounded-lg bg-muted/50 p-2 text-xs">
                {result.instructorMappings
                  .map((m) =>
                    m.branchId != null
                      ? `${m.excelName} → ${m.canonicalName} @ ${m.branchName} (#${m.branchId})`
                      : `${m.excelName} → ${m.canonicalName} @ UNRESOLVED`,
                  )
                  .join("\n")}
              </pre>
            </div>
          ) : null}

          {skippedRows.length > 0 ? (
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{t("adminImportPracticalXlsxSkippedTitle")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={failedForExport.length === 0}
                  onClick={onDownloadFailed}
                >
                  {t("adminImportPracticalXlsxDownloadFailed")} ({failedForExport.length})
                </Button>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{t("adminImportPracticalXlsxSkippedHint")}</p>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted/50 p-2 text-xs whitespace-pre-wrap">
                {skippedRows.map(formatSkippedLine).join("\n")}
              </pre>
            </div>
          ) : null}

          {result.resolveWarnings.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">{t("adminImportPracticalXlsxIssues")}</p>
              <pre className="max-h-40 overflow-auto rounded-lg bg-muted/50 p-2 text-xs whitespace-pre-wrap">
                {result.resolveWarnings.map((s) => `warn: ${s}`).join("\n")}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminLayout>
  );
}
