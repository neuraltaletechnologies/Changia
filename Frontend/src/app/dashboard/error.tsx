"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <TriangleAlert className="w-6 h-6 text-destructive" />
      </div>
      <h1 className="text-lg font-semibold text-foreground tracking-tight">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}