import { Plus, Trash2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { useLang } from "src/lib/i18n";
import { normalizeTimeHHMM } from "./booking-slot.util";
import type { PracticalSlotPlanRow } from "./practical-slot-plan";

type Props = {
  rows: PracticalSlotPlanRow[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (rows: PracticalSlotPlanRow[]) => void;
  onReload?: () => void;
  showReload?: boolean;
};

export default function PracticalSlotPlanEditor({
  rows,
  loading = false,
  disabled = false,
  onChange,
  onReload,
  showReload = true,
}: Props) {
  const { t } = useLang();

  const updateRow = (index: number, time: string, finalize = false) => {
    const next = [...rows];
    const trimmed = time.trim();
    if (trimmed === "") {
      next[index] = { time: null };
    } else if (finalize) {
      const n = normalizeTimeHHMM(trimmed);
      next[index] = { time: n ?? trimmed };
    } else {
      next[index] = { time: trimmed };
    }
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, { time: null }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Label className="w-8 shrink-0 text-xs text-muted-foreground tabular-nums">{index + 1}.</Label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="flex-1 tabular-nums font-mono"
            value={row.time ?? ""}
            onChange={(e) => updateRow(index, e.target.value, false)}
            onBlur={(e) => updateRow(index, e.target.value, true)}
            placeholder={t("adminSettingsSlotTimePlaceholder")}
            disabled={disabled}
            aria-label={`${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={disabled || rows.length <= 1}
            onClick={() => removeRow(index)}
            aria-label={t("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          {t("adminSettingsSlotPlanAddRow")}
        </Button>
        {showReload && onReload ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void onReload()} disabled={disabled}>
            {t("adminSettingsSlotPlanReset")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
