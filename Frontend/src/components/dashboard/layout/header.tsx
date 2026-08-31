"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu, X, LogOut } from "lucide-react";
import { Badge } from "@/components/dashboard/ui/badge";
import { NotificationIcon } from "@/components/dashboard/layout/notification-icon";
import { useNotifications } from "@/hooks/use-notifications";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/dashboard/ui/popover";
import { useRole } from "@/hooks/use-role";
import { clearSession } from "@/lib/api-client";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "U";
}

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

const NOTIF_TYPES = new Set(["donation", "campaign", "system", "user", "payout"]);

export function Header({ onMobileMenuToggle, mobileMenuOpen }: HeaderProps) {
  const router = useRouter();
  const { user, meta, hasPermission } = useRole();
  const { unreadCount, items, load, markRead, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (notifOpen) load();
  }, [notifOpen, load]);

  const openNotification = (n: (typeof items)[number]) => {
    if (!n.read) markRead(n.id);
    setNotifOpen(false);
    if (n.link) router.push(n.link);
  };

  const displayName =
    user && user.firstName
      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
      : "User";
  const displayRole = meta.shortLabel;
  const canManageOrg = hasPermission("settings:org");

  const handleSignOut = () => {
    clearSession();
    // Sign-out drops the user back on the public landing page. (An expired
    // session mid-session is sent to "/?auth=login" by the guard instead.)
    router.replace("/");
    router.refresh();
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
      {/* Left: mobile menu + breadcrumb placeholder */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          onClick={onMobileMenuToggle}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-sm text-muted-foreground w-56 cursor-pointer hover:bg-muted/80 transition-colors">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">Search donors, Campaigns…</span>
          <kbd className="ml-auto text-[10px] bg-background border border-border rounded px-1 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger
            className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 p-0 shadow-lg"
            sideOffset={8}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge className="text-[10px] h-4 px-1.5 rounded-full">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                items.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <NotificationIcon
                      type={
                        (NOTIF_TYPES.has(n.type) ? n.type : "system") as
                          | "donation"
                          | "campaign"
                          | "system"
                          | "user"
                          | "payout"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs leading-snug ${
                          n.read ? "text-muted-foreground" : "font-medium text-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <button
                className="text-xs text-primary hover:underline disabled:opacity-40"
                onClick={() => markAllRead()}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </button>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setNotifOpen(false);
                  router.push("/dashboard/notifications");
                }}
              >
                View all
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-[11px] bg-primary text-primary-foreground font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-medium text-foreground">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground">{displayRole}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">
                <span className="block font-semibold">{displayName}</span>
                <span className="block font-normal normal-case text-muted-foreground mt-0.5">
                  {displayRole}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs cursor-pointer"
                onClick={() => router.push("/dashboard/profile")}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer"
                onClick={() => router.push("/dashboard/settings")}
              >
                {canManageOrg ? "Organisation Settings" : "Settings"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
