import type { CanonicalBookingStatus } from "src/types/booking.types";

/**
 * Bulk practical gift (mirrors server rule): within a single booking, every 11th
 * practical lesson is free — book 10 paid → +1 gift, book 20 paid → +2.
 * Billable = count − floor(count / 11), so 11 slots are charged as 10.
 */
export function billablePracticalLessonCount(slotCount: number): number {
  if (!Number.isFinite(slotCount) || slotCount <= 0) return 0;
  return slotCount - Math.floor(slotCount / 11);
}

export function toCanonicalBookingStatus(raw: string): CanonicalBookingStatus {
  if (raw === "confirmed" || raw === "pending" || raw === "cancelled" || raw === "refunded") return raw;
  if (raw === "pending_payment") return "pending_payment";
  if (raw === "completed") return "confirmed";
  if (raw === "pending_prebook") return "pending";
  return "pending";
}
