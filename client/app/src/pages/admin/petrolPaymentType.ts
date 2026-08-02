export const PETROL_PAYMENT_CARD = "card" as const;
export const PETROL_PAYMENT_CASH = "cash" as const;

export const PETROL_PAYMENT_TYPES = [PETROL_PAYMENT_CARD, PETROL_PAYMENT_CASH] as const;

export type PetrolPaymentTypeValue = (typeof PETROL_PAYMENT_TYPES)[number];

export const PETROL_PAYMENT_OPTIONS: ReadonlyArray<{
  value: PetrolPaymentTypeValue;
  label: string;
}> = [
  { value: PETROL_PAYMENT_CARD, label: "Քարտ" },
  { value: PETROL_PAYMENT_CASH, label: "Կանխիկ" },
];

export function petrolPaymentTypeLabel(value: PetrolPaymentTypeValue): string {
  return PETROL_PAYMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
