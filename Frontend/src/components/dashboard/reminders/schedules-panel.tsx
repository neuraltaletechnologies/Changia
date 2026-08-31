"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Switch } from "@/components/dashboard/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import { ActionStatusBadge, type ActionState } from "@/components/dashboard/ui/action-status";
import {
  reminderScheduleApi,
  poolApi,
  campaignApi,
  templateApi,
  type ReminderSchedule,
  type ReminderChannel,
  type DonorPool,
  type CampaignRecord,
  type MessageTemplate,
} from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

const CHANNELS: ReminderChannel[] = ["SMS", "WHATSAPP", "EMAIL"];
const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

/**
 * "Auto-Resend Schedules" section — set an interval and every cycle is queued
 * for a manual review/confirm in the Pending Resends section above. Rendered as
 * one section of the combined /dashboard/reminders page.
 */
export function SchedulesPanel({
  campaignId,
  canManage = true,
}: { campaignId?: number; canManage?: boolean } = {}) {
  const [schedules, setSchedules] = useState<ReminderSchedule[]>([]);
  const [pools, setPools] = useState<DonorPool[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReminderSchedule | "new" | null>(null);
  // Transient per-row outcome for toggle / delete actions.
  const [rowStatus, setRowStatus] = useState<
    Record<number, { state: ActionState; label: string }>
  >({});
  const setRow = (id: number, state: ActionState, label: string) => {
    setRowStatus((prev) => ({ ...prev, [id]: { state, label } }));
    if (state === "done" || state === "failed") {
      setTimeout(
        () => setRowStatus((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        }),
        2500
      );
    }
  };

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [s, p, c] = await Promise.all([
        reminderScheduleApi.list({ limit: 100 }),
        poolApi.list({ limit: 100 }),
        campaignApi.list({ limit: 100 }),
      ]);
      setSchedules(
        campaignId
          ? s.schedules.filter(
              (x) => x.scope === "CAMPAIGN" && x.campaignId === campaignId
            )
          : s.schedules
      );
      setPools(p.pools.filter((pool) => !pool.isSystem));
      setCampaigns(c.campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auto-resend schedules.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (id: number) => {
    if (!window.confirm("Delete this auto-resend schedule?")) return;
    setRow(id, "pending", "Deleting…");
    try {
      await reminderScheduleApi.remove(id);
      setRow(id, "done", "Deleted");
      setTimeout(refresh, 1200);
    } catch {
      setRow(id, "failed", "Not deleted");
    }
  };

  const toggleActive = async (schedule: ReminderSchedule) => {
    setRow(schedule.id, "pending", "Saving…");
    try {
      await reminderScheduleApi.update(schedule.id, { isActive: !schedule.isActive });
      setRow(schedule.id, "done", schedule.isActive ? "Paused" : "Activated");
      refresh();
    } catch {
      setRow(schedule.id, "failed", "Not saved");
    }
  };

  const targetName = (s: ReminderSchedule) =>
    s.scope === "POOL"
      ? pools.find((p) => p.id === s.poolId)?.name || "Deleted pool"
      : campaigns.find((c) => c.id === s.campaignId)?.name || "Deleted campaign";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Auto-Resend Schedules
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set an interval and every cycle is queued for a campaign manager to
            review and confirm in Pending Resends — nothing sends on its own.
            Not available for the anomalous pool.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Schedule
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
      ) : schedules.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Settings2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No auto-resend schedules yet.</p>
          {canManage && (
            <Button size="sm" className="mt-4" onClick={() => setEditing("new")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create a schedule
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {s.scope === "POOL" ? (
                  <Layers className="w-4 h-4 text-primary" />
                ) : (
                  <Megaphone className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {targetName(s)} · every {s.intervalDays} day{s.intervalDays === 1 ? "" : "s"} ·{" "}
                  {s.channels.map((c) => CHANNEL_LABEL[c]).join(" / ")}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  Next cycle: {new Date(s.nextRunAt).toLocaleString()}
                </p>
              </div>
              {rowStatus[s.id] && (
                <ActionStatusBadge
                  state={rowStatus[s.id].state}
                  pendingLabel={rowStatus[s.id].label}
                  doneLabel={rowStatus[s.id].label}
                  failedLabel={rowStatus[s.id].label}
                />
              )}
              <Switch
                checked={s.isActive}
                onCheckedChange={() => toggleActive(s)}
                aria-label={s.isActive ? "Deactivate schedule" : "Activate schedule"}
              />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setEditing(s)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs cursor-pointer text-destructive"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ScheduleDialog
          schedule={editing === "new" ? null : editing}
          pools={pools}
          campaigns={campaigns}
          lockedCampaignId={campaignId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

function ScheduleDialog({
  schedule,
  pools,
  campaigns,
  lockedCampaignId,
  onClose,
  onSaved,
}: {
  schedule: ReminderSchedule | null;
  pools: DonorPool[];
  campaigns: CampaignRecord[];
  /** When set (campaign Reminders tab), new schedules are forced to this campaign. */
  lockedCampaignId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(schedule?.name || "");
  const [scope, setScope] = useState<"POOL" | "CAMPAIGN">(
    schedule?.scope || (lockedCampaignId ? "CAMPAIGN" : "POOL")
  );
  const [poolId, setPoolId] = useState<string>(schedule?.poolId ? String(schedule.poolId) : "");
  const [campaignId, setCampaignId] = useState<string>(
    schedule?.campaignId
      ? String(schedule.campaignId)
      : lockedCampaignId
        ? String(lockedCampaignId)
        : ""
  );
  const [intervalDays, setIntervalDays] = useState(String(schedule?.intervalDays ?? 7));
  const [channels, setChannels] = useState<ReminderChannel[]>(schedule?.channels ?? ["WHATSAPP"]);
  const [templatesByChannel, setTemplatesByChannel] = useState<Partial<Record<ReminderChannel, MessageTemplate[]>>>({});
  const [templateIds, setTemplateIds] = useState<Partial<Record<ReminderChannel, string>>>({
    SMS: schedule?.templateIdSms ? String(schedule.templateIdSms) : "",
    WHATSAPP: schedule?.templateIdWhatsapp ? String(schedule.templateIdWhatsapp) : "",
    EMAIL: schedule?.templateIdEmail ? String(schedule.templateIdEmail) : "",
  });
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (c: ReminderChannel) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  useEffect(() => {
    channels.forEach((c) => {
      if (templatesByChannel[c]) return;
      templateApi
        .list({ channel: c, limit: 100 })
        .then((r) => setTemplatesByChannel((prev) => ({ ...prev, [c]: r.templates })))
        .catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels]);

  const save = async () => {
    if (!name.trim()) return setError("Name is required.");
    if (channels.length === 0) return setError("Select at least one channel.");
    if (!schedule) {
      if (scope === "POOL" && !poolId) return setError("Select a donor pool.");
      if (scope === "CAMPAIGN" && !campaignId) return setError("Select a campaign.");
    }

    setSaving(true);
    setError(null);
    try {
      const templatePayload = {
        templateIdSms: channels.includes("SMS") && templateIds.SMS ? Number(templateIds.SMS) : undefined,
        templateIdWhatsapp:
          channels.includes("WHATSAPP") && templateIds.WHATSAPP ? Number(templateIds.WHATSAPP) : undefined,
        templateIdEmail:
          channels.includes("EMAIL") && templateIds.EMAIL ? Number(templateIds.EMAIL) : undefined,
      };
      if (schedule) {
        await reminderScheduleApi.update(schedule.id, {
          name: name.trim(),
          intervalDays: Number(intervalDays),
          channels,
          isActive,
          ...templatePayload,
        });
      } else {
        await reminderScheduleApi.create({
          name: name.trim(),
          scope,
          poolId: scope === "POOL" ? Number(poolId) : undefined,
          campaignId: scope === "CAMPAIGN" ? Number(campaignId) : undefined,
          intervalDays: Number(intervalDays),
          channels,
          isActive,
          ...templatePayload,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {schedule ? "Edit Schedule" : "New Auto-Resend Schedule"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Each cycle is queued for your confirmation — it never sends by
            itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly nudge — School Fees Pool"
              className="h-9 text-sm"
            />
          </div>

          {!schedule && !lockedCampaignId && (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs">Applies to</Label>
                <Select value={scope} onValueChange={(v) => setScope((v ?? "POOL") as "POOL" | "CAMPAIGN")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POOL">A donor pool</SelectItem>
                    <SelectItem value="CAMPAIGN">A campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === "POOL" ? (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Donor pool</Label>
                  <Select value={poolId} onValueChange={(v) => setPoolId(v ?? "")}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {pools.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pools.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      No eligible pools — the anomalous pool can't be scheduled.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Campaign</Label>
                  <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? "")}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">Resend every (days)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              className="h-9 text-sm w-32"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Channels</Label>
            <div className="flex gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  className={cn(
                    "text-xs font-medium rounded-full px-3 py-1.5 border transition-colors",
                    channels.includes(c)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {CHANNEL_LABEL[c]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Each donor is messaged on whichever of these channels is their
              own preferred contact method.
            </p>
          </div>

          {channels.map((c) => (
            <div key={c} className="grid gap-1.5">
              <Label className="text-xs">{CHANNEL_LABEL[c]} template</Label>
              <Select
                value={templateIds[c] || ""}
                onValueChange={(v) => setTemplateIds((prev) => ({ ...prev, [c]: v ?? "" }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="No template — plain reminder" />
                </SelectTrigger>
                <SelectContent>
                  {(templatesByChannel[c] || []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(templatesByChannel[c] || []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No {CHANNEL_LABEL[c]} templates yet —{" "}
                  <Link href="/dashboard/reminders/templates" className="text-primary hover:underline">
                    create one
                  </Link>
                  .
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">Active</p>
              <p className="text-[11px] text-muted-foreground">
                Paused schedules never queue new cycles.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {schedule ? "Save changes" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
