export const PETROL_PAYMENT_TYPES = ['card', 'cash'] as const;

export type PetrolPaymentType = (typeof PETROL_PAYMENT_TYPES)[number];

export function petrolPaymentTypeLabelAm(type: string): string {
  switch (type) {
    case 'card':
    case 'pos': // legacy alias — treated as card
      return 'Քարտ';
    case 'cash':
      return 'Կանխիկ';
    default:
      return type;
  }
}

export function normalizePetrolPaymentType(value: string | null | undefined): PetrolPaymentType {
  if (value === 'cash') return 'cash';
  // 'pos' and anything else map to card
  return 'card';
}
