"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Calendar,
  Check,
  FileClock,
  Layers,
  Loader2,
  Megaphone,
  Settings2,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { reminderScheduleApi, type PendingReminderBatch, type ReminderChannel } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export default function PendingRemindersPage() {
  const [pending, setPending] = useState<PendingReminderBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<PendingReminderBatch | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const r = await reminderScheduleApi.pending();
      setPending(r.pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending reminders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const skip = async (id: number) => {
    if (!window.confirm("Skip this resend cycle? No messages will be sent this time.")) return;
    await reminderScheduleApi.skipPending(id);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Pending Resends
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatic resend cycles wait here for your confirmation — nothing
            sends until you review and confirm each batch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/reminders/templates" />}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/reminders/schedules" />}
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Auto-resend schedules
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
      ) : pending.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <FileClock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No resends waiting for confirmation right now.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Set up an{" "}
            <Link href="/dashboard/reminders/schedules" className="text-primary hover:underline">
              auto-resend schedule
            </Link>{" "}
            and its due cycles will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((batch) => (
            <div
              key={batch.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                {batch.scope === "POOL" ? (
                  <Layers className="w-4 h-4 text-amber-600" />
                ) : (
                  <Megaphone className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {batch.scheduleName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {batch.pool?.name || batch.campaign?.name || "—"} ·{" "}
                  {batch.donorCount} donor{batch.donorCount === 1 ? "" : "s"} ·{" "}
                  {batch.channels.map((c) => CHANNEL_LABEL[c]).join(" / ")}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due since {new Date(batch.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => skip(batch.id)}>
                  <SkipForward className="w-3.5 h-3.5 mr-1.5" />
                  Skip
                </Button>
                <Button size="sm" onClick={() => setReviewing(batch)}>
                  <BellRing className="w-3.5 h-3.5 mr-1.5" />
                  Review &amp; Confirm
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <ConfirmDialog
          batch={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  batch,
  onClose,
  onDone,
}: {
  batch: PendingReminderBatch;
  onClose: () => void;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const confirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      await reminderScheduleApi.confirmPending(batch.id);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send this batch.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Send this resend cycle?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Each donor is messaged on their own preferred channel, using the
            template configured on this schedule.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-50 mx-auto flex items-center justify-center mb-3">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">Reminders sent</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {batch.donorCount} donor{batch.donorCount === 1 ? "" : "s"} messaged.
            </p>
            <Button size="sm" onClick={onDone}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-1.5">
              <Row label="Schedule" value={batch.scheduleName} />
              <Row label="Scope" value={batch.pool?.name || batch.campaign?.name || "—"} />
              <Row label="Recipients" value={`${batch.donorCount} unpaid / partial donor${batch.donorCount === 1 ? "" : "s"}`} />
              <Row
                label="Channels"
                value={batch.channels
                  .map((c) => CHANNEL_LABEL[c])
                  .join(", ")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Confirming will send now — this cannot be undone. If you're not
              ready, close this dialog or skip the cycle instead.
            </p>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={onClose} disabled={confirming}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirm} disabled={confirming}>
                {confirming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <BellRing className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirm &amp; Send
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex items-center justify-between text-xs")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right truncate max-w-[220px]">{value}</span>
    </div>
  );
}
