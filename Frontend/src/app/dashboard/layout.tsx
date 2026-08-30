"use client";

import "./globals.css";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/layout/sidebar";
import { Header } from "@/components/dashboard/layout/header";
import { MobileNav } from "@/components/dashboard/layout/mobile-nav";
import { TooltipProvider } from "@/components/dashboard/ui/tooltip";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { RoleGuard } from "@/components/dashboard/route-guard";
import { ActionToaster } from "@/components/dashboard/ui/toaster";
import { clearOverlayBackdrop } from "@/components/ui/forms/auth-modal-utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The marketing site's theme script adds `.dark` to <html> for visitors whose
  // OS prefers dark. The dashboard has no dark theme, so drop the class while
  // we're in the dashboard and restore it on the way out (back to marketing).
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    if (wasDark) root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);

  // Signing in from the marketing navbar modal navigates straight here; Preline
  // appends the modal backdrop to <body> (outside React) and locks body scroll,
  // so without this the translucent overlay lingers over the dashboard until
  // the next click. Sweep it up on entry.
  useEffect(() => {
    clearOverlayBackdrop();
  }, []);

  return (
    <TooltipProvider delay={200}>
      <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        {/* Mobile Nav */}
        <MobileNav
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header
            onMobileMenuToggle={() => setMobileMenuOpen((v) => !v)}
            mobileMenuOpen={mobileMenuOpen}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <RoleGuard>{children}</RoleGuard>
          </main>
        </div>
      </div>
      <ActionToaster />
      </AuthGuard>
    </TooltipProvider>
  );
}
