import type { TranslationKey } from "src/lib/i18n";
import type { TheoryCohortOption } from "./types";

type Props = {
  label: string;
  hint?: string;
  placeholderKey: TranslationKey;
  cohorts: readonly TheoryCohortOption[];
  valueId: string;
  onChangeId: (id: string) => void;
  formatOptionSuffix: (c: TheoryCohortOption) => string;
  disabled?: boolean;
  t: (k: TranslationKey) => string;
};

export default function GroupLessonSelector({
  label,
  hint,
  placeholderKey,
  cohorts,
  valueId,
  onChangeId,
  formatOptionSuffix,
  disabled,
  t,
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={valueId}
        disabled={disabled}
        onChange={(e) => onChangeId(e.target.value)}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">{t(placeholderKey)}</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.instructorName}
            {formatOptionSuffix(c)}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
}
