"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/dashboard/utils";
import { onActionEvent, type ActionPhase } from "@/lib/dashboard/action-feed";

interface ToastItem {
  id: string;
  phase: ActionPhase;
  title: string;
  message?: string;
  /** ms the toast stays up once resolved — drives the countdown bar. */
  dismissMs: number;
}

const SUCCESS_MS = 3200;
const ERROR_MS = 7000;
const MAX_VISIBLE = 4;

/**
 * Bottom-right status feed for the dashboard. Listens to the action feed
 * (published by the API client on every write request) and shows, for anything
 * the user creates / sends / saves / deletes, whether it is in progress, done,
 * or failed.
 */
export function ActionToaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const clearTimer = (id: string) => {
      const t = timers.current.get(id);
      if (t) {
        clearTimeout(t);
        timers.current.delete(id);
      }
    };

    const dismiss = (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const scheduleDismiss = (id: string, ms: number) => {
      clearTimer(id);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms)
      );
    };

    const unsubscribe = onActionEvent((event) => {
      setToasts((prev) => {
        const existing = prev.find((t) => t.id === event.id);
        const dismissMs = event.phase === "error" ? ERROR_MS : SUCCESS_MS;

        if (existing) {
          if (event.phase !== "pending") scheduleDismiss(event.id, dismissMs);
          return prev.map((t) =>
            t.id === event.id
              ? { ...t, phase: event.phase, title: event.title, message: event.message, dismissMs }
              : t
          );
        }

        // No matching "pending" toast (very fast request) — add fresh.
        if (event.phase !== "pending") scheduleDismiss(event.id, dismissMs);
        const next: ToastItem = {
          id: event.id,
          phase: event.phase,
          title: event.title,
          message: event.message,
          dismissMs,
        };
        return [...prev, next].slice(-MAX_VISIBLE - 2);
      });
    });

    const snapshot = timers.current;
    return () => {
      unsubscribe();
      snapshot.forEach((t) => clearTimeout(t));
      snapshot.clear();
    };
  }, []);

  const remove = (id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <>
      <style>{TOASTER_CSS}</style>
      <div
        className="fixed bottom-4 right-4 z-[120] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {visible.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => remove(toast.id)} />
        ))}
      </div>
    </>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const pending = toast.phase === "pending";
  const error = toast.phase === "error";

  return (
    <div
      className={cn(
        "pointer-events-auto overflow-hidden rounded-xl border bg-card shadow-lg transition-all duration-200",
        mounted ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        error ? "border-destructive/30" : pending ? "border-border" : "border-emerald-200"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 shrink-0">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : error ? (
            <TriangleAlert className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-muted-foreground break-words">{toast.message}</p>
          )}
        </div>
        {!pending && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* status bar */}
      <div className="h-1 w-full bg-muted">
        {pending ? (
          <div className="toaster-bar-indeterminate h-full bg-primary" />
        ) : (
          <CountdownBar
            key={`${toast.phase}-${toast.dismissMs}`}
            durationMs={toast.dismissMs}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The green / red line that shrinks from full to empty over `durationMs`,
 * showing how long the toast has left before it auto-dismisses. Driven by a
 * width transition toggled on mount (rather than a CSS keyframe) so it always
 * runs even when the node is reused across the pending → resolved transition.
 */
function CountdownBar({ durationMs, error }: { durationMs: number; error: boolean }) {
  const [width, setWidth] = useState(100);
  useEffect(() => {
    // Two frames: let the browser paint the full-width bar first, then transition.
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setWidth(0));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);
  return (
    <div
      className={cn("h-full", error ? "bg-destructive" : "bg-emerald-500")}
      style={{ width: `${width}%`, transition: `width ${durationMs}ms linear` }}
    />
  );
}

const TOASTER_CSS = `
@keyframes toaster-indeterminate {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}
.toaster-bar-indeterminate {
  width: 40%;
  animation: toaster-indeterminate 1.15s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .toaster-bar-indeterminate { animation-duration: 2s; }
}
`;
