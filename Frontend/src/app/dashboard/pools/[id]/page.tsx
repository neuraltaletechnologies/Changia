"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * The per-pool detail view has been folded into `/dashboard/pools` — selecting a
 * pool card there now swaps the donor panel in place. This route only redirects
 * old links (and bookmarks) to the merged page with the pool pre-selected.
 */
export default function PoolDetailRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(
      params?.id ? `/dashboard/pools?pool=${params.id}` : "/dashboard/pools"
    );
  }, [params, router]);

  return (
    <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
  );
}
