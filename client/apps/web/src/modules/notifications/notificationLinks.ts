import type { NotificationItem } from "./notifications.types";

export type NotificationPanel = "admin" | "student" | "instructor";

export function notificationTargetHref(panel: NotificationPanel, n: NotificationItem): string {
  if (panel === "admin") {
    if (n.entityType === "booking") return "/admin/bookings";
    if (n.entityType === "contact_request") return "/admin/contact-requests";
    if (n.entityType === "booked_call") return "/admin/booked-calls";
    return "/admin/notifications";
  }
  if (panel === "instructor") {
    if (n.entityType === "booking") return "/instructor/my-lessons";
    return "/instructor/notifications";
  }
  if (n.entityType === "booking") return "/dashboard/bookings";
  return "/dashboard/notifications";
}
