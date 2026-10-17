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
    if (!row.branchId || !DATE_RE.test(row.startsOn)) return "instructorTemporaryTransferInvalid";
    if (row.temporary && (!DATE_RE.test(row.endsOn ?? "") || (row.endsOn ?? "") < row.startsOn)) {
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
        <div key={row.id} className="space-y-2 rounded-md border border-border/70 p-2">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={row.temporary}
              onChange={(e) =>
                updateRow(row.id, e.target.checked ? { temporary: true, endsOn: row.endsOn ?? "" } : { temporary: false, endsOn: null })
              }
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("instructorTemporaryTransferTemporary")}
          </label>
          <div
            className={
              row.temporary
                ? "grid grid-cols-1 gap-2 items-end md:grid-cols-[minmax(0,1.5fr)_11rem_11rem_auto]"
                : "grid grid-cols-1 gap-2 items-end md:grid-cols-[minmax(0,1.5fr)_11rem_auto]"
            }
          >
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
            <label className="block min-w-0">
              <span className="block text-xs font-medium text-muted-foreground mb-1">
                {t("instructorTemporaryTransferStart")}
              </span>
              <input
                type="date"
                value={row.startsOn}
                onChange={(e) => updateRow(row.id, { startsOn: e.target.value })}
                className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            {row.temporary ? (
              <label className="block min-w-0">
                <span className="block text-xs font-medium text-muted-foreground mb-1">
                  {t("instructorTemporaryTransferEnd")}
                </span>
                <input
                  type="date"
                  value={row.endsOn ?? ""}
                  onChange={(e) => updateRow(row.id, { endsOn: e.target.value })}
                  className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
            >
              {t("instructorTemporaryTransferRemove")}
            </Button>
          </div>
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
              temporary: true,
            },
          ])
        }
      >
        {t("instructorTemporaryTransferAdd")}
      </Button>
    </div>
  );
}
