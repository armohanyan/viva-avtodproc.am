import { Download } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { buildCsv, downloadCsvFile } from "src/lib/csv";
import { cn } from "src/lib/utils";

interface Props {
  filename: string;
  headers: string[];
  rows: string[][];
  disabled?: boolean;
  className?: string;
}

export default function CsvExportButton({ filename, headers, rows, disabled, className }: Props) {
  const { t } = useLang();
  const empty = rows.length === 0;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 min-w-0 w-full shrink-0 gap-1.5 sm:w-auto", className)}
      disabled={disabled || empty}
      aria-label={t("csvExportAriaLabel")}
      onClick={() => downloadCsvFile(filename, buildCsv(headers, rows))}
    >
      <Download className="w-3.5 h-3.5" />
      {t("exportCsv")}
    </Button>
  );
}
