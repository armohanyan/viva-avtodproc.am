import { NOTIFICATION_TYPE, type NotificationType } from "src/constants/notification.constants";
import type { TranslationKey } from "src/lib/i18n";
import type { NotificationItem } from "src/types/notification.types";

const TITLE_KEY: Record<NotificationType, TranslationKey> = {
  [NOTIFICATION_TYPE.BOOKING_CREATED]: "notifTitleBookingCreated",
  [NOTIFICATION_TYPE.BOOKING_CONFIRMED]: "notifTitleBookingConfirmed",
  [NOTIFICATION_TYPE.BOOKING_UPDATED]: "notifTitleBookingUpdated",
  [NOTIFICATION_TYPE.BOOKING_CANCELLED]: "notifTitleBookingCancelled",
  [NOTIFICATION_TYPE.BOOKING_REFUNDED]: "notifTitleBookingRefunded",
  [NOTIFICATION_TYPE.BOOKING_REFUND_INVITATION]: "notifTitleBookingRefundInvitation",
  [NOTIFICATION_TYPE.BOOKING_REQUEST_CREATED]: "notifTitleBookingRequestCreated",
  [NOTIFICATION_TYPE.LESSON_UPCOMING]: "notifTitleLessonUpcoming",
  [NOTIFICATION_TYPE.CONTACT_REQUEST_CREATED]: "notifTitleContactRequestCreated",
  [NOTIFICATION_TYPE.CALL_REQUEST_CREATED]: "notifTitleCallRequestCreated",
  [NOTIFICATION_TYPE.PAYMENT_RECEIVED]: "notifTitlePaymentReceived",
  [NOTIFICATION_TYPE.SYSTEM_ALERT]: "notifTitleSystemAlert",
};

/** In-app notification title from API may be English; derive a locale-aware label from `type`. */
export function localizedNotificationTitle(
  n: Pick<NotificationItem, "type" | "title">,
  t: (key: TranslationKey) => string,
): string {
  const key = TITLE_KEY[n.type];
  return key ? t(key) : n.title;
}
