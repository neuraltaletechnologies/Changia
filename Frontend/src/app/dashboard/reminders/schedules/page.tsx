"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Auto-resend schedules were merged into /dashboard/reminders (they're now the
 * lower section of that page). Keep this route as a permanent redirect so old
 * links / bookmarks still land somewhere sensible.
 */
export default function SchedulesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/reminders");
  }, [router]);
  return null;
}
