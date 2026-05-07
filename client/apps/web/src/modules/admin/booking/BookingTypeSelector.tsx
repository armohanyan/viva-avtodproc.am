import type { TranslationKey } from "src/lib/i18n";
import type { AdminBookingFlowKind } from "./types";

const OPTIONS: { value: AdminBookingFlowKind; labelKey: TranslationKey }[] = [
  { value: "practical", labelKey: "lessonTypePractical" },
  { value: "theory_group", labelKey: "adminBookingFlowTheoryGroup" },
  { value: "package", labelKey: "adminBookingFlowPackage" },
  { value: "theory_personal", labelKey: "lessonTypeTheoryPersonal" },
];

type Props = {
  value: AdminBookingFlowKind;
  onChange: (v: AdminBookingFlowKind) => void;
  label: string;
  t: (k: TranslationKey) => string;
};

export default function BookingTypeSelector({ value, onChange, label, t }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AdminBookingFlowKind)}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
