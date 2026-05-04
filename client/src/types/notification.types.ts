import type { AccountType } from "./auth.types";
import type { NotificationType } from "src/constants/notification.constants";
import type { PaginatedList } from "./pagination.types";

export type { NotificationType };

export type NotificationItem = {
  id: number;
  recipientUserId: number;
  recipientRole: AccountType;
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

export type NotificationListResponse = PaginatedList<NotificationItem>;
