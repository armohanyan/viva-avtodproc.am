import type { CanonicalBookingStatus } from "src/types/booking.types";

/**
 * Student-facing booking and package purchase in the app. Set to `true` when card payment is live.
 * While `false`, booking CTAs are hidden and the API rejects student self-service booking requests.
 */
export const STUDENT_SELF_SERVICE_BOOKING_ENABLED = true;

export const BOOKING_STATUS_BADGE_CLASS: Record<CanonicalBookingStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
  refunded: "bg-slate-200 text-slate-700",
};
