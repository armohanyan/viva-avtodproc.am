import { vivaApiJson } from "src/lib/vivaApi";
import type { NotificationItem, NotificationListResponse } from "./notifications.types";

export function fetchNotifications(params?: { page?: number; pageSize?: number; isRead?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (typeof params?.isRead === "boolean") qs.set("isRead", String(params.isRead));
  const suffix = qs.size > 0 ? `/notifications?${qs.toString()}` : "/notifications";
  return vivaApiJson<NotificationListResponse>(suffix);
}

export function fetchUnreadCount() {
  return vivaApiJson<{ unread: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: number) {
  return vivaApiJson<NotificationItem>(`/notifications/${encodeURIComponent(String(id))}/read`, {
    method: "PATCH",
    body: { isRead: true },
  });
}

export function markAllNotificationsRead() {
  return vivaApiJson<{ updated: number }>("/notifications/read-all", { method: "PATCH", body: {} });
}

export function deleteNotification(id: number) {
  return vivaApiJson<{ ok: true }>(`/notifications/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}
