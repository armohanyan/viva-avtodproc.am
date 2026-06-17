import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

interface Props {
  /** Called when the user clicks export; should build and download the workbook. */
  onExport: () => Promise<void>;
  exportRowCount?: number;
  disabled?: boolean;
  className?: string;
}

export default function XlsxExportButton({ onExport, exportRowCount, disabled, className }: Props) {
  const { t } = useLang();
  const [exporting, setExporting] = useState(false);
  const empty = (exportRowCount ?? 0) === 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 min-w-0 w-full shrink-0 gap-1.5 sm:w-auto", className)}
      disabled={disabled || empty || exporting}
      aria-label={t("xlsxExportAriaLabel")}
      onClick={() => void handleExport()}
    >
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {t("exportXlsx")}
    </Button>
  );
}
