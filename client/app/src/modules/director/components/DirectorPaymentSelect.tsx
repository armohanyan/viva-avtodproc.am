import { DIRECTOR_PAYMENT_LABELS } from "src/modules/director/director.consts";
import type { DirectorPaymentMethod } from "src/modules/director/director.types";
import { DirectorSelect } from "./DirectorUi";

type Props = {
  value: DirectorPaymentMethod;
  onChange: (value: DirectorPaymentMethod) => void;
};

export default function DirectorPaymentSelect({ value, onChange }: Props) {
  return (
    <DirectorSelect value={value} onChange={(e) => onChange(e.target.value as DirectorPaymentMethod)}>
      {(Object.entries(DIRECTOR_PAYMENT_LABELS) as [DirectorPaymentMethod, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </DirectorSelect>
  );
}
