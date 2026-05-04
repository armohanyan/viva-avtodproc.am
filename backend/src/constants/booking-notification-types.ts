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
} as const satisfies Record<string, NotificationType>;

export type BookingNotificationPersistedTypeValue =
  (typeof BookingNotificationPersistedType)[keyof typeof BookingNotificationPersistedType];
