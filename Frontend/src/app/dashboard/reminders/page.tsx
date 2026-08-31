"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { PendingResendsPanel } from "@/components/dashboard/reminders/pending-resends-panel";
import { SchedulesPanel } from "@/components/dashboard/reminders/schedules-panel";

/**
 * Reminders — one page for both halves of the automatic-resend flow:
 *  1. Pending Resends — cycles waiting for a manual review/confirm.
 *  2. Auto-Resend Schedules — the interval rules that queue those cycles.
 * (Reusable message templates live on the separate /reminders/templates page.)
 */
export default function RemindersPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review the resend cycles waiting to go out, and manage the schedules
            that queue them.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/reminders/templates" />}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Templates
        </Button>
      </div>

      <PendingResendsPanel />

      <div className="border-t border-border" />

      <SchedulesPanel />
    </div>
  );
}
