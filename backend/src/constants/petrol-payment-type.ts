export const PETROL_PAYMENT_TYPES = ['card', 'cash', 'pos'] as const;

export type PetrolPaymentType = (typeof PETROL_PAYMENT_TYPES)[number];

export function petrolPaymentTypeLabelAm(type: PetrolPaymentType): string {
  switch (type) {
    case 'card':
      return 'Քարտ';
    case 'cash':
      return 'Կանխիկ';
    case 'pos':
      return 'POS';
    default:
      return type;
  }
}
