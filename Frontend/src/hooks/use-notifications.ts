"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { notificationApi, type NotificationRecord } from "@/lib/dashboard/api";
import { isAuthenticated } from "@/lib/api-client";

export interface NotificationsApi {
  unreadCount: number;
  items: NotificationRecord[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  load: (opts?: { page?: number; append?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshCount: () => void;
}

/**
 * Shared across the whole dashboard via {@link NotificationsContext} /
 * `NotificationsProvider` so the header bell, the sidebar / mobile-nav badge and
 * the /dashboard/notifications page all read the *same* state. Marking one (or
 * all) read anywhere immediately clears the badge everywhere — without the
 * provider each caller kept its own copy and a stale "1" lingered on the badge
 * long after the list was emptied.
 *
 * Polls the unread count every 60s; the list is fetched on demand and only ever
 * holds *unread* notifications. Silently degrades to empty on any error.
 */
export function useNotificationsState(): NotificationsApi {
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

export const NotificationsContext = createContext<NotificationsApi | null>(null);

const NOOP_NOTIFICATIONS: NotificationsApi = {
  unreadCount: 0,
  items: [],
  loading: false,
  error: null,
  page: 1,
  totalPages: 1,
  load: async () => undefined,
  loadMore: async () => undefined,
  markRead: async () => undefined,
  markAllRead: async () => undefined,
  refreshCount: () => undefined,
};

/**
 * Dashboard-wide notification state, read from {@link NotificationsContext}. A
 * single `NotificationsProvider` (in the dashboard layout) owns the one poller
 * and the one copy of the list, so every bell / badge / page stays in sync.
 * Outside the provider it degrades to an inert stub rather than crashing.
 */
export function useNotifications(): NotificationsApi {
  return useContext(NotificationsContext) ?? NOOP_NOTIFICATIONS;
}
