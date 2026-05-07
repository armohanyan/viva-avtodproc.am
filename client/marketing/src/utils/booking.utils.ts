type CanonicalBookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "refunded"
  | "pending_payment";

export function toCanonicalBookingStatus(raw: string): CanonicalBookingStatus {
  if (raw === "confirmed" || raw === "pending" || raw === "cancelled" || raw === "refunded") return raw;
  if (raw === "pending_payment") return "pending_payment";
  if (raw === "completed") return "confirmed";
  if (raw === "pending_prebook") return "pending";
  return "pending";
}
