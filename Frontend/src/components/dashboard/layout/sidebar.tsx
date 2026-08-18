"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/dashboard/utils";
import {
  LayoutDashboard,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UserCog,
  Building2,
  HeartHandshake,
  ExternalLink,
  Layers,
  BellRing,
  HandCoins,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/dashboard/ui/tooltip";
import { useRole } from "@/hooks/use-role";
import { usePendingReminderCount } from "@/hooks/use-pending-reminders";

const navItems = [
  {
    section: "Core",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
       {
        label: "Campaigns",
        href: "/dashboard/campaigns",
        icon: Megaphone,
      },
      {
        label: "Donor Pools",
        href: "/dashboard/pools",
        icon: Layers,
      },
      {
        label: "Reminders",
        href: "/dashboard/reminders",
        icon: BellRing,
      },

    ],
  },
  {
    section: "Admin",
    items: [
      {
        label: "User",
        href: "/dashboard/user",
        icon: UserCog,
      },
      {
        label: "Audit Log",
        href: "/dashboard/audit-log",
        icon: ClipboardList,
      },
      {
        label: "Payouts",
        href: "/dashboard/payouts",
        icon: HandCoins,
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { canAccessRoute, meta } = useRole();
  const pendingReminders = usePendingReminderCount();

  // Only show nav sections/items the current role is allowed to open.
  const visibleSections = navItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 px-3 border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <HeartHandshake className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sidebar-foreground text-[15px] tracking-tight">
            Changia
          </span>
        )}
      </div>

      {/* Org Switcher */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-md bg-sidebar-accent cursor-pointer hover:bg-sidebar-accent/70 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-3 h-3 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate leading-tight">
                Changia Foundation TZ
              </p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                {meta.shortLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleSections.map((section) => (
          <div key={section.section} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1.5">
                {section.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                      collapsed && "justify-center",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {item.href === "/dashboard/reminders" && pendingReminders > 0 && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full bg-amber-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center",
                          collapsed ? "absolute top-1 right-1 w-2 h-2" : "min-w-[18px] h-[18px] px-1"
                        )}
                      >
                        {collapsed ? "" : pendingReminders}
                      </span>
                    )}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={linkContent} />
                        <TooltipContent side="right" className="text-xs">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center w-full rounded-md px-2 py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm gap-2.5",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
        <Link
          href="/"
          className={cn(
            "flex items-center w-full rounded-md px-2 py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm gap-2.5",
            collapsed && "justify-center"
          )}
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs">Back to site</span>}
        </Link>
      </div>
    </aside>
  );
}
