"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Megaphone, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/dashboard/ui/sheet";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { Button } from "@/components/dashboard/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { campaignApi, type CampaignRecord } from "@/lib/dashboard/api";
import { formatTZS } from "@/lib/dashboard/types";
import { useRole } from "@/hooks/use-role";

const CATEGORIES = [
  "Community",
  "Health",
  "Education",
  "Agriculture",
  "Emergency",
  "Water & Sanitation",
  "Other",
];

interface FormState {
  name: string;
  category: string;
  description: string;
  scope: string;
  acceptance: string;
  goal: string;
  minimumAmount: string;
  serviceFee: string;
  startDate: string;
  endDate: string;
  contactPhone: string;
}

const EMPTY: FormState = {
  name: "",
  category: "",
  description: "",
  scope: "",
  acceptance: "",
  goal: "",
  minimumAmount: "",
  serviceFee: "",
  startDate: "",
  endDate: "",
  contactPhone: "",
};

function fromCampaign(c: CampaignRecord): FormState {
  return {
    name: c.name,
    category: c.category ?? "",
    description: c.story ?? "",
    scope: c.scope ?? "",
    acceptance: c.acceptance ?? "",
    goal: String(c.goalAmount),
    minimumAmount: c.minimumAmount ? String(c.minimumAmount) : "",
    serviceFee: String(
      c.feeStatus === "PENDING" && c.proposedServiceFeePercent != null
        ? c.proposedServiceFeePercent
        : c.serviceFeePercent
    ),
    startDate: c.startDate ? new Date(c.startDate).toISOString().split("T")[0] : "",
    endDate: c.endDate ? new Date(c.endDate).toISOString().split("T")[0] : "",
    contactPhone: c.contactPhone ?? "",
  };
}

export function CampaignEditSheet({
  campaign,
  open,
  onOpenChange,
  onSaved,
}: {
  /** The list row's campaign — used for the initial paint while the fresh copy loads. */
  campaign: CampaignRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save so the parent can refresh its list. */
  onSaved: () => void;
}) {
  const { hasPermission } = useRole();
  const canSetFee = hasPermission("campaign:fee_review");

  const [fresh, setFresh] = useState<CampaignRecord>(campaign);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set after a live-campaign edit is parked for review — the sheet stays open
  // and shows the resulting review status instead of just vanishing.
  const [sentForReview, setSentForReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const c = await campaignApi.get(campaign.id);
      setFresh(c);
      setForm(fromCampaign(c));
    } catch (e) {
      // Fall back to the row we already have.
      setFresh(campaign);
      setForm(fromCampaign(campaign));
      setSubmitError(e instanceof Error ? e.message : "Failed to load the latest campaign details.");
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    if (open) {
      setErrors({});
      setSentForReview(false);
      load();
    }
  }, [open, load]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Campaign name is required.";
    const goal = Number(form.goal);
    if (!form.goal.trim() || Number.isNaN(goal) || goal <= 0)
      next.goal = "Enter a goal amount greater than 0.";
    if (form.minimumAmount.trim()) {
      const min = Number(form.minimumAmount);
      if (Number.isNaN(min) || min <= 0)
        next.minimumAmount = "Minimum amount must be greater than 0.";
      else if (goal > 0 && min > goal)
        next.minimumAmount = "Minimum amount can't exceed the goal.";
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      next.endDate = "End date must be after the start date.";
    if (
      form.contactPhone.trim() &&
      !/^(\+?255|0)?[67][0-9]{8}$/.test(form.contactPhone.replace(/[\s-]/g, ""))
    )
      next.contactPhone = "Enter a valid Tanzanian phone number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const feeChanged =
        canSetFee &&
        form.serviceFee.trim() !== "" &&
        Number(form.serviceFee) !== Number(fresh.serviceFeePercent);
      const updated = await campaignApi.update(campaign.id, {
        name: form.name.trim(),
        category: form.category || undefined,
        story: form.description.trim() || undefined,
        scope: form.scope.trim() || undefined,
        acceptance: form.acceptance.trim() || undefined,
        goalAmount: Number(form.goal),
        minimumAmount: form.minimumAmount.trim() ? Number(form.minimumAmount) : undefined,
        serviceFeePercent: feeChanged ? Number(form.serviceFee) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      });
      // Refresh the list behind the sheet either way.
      onSaved();
      const parked =
        !!updated.changeRequest &&
        (updated.changeRequest.kind ?? "EDIT") === "EDIT" &&
        ["PENDING", "REVIEWED"].includes(updated.changeRequest.status);
      if (parked) {
        // Keep the sheet open and show the review status the edit produced.
        setFresh(updated);
        setForm(fromCampaign(updated));
        setSentForReview(true);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update the campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLive = fresh.status === "ACTIVE" || fresh.status === "PAUSED";
  const editInReview =
    !!fresh.changeRequest &&
    (fresh.changeRequest.kind ?? "EDIT") === "EDIT" &&
    ["PENDING", "REVIEWED"].includes(fresh.changeRequest.status);
  const saveLabel = isLive ? "Send for review" : "Save changes";

  // Nothing to save / send if the form still matches the campaign as loaded —
  // don't let the user push an empty edit into the review queue.
  const dirty = !loading && JSON.stringify(form) !== JSON.stringify(fromCampaign(fresh));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg gap-0 overflow-y-auto"
      >
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">Edit campaign</SheetTitle>
              <SheetDescription className="truncate">{fresh.name}</SheetDescription>
            </div>
          </div>
          {editInReview && (
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {fresh.status === "ACTIVE" ? "Active" : fresh.status.charAt(0) + fresh.status.slice(1).toLowerCase()}
              {" · changes waiting on review"}
            </span>
          )}
        </SheetHeader>

        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 space-y-4 p-4">
              {sentForReview && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    <span className="font-medium">Sent for review.</span> These edits are now
                    with a reviewer, then an org admin.{" "}
                    {fresh.status === "ACTIVE" ? "The campaign stays active" : "The campaign stays paused"}{" "}
                    and keeps showing the last-approved version until both approve. You can
                    track it under{" "}
                    <Link href="/dashboard/approvals" className="underline">
                      Campaign Approvals
                    </Link>
                    .
                  </span>
                </div>
              )}

              {fresh.reviewState === "CHANGES_REQUESTED" && fresh.reviewNotes && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-medium">Changes requested:</span> {fresh.reviewNotes}
                </div>
              )}

              {editInReview && !sentForReview ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  This campaign stays <span className="font-medium">{fresh.status === "ACTIVE" ? "active" : fresh.status.toLowerCase()}</span>,
                  but an earlier edit is with a reviewer and an admin. The public page keeps
                  showing the last-approved version until they approve. Saving again replaces
                  that pending edit.
                </div>
              ) : fresh.changeRequest?.status === "CHANGES_REQUESTED" ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  A reviewer asked for changes
                  {fresh.changeRequest.reviewNotes ? `: "${fresh.changeRequest.reviewNotes}"` : "."} Update
                  and send it back for review.
                </div>
              ) : isLive ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  This campaign is live. Your changes don&apos;t go public right away — they&apos;re
                  sent for a reviewer&apos;s <span className="font-medium">and</span> an admin&apos;s
                  approval first. The campaign stays {fresh.status === "ACTIVE" ? "active" : "paused"}
                  meanwhile.
                </div>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="cs-name">Campaign name</Label>
                <Input
                  id="cs-name"
                  placeholder="e.g. Borehole for Majengo Village"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  className="h-9"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setField("category", v ?? "")}>
                  <SelectTrigger id="cs-category" className="h-9">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-description">Description</Label>
                <Textarea
                  id="cs-description"
                  placeholder="Describe the campaign, who it helps and how the funds will be used…"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Swahili is auto-translated on save.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-scope">Scope</Label>
                <Textarea
                  id="cs-scope"
                  placeholder="What exactly will the funds deliver?"
                  value={form.scope}
                  onChange={(e) => setField("scope", e.target.value)}
                  className="min-h-20"
                />
                <p className="text-xs text-muted-foreground">Public &ldquo;Scope&rdquo; tab.</p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-acceptance">Acceptance</Label>
                <Textarea
                  id="cs-acceptance"
                  placeholder="How will supporters know a contribution landed and the campaign delivered?"
                  value={form.acceptance}
                  onChange={(e) => setField("acceptance", e.target.value)}
                  className="min-h-20"
                />
                <p className="text-xs text-muted-foreground">Public &ldquo;Acceptance&rdquo; tab.</p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-goal">Goal amount (TZS)</Label>
                <Input
                  id="cs-goal"
                  type="number"
                  min={1}
                  placeholder="e.g. 5000000"
                  value={form.goal}
                  onChange={(e) => setField("goal", e.target.value)}
                  aria-invalid={!!errors.goal}
                  className="h-9"
                />
                {errors.goal && <p className="text-xs text-destructive">{errors.goal}</p>}
                {form.goal && Number(form.goal) > 0 && (
                  <p className="text-xs text-muted-foreground">{formatTZS(Number(form.goal))}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-min">Minimum contribution (TZS, optional)</Label>
                <Input
                  id="cs-min"
                  type="number"
                  min={1}
                  placeholder="e.g. 1000"
                  value={form.minimumAmount}
                  onChange={(e) => setField("minimumAmount", e.target.value)}
                  aria-invalid={!!errors.minimumAmount}
                  className="h-9"
                />
                {errors.minimumAmount ? (
                  <p className="text-xs text-destructive">{errors.minimumAmount}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The smallest amount a donor can give. Defaults to TZS 1,000.
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-fee">Service fee (%)</Label>
                <Input
                  id="cs-fee"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.serviceFee}
                  onChange={(e) => setField("serviceFee", e.target.value)}
                  className="h-9"
                  disabled={!canSetFee}
                  readOnly={!canSetFee}
                />
                {!canSetFee ? (
                  <p className="text-xs text-muted-foreground">
                    The active rate, added on top of the goal. Only an admin or reviewer can
                    change it.
                  </p>
                ) : fresh.feeStatus === "PENDING" ? (
                  <p className="text-xs text-amber-600">
                    A custom rate of {fresh.proposedServiceFeePercent}% is awaiting
                    reviewer/admin approval. The campaign still uses {fresh.serviceFeePercent}%
                    until it&apos;s approved.
                  </p>
                ) : isLive ? (
                  <p className="text-xs text-muted-foreground">
                    A change to this rate needs reviewer + admin approval before it takes
                    effect.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your change to this rate applies immediately.
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="cs-start">Start date</Label>
                  <Input
                    id="cs-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setField("startDate", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cs-end">End date</Label>
                  <Input
                    id="cs-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setField("endDate", e.target.value)}
                    aria-invalid={!!errors.endDate}
                    className="h-9"
                  />
                  {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cs-phone">Contact phone</Label>
                <Input
                  id="cs-phone"
                  type="tel"
                  placeholder="e.g. +255 700 000 000"
                  value={form.contactPhone}
                  onChange={(e) => setField("contactPhone", e.target.value)}
                  aria-invalid={!!errors.contactPhone}
                  className="h-9"
                />
                {errors.contactPhone && (
                  <p className="text-xs text-destructive">{errors.contactPhone}</p>
                )}
              </div>

              <Link
                href={`/dashboard/campaigns/${campaign.id}/edit`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open the full editor for cover photo &amp; gallery
              </Link>

              {submitError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </div>
              )}
            </div>

            <SheetFooter className="flex-row justify-end border-t border-border">
              {sentForReview ? (
                <Button type="button" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !dirty}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        {isLive ? "Sending…" : "Saving…"}
                      </>
                    ) : !dirty ? (
                      "No changes"
                    ) : (
                      saveLabel
                    )}
                  </Button>
                </>
              )}
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
