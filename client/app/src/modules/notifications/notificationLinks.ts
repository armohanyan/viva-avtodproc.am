import type { NotificationItem } from "./notifications.types";

export type NotificationPanel = "admin" | "student" | "instructor";

export function notificationTargetHref(panel: NotificationPanel, n: NotificationItem): string {
  if (panel === "admin") {
    if (n.type === "BOOKING_GIFT_REQUEST_CREATED") return "/admin/inbox/gift-bookings";
    if (n.type === "PETROL_EXPENSE_REQUEST_CREATED") return "/admin/finance/petrol-requests";
    if (n.entityType === "booking") return "/admin/bookings";
    if (n.entityType === "contact_request") return "/admin/inbox/contact-requests";
    if (n.entityType === "booked_call") return "/admin/inbox/booked-calls";
    if (n.entityType === "theory_personal_lesson_request") return "/admin/inbox/theory-personal";
    return "/admin/notifications";
  }
  if (panel === "instructor") {
    if (n.type === "PETROL_EXPENSE_REQUEST_APPROVED" || n.type === "PETROL_EXPENSE_REQUEST_REJECTED") {
      return "/instructor/fuel-expenses";
    }
    if (n.entityType === "booking") return "/instructor/class-schedule";
    return "/instructor/notifications";
  }
  if (n.entityType === "booking") return "/dashboard/bookings";
  return "/dashboard/notifications";
}
