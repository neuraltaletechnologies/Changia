"use client";

import { useState } from "react";
import { Bell, Search, Menu, X } from "lucide-react";
import { Badge } from "@/components/dashboard/ui/badge";
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
interface HeaderProps {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
}

export function Header({ onMobileMenuToggle, mobileMenuOpen }: HeaderProps) {
  const unreadCount = 0;
  const [notifOpen, setNotifOpen] = useState(false);

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
          <span className="text-xs">Search donors, campaigns…</span>
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
              <div className="py-12 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <button className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-[11px] bg-primary text-primary-foreground font-semibold">
                AU
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-medium text-foreground">
                Admin User
              </p>
              <p className="text-[10px] text-muted-foreground">Admin</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs cursor-pointer">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs cursor-pointer">
                Organisation Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs cursor-pointer text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
