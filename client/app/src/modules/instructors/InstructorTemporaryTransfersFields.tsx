import type { InstructorTemporaryTransfer } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import { branchOptionLabel } from "src/modules/branches";
import type { City } from "src/modules/cities";
import { cityNameById } from "src/modules/cities";
import { temporaryTransfersOverlap } from "src/modules/instructors/instructorTemporaryTransfer";
import type { TranslationKey } from "src/lib/i18n";
import { Button } from "src/components/ui/button";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function temporaryTransferValidationKey(
  rows: readonly InstructorTemporaryTransfer[],
): TranslationKey | null {
  for (const row of rows) {
    if (!row.branchId || !DATE_RE.test(row.startsOn) || !DATE_RE.test(row.endsOn) || row.endsOn < row.startsOn) {
      return "instructorTemporaryTransferInvalid";
    }
  }
  if (temporaryTransfersOverlap(rows)) return "instructorTemporaryTransferOverlap";
  return null;
}

type Props = {
  rows: readonly InstructorTemporaryTransfer[];
  branches: readonly Branch[];
  cities: readonly City[];
  onChange: (rows: InstructorTemporaryTransfer[]) => void;
  t: (key: TranslationKey) => string;
};

export default function InstructorTemporaryTransfersFields({ rows, branches, cities, onChange, t }: Props) {
  const updateRow = (id: string, patch: Partial<InstructorTemporaryTransfer>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{t("instructorTemporaryTransferTitle")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t("instructorTemporaryTransferHint")}</p>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
          <label className="block min-w-0">
            <span className="block text-xs font-medium text-muted-foreground mb-1">
              {t("instructorTemporaryTransferBranch")}
            </span>
            <select
              value={row.branchId}
              onChange={(e) => updateRow(row.id, { branchId: e.target.value })}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("instructorTemporaryTransferBranch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branchOptionLabel(branch, cityNameById(cities, branch.cityId))}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1">
              {t("instructorTemporaryTransferStart")}
            </span>
            <input
              type="date"
              value={row.startsOn}
              onChange={(e) => updateRow(row.id, { startsOn: e.target.value })}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1">
              {t("instructorTemporaryTransferEnd")}
            </span>
            <input
              type="date"
              value={row.endsOn}
              onChange={(e) => updateRow(row.id, { endsOn: e.target.value })}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
          >
            {t("instructorTemporaryTransferRemove")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-9"
        onClick={() =>
          onChange([
            ...rows,
            {
              id: `draft-${Date.now()}-${rows.length}`,
              branchId: "",
              startsOn: "",
              endsOn: "",
            },
          ])
        }
      >
        {t("instructorTemporaryTransferAdd")}
      </Button>
    </div>
  );
}
