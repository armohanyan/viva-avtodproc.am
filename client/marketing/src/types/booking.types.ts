/** Canonical booking statuses; coerce legacy API/DB values for labels and filters. */
export type CanonicalBookingStatus = "confirmed" | "pending" | "pending_payment" | "cancelled" | "refunded";
