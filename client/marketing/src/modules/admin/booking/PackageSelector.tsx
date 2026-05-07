import type { TranslationKey } from "src/lib/i18n";
import type { AdminPackageOption } from "./types";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";

type Props = {
  label: string;
  packages: readonly AdminPackageOption[];
  valueId: string;
  onChangeId: (id: string) => void;
  loading: boolean;
  error: boolean;
  emptyHintKey: TranslationKey;
  t: (k: TranslationKey) => string;
};

export default function PackageSelector({
  label,
  packages,
  valueId,
  onChangeId,
  loading,
  error,
  emptyHintKey,
  t,
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={valueId}
        onChange={(e) => onChangeId(e.target.value)}
        disabled={loading || packages.length === 0}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">{loading ? t("loading") : t("adminBookingPackagePlaceholder")}</option>
        {packages.map((p) => {
          const amd = typeof p.priceAmd === "number" && p.priceAmd > 0 ? p.priceAmd : null;
          const priceBit = amd != null ? ` · ${formatAmd(amd)}` : p.price ? ` · ${p.price}` : "";
          return (
            <option key={p.id} value={p.id}>
              {p.name}
              {priceBit} · P{p.lessons} / T{p.theoryLessons}
            </option>
          );
        })}
      </select>
      {error ? <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{t("couldNotLoadData")}</p> : null}
      {!loading && packages.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-1">{t(emptyHintKey)}</p>
      ) : null}
    </div>
  );
}
