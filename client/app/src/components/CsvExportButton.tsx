import { Download } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { buildCsv, downloadCsvFile } from "src/lib/csv";
import { cn } from "src/lib/utils";

interface Props {
  filename: string;
  headers: string[];
  /** Eager rows; omit when using `getRowsForExport`. */
  rows?: string[][];
  /** Build CSV rows only when the user clicks export (avoids heavy work on every render). */
  getRowsForExport?: () => string[][];
  /** Required with `getRowsForExport` so the button can disable when there is nothing to export. */
  exportRowCount?: number;
  disabled?: boolean;
  className?: string;
}

export default function CsvExportButton({
  filename,
  headers,
  rows,
  getRowsForExport,
  exportRowCount,
  disabled,
  className,
}: Props) {
  const { t } = useLang();
  const lazy = typeof getRowsForExport === "function";
  const empty = lazy ? (exportRowCount ?? 0) === 0 : (rows?.length ?? 0) === 0;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 min-w-0 w-full shrink-0 gap-1.5 sm:w-auto", className)}
      disabled={disabled || empty}
      aria-label={t("csvExportAriaLabel")}
      onClick={() => {
        const data = lazy ? getRowsForExport!() : rows!;
        downloadCsvFile(filename, buildCsv(headers, data));
      }}
    >
      <Download className="w-3.5 h-3.5" />
      {t("exportCsv")}
    </Button>
  );
}
