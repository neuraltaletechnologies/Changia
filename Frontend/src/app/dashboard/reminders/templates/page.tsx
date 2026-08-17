"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { templateApi, type MessageTemplate, type ReminderChannel } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

const CHANNEL_META: Record<ReminderChannel, { label: string; className: string }> = {
  SMS: { label: "SMS", className: "bg-sky-50 text-sky-700 border-sky-200" },
  WHATSAPP: { label: "WhatsApp", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EMAIL: { label: "Email", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

const PLACEHOLDER_HELP =
  "Use {{donorName}}, {{amountDue}}, {{campaignName}} or {{orgName}} — they're filled in automatically when a reminder is sent.";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [channelFilter, setChannelFilter] = useState<ReminderChannel | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MessageTemplate | "new" | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const r = await templateApi.list({ channel: channelFilter || undefined, limit: 100 });
      setTemplates(r.templates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (id: number) => {
    if (!window.confirm("Delete this template?")) return;
    await templateApi.remove(id);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/reminders" />}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Reminders
          </Button>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mt-3">
            Reminder Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable SMS, WhatsApp and Email messages for manual and
            automatic resends.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Template
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {(["", "SMS", "WHATSAPP", "EMAIL"] as const).map((c) => (
          <button
            key={c || "all"}
            onClick={() => setChannelFilter(c)}
            className={cn(
              "text-xs font-medium rounded-full px-3 py-1.5 border transition-colors",
              channelFilter === c
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted/40"
            )}
          >
            {c === "" ? "All" : CHANNEL_META[c].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
      ) : templates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No templates yet.</p>
          <Button size="sm" className="mt-4" onClick={() => setEditing("new")}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <span
                    className={cn(
                      "text-[10px] font-medium border rounded-full px-2 py-0.5",
                      CHANNEL_META[t.channel].className
                    )}
                  >
                    {CHANNEL_META[t.channel].label}
                  </span>
                </div>
                {t.subject && (
                  <p className="text-[11px] text-muted-foreground mt-1">Subject: {t.subject}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setEditing(t)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs cursor-pointer text-destructive"
                    onClick={() => remove(t.id)}
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
        <TemplateDialog
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function TemplateDialog({
  template,
  onClose,
  onSaved,
}: {
  template: MessageTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || "");
  const [channel, setChannel] = useState<ReminderChannel>(template?.channel || "WHATSAPP");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(
    template?.body ||
      "Hello {{donorName}}, this is a friendly reminder from {{orgName}} about your pledge to {{campaignName}}. Please complete your payment when you can. Thank you!"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      setError("Name and message body are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        channel,
        subject: channel === "EMAIL" ? subject.trim() || undefined : undefined,
        body: body.trim(),
      };
      if (template) {
        await templateApi.update(template.id, payload);
      } else {
        await templateApi.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel((v ?? "WHATSAPP") as ReminderChannel)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channel === "EMAIL" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground">{PLACEHOLDER_HELP}</p>
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
            {template ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
