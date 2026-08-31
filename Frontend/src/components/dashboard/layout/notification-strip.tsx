"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/dashboard/utils";

const DISMISS_KEY = "changia_notif_strip_dismissed";

/**
 * Thin persistent strip shown on every dashboard page while the user has unread
 * notifications — the unread count plus the most recent notification's title,
 * linking through to the full notifications page. Dismiss hides it until a newer
 * notification arrives (tracked by id in sessionStorage).
 */
export function NotificationStrip() {
  const { unreadCount, items, load } = useNotifications();
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  // Pull the unread list once so we can surface the latest title. The provider
  // shares one copy, so this also warms the bell dropdown / notifications page.
  useEffect(() => {
    if (unreadCount > 0 && items.length === 0) void load();
  }, [unreadCount, items.length, load]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      setDismissedId(raw ? Number(raw) : null);
    } catch {
      /* private mode / disabled storage — just show the strip */
    }
  }, []);

  if (unreadCount === 0) return null;

  const latest = items[0] ?? null;
  const latestId = latest?.id ?? 0;
  if (dismissedId !== null && latestId <= dismissedId) return null;

  const dismiss = () => {
    setDismissedId(latestId);
    try {
      sessionStorage.setItem(DISMISS_KEY, String(latestId));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 md:px-6"
      )}
      role="status"
    >
      <Bell className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      <Link
        href="/dashboard/notifications"
        className="min-w-0 flex-1 truncate hover:underline"
      >
        <span className="font-semibold">
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
        </span>
        {latest && (
          <span className="text-amber-800">
            {" · "}
            {latest.title}
          </span>
        )}
      </Link>
      <Link
        href="/dashboard/notifications"
        className="shrink-0 font-medium text-amber-700 hover:underline"
      >
        View all
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 rounded p-1 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-900"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
