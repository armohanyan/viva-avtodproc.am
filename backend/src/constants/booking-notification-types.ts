import type { NotificationType } from '../models/notification.model';

/**
 * Persisted `notifications.type` values used by booking lifecycle rules.
 * Prefer these over raw strings at call sites.
 */
export const BookingNotificationPersistedType = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_REFUNDED: 'BOOKING_REFUNDED',
  BOOKING_REFUND_INVITATION: 'BOOKING_REFUND_INVITATION',
  BOOKING_PAYMENT_REMINDER: 'BOOKING_PAYMENT_REMINDER',
  BOOKING_AUTO_CANCELLED_PAYMENT: 'BOOKING_AUTO_CANCELLED_PAYMENT',
  BOOKING_GIFT_REQUEST_CREATED: 'BOOKING_GIFT_REQUEST_CREATED',
  BOOKING_GIFT_APPROVED: 'BOOKING_GIFT_APPROVED',
  BOOKING_GIFT_REJECTED: 'BOOKING_GIFT_REJECTED',
} as const satisfies Record<string, NotificationType>;

export type BookingNotificationPersistedTypeValue =
  (typeof BookingNotificationPersistedType)[keyof typeof BookingNotificationPersistedType];
