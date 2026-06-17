import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { buildCsv, downloadCsvFile } from "src/lib/csv";
import { cn } from "src/lib/utils";

interface Props {
  filename: string;
  headers: string[];
  /** Eager rows; omit when using `getRowsForExport` / `getRowsForExportAsync`. */
  rows?: string[][];
  /** Build CSV rows only when the user clicks export (avoids heavy work on every render). */
  getRowsForExport?: () => string[][];
  /** Fetch all matching rows on export (e.g. paginated admin lists). */
  getRowsForExportAsync?: () => Promise<string[][]>;
  /** Required with lazy export so the button can disable when there is nothing to export. */
  exportRowCount?: number;
  disabled?: boolean;
  className?: string;
}

export default function CsvExportButton({
  filename,
  headers,
  rows,
  getRowsForExport,
  getRowsForExportAsync,
  exportRowCount,
  disabled,
  className,
}: Props) {
  const { t } = useLang();
  const [exporting, setExporting] = useState(false);
  const lazySync = typeof getRowsForExport === "function";
  const lazyAsync = typeof getRowsForExportAsync === "function";
  const lazy = lazySync || lazyAsync;
  const empty = lazy ? (exportRowCount ?? 0) === 0 : (rows?.length ?? 0) === 0;

  const handleExport = async () => {
    if (lazyAsync) {
      setExporting(true);
      try {
        const data = await getRowsForExportAsync!();
        downloadCsvFile(filename, buildCsv(headers, data));
      } finally {
        setExporting(false);
      }
      return;
    }
    const data = lazySync ? getRowsForExport!() : rows!;
    downloadCsvFile(filename, buildCsv(headers, data));
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 min-w-0 w-full shrink-0 gap-1.5 sm:w-auto", className)}
      disabled={disabled || empty || exporting}
      aria-label={t("csvExportAriaLabel")}
      onClick={() => void handleExport()}
    >
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {t("exportCsv")}
    </Button>
  );
}
