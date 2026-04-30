export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_UPDATED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REQUEST_CREATED"
  | "LESSON_UPCOMING"
  | "CONTACT_REQUEST_CREATED"
  | "CALL_REQUEST_CREATED"
  | "PAYMENT_RECEIVED"
  | "SYSTEM_ALERT";

export type NotificationItem = {
  id: number;
  recipientUserId: number;
  recipientRole: "super_admin" | "admin" | "instructor" | "student";
  type: NotificationType;
  title: string;
  message: string;
  entityType: "booking" | "theory_cohort" | "contact_request" | "booked_call" | "finance_transaction" | "system";
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
};
