import { useRef, useState } from "react";
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
} from "src/modules/admin/booking/adminBookings.api";

export default function AdminImportPracticalXlsx() {
  const { t } = useLang();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PracticalFlatXlsxImportResult | null>(null);

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
      showToast(
        dryRun ? t("adminImportPracticalXlsxDryRunDone") : t("adminImportPracticalXlsxImportDone"),
        data.errors.length > 0 || data.skippedUnresolved > 0 ? "error" : "success",
      );
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
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

        <div className="flex gap-2">
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
        </div>
      </div>

      {result ? (
        <div className="mt-6 max-w-3xl space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
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
            <li>
              {t("adminImportPracticalXlsxErrors")}: {result.errors.length}
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">{t("adminImportPracticalXlsxDupHint")}</p>

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

          {result.parseIssues.length > 0 ||
          result.resolveWarnings.length > 0 ||
          result.resolveErrors.length > 0 ||
          result.errors.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">{t("adminImportPracticalXlsxIssues")}</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-2 text-xs whitespace-pre-wrap">
                {[
                  ...result.parseIssues.map((s) => `parse: ${s}`),
                  ...result.resolveWarnings.map((s) => `warn: ${s}`),
                  ...result.resolveErrors.map((s) => `resolve: ${s}`),
                  ...result.errors
                    .slice(0, 50)
                    .map(
                      (e) =>
                        `row: ${e.date} ${e.timeSlot} | ${e.instructorName} | ${e.studentName}: ${e.reason}`,
                    ),
                  result.errors.length > 50 ? `… +${result.errors.length - 50} more errors` : "",
                ]
                  .filter(Boolean)
                  .join("\n")}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminLayout>
  );
}
