"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Pool creation now happens in a right-side sheet on `/dashboard/pools`
 * (opened via `?new=1`). This route only redirects old links and bookmarks.
 */
export default function NewPoolRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/pools?new=1");
  }, [router]);

  return (
    <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
  );
}
