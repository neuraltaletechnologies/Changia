"use client";

import { useCallback, useEffect, useState } from "react";
import { notificationApi, type NotificationRecord } from "@/lib/dashboard/api";
import { isAuthenticated } from "@/lib/api-client";

/**
 * In-app notification centre state for the header bell + /dashboard/notifications.
 * Polls the unread count every 60s (like use-pending-reminders) and fetches the
 * list on demand. Silently degrades to empty on any error (e.g. logged out).
 *
 * The list only ever shows *unread* notifications — marking one read (or opening
 * it, or "mark all read") drops it from the list so read items never linger.
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const refreshCount = useCallback(() => {
    if (!isAuthenticated()) return;
    notificationApi
      .unreadCount()
      .then((d) => setUnreadCount(d.unreadCount))
      .catch(() => undefined);
  }, []);

  const load = useCallback(
    async (opts?: { page?: number; append?: boolean }) => {
      if (!isAuthenticated()) return;
      const nextPage = opts?.page ?? 1;
      setLoading(true);
      setError(null);
      try {
        const d = await notificationApi.list({
          page: nextPage,
          limit: 20,
          unreadOnly: true,
        });
        setUnreadCount(d.unreadCount);
        setPage(nextPage);
        const pag = d.pagination as { totalPages?: number } | undefined;
        setTotalPages(pag?.totalPages ?? 1);
        setItems((prev) =>
          opts?.append ? [...prev, ...d.notifications] : d.notifications
        );
      } catch (e) {
        if (!opts?.append) setItems([]);
        setError(
          e instanceof Error ? e.message : "Couldn't load notifications."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const markRead = useCallback(async (id: number) => {
    // Read notifications drop straight out of the list.
    setItems((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const d = await notificationApi.markRead(id);
      setUnreadCount(d.unreadCount);
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    setItems([]);
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return {
    unreadCount,
    items,
    loading,
    error,
    page,
    totalPages,
    load,
    loadMore: () => load({ page: page + 1, append: true }),
    markRead,
    markAllRead,
    refreshCount,
  };
}
