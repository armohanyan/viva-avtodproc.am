import type { CanonicalBookingStatus } from "src/types/booking.types";

export const BOOKING_STATUS_BADGE_CLASS: Record<CanonicalBookingStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  pending_payment: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
  refunded: "bg-slate-200 text-slate-700",
};
