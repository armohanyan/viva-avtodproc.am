export const PETROL_TYPES = ['benzin', 'lpg'] as const;
export type PetrolType = (typeof PETROL_TYPES)[number];

export const PETROL_TYPE_LABELS_AM: Record<PetrolType, string> = {
  benzin: 'Բենզին',
  lpg: 'Գազ (Հեղուկ Գազ)',
};

export function petrolTypeLabelAm(type: string): string {
  if (type === 'benzin' || type === 'lpg') return PETROL_TYPE_LABELS_AM[type];
  return type;
}

export function isPetrolType(value: string): value is PetrolType {
  return (PETROL_TYPES as readonly string[]).includes(value);
}
