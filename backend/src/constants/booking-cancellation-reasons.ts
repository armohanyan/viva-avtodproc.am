/** Structured `bookings.cancellation_reason` for student / system closes. */
export const BOOKING_CANCELLATION_REASON = {
  PAYMENT_NOT_COMPLETED_BEFORE_REQUIRED_DATE: 'PAYMENT_NOT_COMPLETED_BEFORE_REQUIRED_DATE',
  GIFT_REJECTED: 'GIFT_REJECTED',
} as const;

export type BookingCancellationReason = (typeof BOOKING_CANCELLATION_REASON)[keyof typeof BOOKING_CANCELLATION_REASON];
