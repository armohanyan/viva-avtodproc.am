import { useLang, type TranslationKey } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import type { BranchHopWarning } from "src/modules/admin/driving/instructorBranchHop";

function hopLine(t: (key: TranslationKey) => string, hop: BranchHopWarning): string {
  const lines: string[] = [];
  if (hop.previous) {
    lines.push(
      t("adminDrivingBranchHopPrev")
        .replace("{branch}", hop.previous.branchName)
        .replace("{time}", hop.previous.time),
    );
  }
  if (hop.next) {
    lines.push(
      t("adminDrivingBranchHopNext")
        .replace("{branch}", hop.next.branchName)
        .replace("{time}", hop.next.time),
    );
  }
  lines.push(t("adminDrivingBranchHopTravel"));
  if (hop.tight) lines.push(t("adminDrivingBranchHopTight"));
  return lines.join(" ");
}

export function BranchHopBanner({ hop }: { hop: BranchHopWarning }) {
  const { t } = useLang();
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm leading-snug",
        hop.tight
          ? "border-amber-500/60 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
          : "border-amber-400/50 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50",
      )}
      role="status"
    >
      <p className="font-semibold">{t("adminDrivingBranchHopTitle")}</p>
      <p className="mt-1 opacity-90">{hopLine(t, hop)}</p>
    </div>
  );
}
