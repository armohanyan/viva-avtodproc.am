export const PETROL_TYPE_BENZIN = "benzin" as const;
export const PETROL_TYPE_LPG = "lpg" as const;

export type PetrolTypeValue = typeof PETROL_TYPE_BENZIN | typeof PETROL_TYPE_LPG;

export const PETROL_TYPE_OPTIONS: readonly { value: PetrolTypeValue; label: string }[] = [
  { value: PETROL_TYPE_BENZIN, label: "Բենզին" },
  { value: PETROL_TYPE_LPG, label: "Գազ (Հեղուկ Գազ)" },
];

export function petrolTypeLabel(value: string): string {
  return PETROL_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
