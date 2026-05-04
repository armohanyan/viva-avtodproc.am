import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.api";
import { DEFAULT_NOTIFICATION_PAGE_SIZE } from "src/constants/dashboard.constants";
import type { NotificationItem } from "./notifications.types";

export function useNotifications(pageSize = DEFAULT_NOTIFICATION_PAGE_SIZE) {
  const { showToast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      try {
        const [list, unreadResp] = await Promise.all([
          fetchNotifications({ page: nextPage, pageSize }),
          fetchUnreadCount(),
        ]);
        setItems(Array.isArray(list.items) ? list.items : []);
        setTotal(Number(list.total ?? 0));
        setPage(Number(list.page ?? nextPage));
        setUnread(Number(unreadResp.unread ?? 0));
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, showToast],
  );

  const markRead = useCallback(
    async (id: number) => {
      try {
        const updated = await markNotificationRead(id);
        setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
        setUnread((u) => Math.max(0, u - 1));
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      }
    },
    [showToast],
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() })));
      setUnread(0);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  const remove = useCallback(
    async (id: number) => {
      const target = items.find((n) => n.id === id);
      try {
        await deleteNotification(id);
        setItems((prev) => prev.filter((n) => n.id !== id));
        if (target && !target.isRead) setUnread((u) => Math.max(0, u - 1));
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      }
    },
    [items, showToast],
  );

  useEffect(() => {
    void refresh(1);
    const handle = setInterval(() => {
      void refresh(page);
    }, 45_000);
    return () => clearInterval(handle);
  }, [page, refresh]);

  return useMemo(
    () => ({
      items,
      page,
      total,
      unread,
      loading,
      refresh,
      setPage,
      markRead,
      markAllRead,
      remove,
    }),
    [items, loading, markAllRead, markRead, page, refresh, remove, total, unread],
  );
}
