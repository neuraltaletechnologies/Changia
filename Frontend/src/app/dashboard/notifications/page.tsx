"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bell, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { NotificationIcon } from "@/components/dashboard/layout/notification-icon";
import { useNotifications } from "@/hooks/use-notifications";

const NOTIF_TYPES = new Set(["donation", "campaign", "system", "user", "payout"]);
type NotifType = "donation" | "campaign" | "system" | "user" | "payout";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    items,
    loading,
    error,
    unreadCount,
    page,
    totalPages,
    load,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    load();
    // Re-fetch when the tab regains focus so the list never goes stale.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => load()}
            disabled={loading}
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              onClick={() => load()}
              className="mt-1 text-xs font-medium underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-16 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {error
                ? "Couldn't load your notifications."
                : "You're all caught up — no unread notifications."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Notification
                  </th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                    When
                  </th>
                  <th className="text-right px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((n) => {
                  const type = (NOTIF_TYPES.has(n.type) ? n.type : "system") as NotifType;
                  return (
                    <tr key={n.id} className="align-top hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <NotificationIcon type={type} />
                          <button
                            onClick={() => {
                              markRead(n.id);
                              if (n.link) router.push(n.link);
                            }}
                            className="text-left min-w-0"
                          >
                            <p
                              className={`text-sm leading-snug font-medium text-foreground ${
                                n.link ? "hover:text-primary transition-colors" : ""
                              }`}
                            >
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground capitalize">
                        {type}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] text-muted-foreground/70 whitespace-nowrap">
                        {relativeTime(n.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-[11px] text-primary hover:underline whitespace-nowrap"
                        >
                          Mark read
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {page < totalPages && (
        <div className="text-center">
          <Button size="sm" variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
