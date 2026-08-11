"use client";

import "./globals.css";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/layout/sidebar";
import { Header } from "@/components/dashboard/layout/header";
import { MobileNav } from "@/components/dashboard/layout/mobile-nav";
import { TooltipProvider } from "@/components/dashboard/ui/tooltip";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { RoleGuard } from "@/components/dashboard/route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      </AuthGuard>
    </TooltipProvider>
  );
}
