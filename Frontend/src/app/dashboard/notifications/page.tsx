"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { NotificationIcon } from "@/components/dashboard/layout/notification-icon";
import { useNotifications } from "@/hooks/use-notifications";

const NOTIF_TYPES = new Set(["donation", "campaign", "system", "user"]);
type NotifType = "donation" | "campaign" | "system" | "user";

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
    unreadCount,
    page,
    totalPages,
    load,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    load({ unreadOnly: filter === "unread" });
  }, [filter, load]);

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
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
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

      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-16 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {filter === "unread" ? "No unread notifications." : "No notifications yet."}
            </p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3.5 ${
                n.read ? "" : "bg-primary/[0.03]"
              }`}
            >
              <NotificationIcon
                type={(NOTIF_TYPES.has(n.type) ? n.type : "system") as NotifType}
              />
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    if (n.link) router.push(n.link);
                  }}
                  className="text-left"
                >
                  <p
                    className={`text-sm leading-snug ${
                      n.read ? "text-muted-foreground" : "font-medium text-foreground"
                    } ${n.link ? "hover:text-primary transition-colors" : ""}`}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  )}
                </button>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {relativeTime(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="text-[11px] text-primary hover:underline shrink-0 mt-0.5"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
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
