"use client";

import { useEffect, useState } from "react";
import { reminderScheduleApi } from "@/lib/dashboard/api";
import { isAuthenticated } from "@/lib/api-client";

/**
 * Polls the count of reminder batches awaiting manager confirmation, for the
 * sidebar/mobile-nav "Reminders" badge. Silently stays at 0 on any error
 * (e.g. logged out) rather than surfacing a nav-level failure.
 */
export function usePendingReminderCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;

    const load = () => {
      reminderScheduleApi
        .pending()
        .then((r) => {
          if (!cancelled) setCount(r.pending.length);
        })
        .catch(() => undefined);
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
