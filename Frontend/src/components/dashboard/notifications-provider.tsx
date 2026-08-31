"use client";

import { NotificationsContext, useNotificationsState } from "@/hooks/use-notifications";

/**
 * Owns the single dashboard-wide notification state (one poller, one list) and
 * shares it through context so the header bell, the sidebar / mobile-nav badge
 * and the /dashboard/notifications page never drift out of sync.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const value = useNotificationsState();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
