"use client";

import Link from "next/link";

/**
 * App-wide error boundary. Without this file Next.js fails to render errors
 * and shows "Missing required error components, refreshing…" instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="bg-card border border-border rounded-xl shadow-sm max-w-md w-full p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}