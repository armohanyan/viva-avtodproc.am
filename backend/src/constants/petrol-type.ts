export const PETROL_TYPES = ['benzin', 'lpg', 'gas'] as const;
export type PetrolType = (typeof PETROL_TYPES)[number];

export const PETROL_TYPE_LABELS_AM: Record<PetrolType, string> = {
  benzin: 'Բենզին',
  lpg: 'Գազ (Հեղուկ Գազ)',
  gas: 'Գազ (Մեթան)',
};

export function petrolTypeLabelAm(type: string): string {
  return isPetrolType(type) ? PETROL_TYPE_LABELS_AM[type] : type;
}

export function isPetrolType(value: string): value is PetrolType {
  return (PETROL_TYPES as readonly string[]).includes(value);
}
