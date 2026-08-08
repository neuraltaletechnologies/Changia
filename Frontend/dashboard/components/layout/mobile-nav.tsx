"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  ClipboardList,
  UserCog,
  HeartHandshake,
  Building2,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Donor Pool", href: "/donors", icon: Users },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Team", href: "/team", icon: UserCog },
  { label: "Audit Log", href: "/audit-log", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-64 bg-sidebar z-50 md:hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
              <HeartHandshake className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white text-[15px] tracking-tight">
              Changia
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Org */}
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-md bg-sidebar-accent">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-3 h-3 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
                Changia Foundation TZ
              </p>
              <p className="text-[10px] text-sidebar-foreground/60">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-white font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
