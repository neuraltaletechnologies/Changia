"use client";

import { Check, Loader2, X } from "lucide-react";

import { cn } from "@/lib/dashboard/utils";

export type ActionState = "idle" | "pending" | "done" | "failed";

/**
 * Small inline chip that reports whether the last action on a row completed.
 * Used on the reminder pages so "sent / skipped / saved / failed" stays visible
 * next to the item after the corner toast has faded.
 */
export function ActionStatusBadge({
  state,
  pendingLabel = "Working…",
  doneLabel = "Done",
  failedLabel = "Failed",
  className,
}: {
  state: ActionState;
  pendingLabel?: string;
  doneLabel?: string;
  failedLabel?: string;
  className?: string;
}) {
  if (state === "idle") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        state === "pending" && "border-border bg-muted/50 text-muted-foreground",
        state === "done" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        state === "failed" && "border-destructive/30 bg-destructive/5 text-destructive",
        className
      )}
    >
      {state === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === "done" && <Check className="h-3 w-3" />}
      {state === "failed" && <X className="h-3 w-3" />}
      {state === "pending" ? pendingLabel : state === "done" ? doneLabel : failedLabel}
    </span>
  );
}
