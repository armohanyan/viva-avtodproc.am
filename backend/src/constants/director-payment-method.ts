export const DIRECTOR_PAYMENT_METHODS = ['card', 'cash'] as const;
export type DirectorPaymentMethod = (typeof DIRECTOR_PAYMENT_METHODS)[number];
