"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Megaphone,
} from "lucide-react";
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
import { CampaignPhotosCard } from "@/components/dashboard/campaigns/campaign-photos-card";

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
  goal: string;
  serviceFee: string;
  startDate: string;
  endDate: string;
  contactPhone: string;
}

/** The form's baseline for a campaign — used both to seed and to detect edits. */
function formFromCampaign(c: CampaignRecord): FormState {
  return {
    name: c.name,
    category: c.category ?? "",
    description: c.story ?? "",
    goal: String(c.goalAmount),
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

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Only an admin (org/super) or reviewer can change the service-fee rate.
  const { hasPermission, isOrgAdmin, isCampaignManager } = useRole();
  const canSetFee = hasPermission("campaign:fee_review");
  // The backend image endpoint is ORG_ADMIN / CAMPAIGN_MANAGER only (same as
  // campaign creation) — SUPER_ADMIN can't upload campaign photos.
  const canManagePhotos = isOrgAdmin || isCampaignManager;
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    category: "",
    description: "",
    goal: "",
    serviceFee: "",
    startDate: "",
    endDate: "",
    contactPhone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Don't let an unchanged form be saved — for a live campaign that would push
  // an empty edit into the review queue.
  const dirty = campaign
    ? JSON.stringify(form) !== JSON.stringify(formFromCampaign(campaign))
    : false;

  const loadCampaign = useCallback(async () => {
    try {
      const c = await campaignApi.get(id);
      if (c.status === "COMPLETED" || c.status === "CANCELLED") {
        setSubmitError("Completed or cancelled campaigns can't be edited.");
        return;
      }
      setCampaign(c);
      setForm(formFromCampaign(c));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

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
      // Only send serviceFeePercent when the rate actually changed from the
      // campaign's active rate. For a manager the backend records it as a
      // proposal pending review; for an admin/reviewer it applies immediately.
      const feeChanged =
        canSetFee &&
        form.serviceFee.trim() !== "" &&
        campaign != null &&
        Number(form.serviceFee) !== Number(campaign.serviceFeePercent);
      await campaignApi.update(id, {
        name: form.name.trim(),
        category: form.category || undefined,
        story: form.description.trim() || undefined,
        goalAmount: Number(form.goal),
        serviceFeePercent: feeChanged ? Number(form.serviceFee) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      });
      router.push(`/dashboard/campaigns/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update the campaign.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-96 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (submitError && !campaign) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard/campaigns" />}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Edit Campaign
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update your campaign details.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/campaigns/${id}`} />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
      </div>

      {campaign && campaign.reviewState === "CHANGES_REQUESTED" && campaign.reviewNotes && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Changes requested:</span> {campaign.reviewNotes}
        </div>
      )}

      {campaign && campaign.changeRequest &&
        ["PENDING", "REVIEWED", "CHANGES_REQUESTED"].includes(campaign.changeRequest.status) && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            You have edits awaiting review
            {campaign.changeRequest.status === "REVIEWED"
              ? " — first approval done, waiting on an admin."
              : campaign.changeRequest.status === "CHANGES_REQUESTED"
                ? `. A reviewer asked for changes${campaign.changeRequest.reviewNotes ? `: "${campaign.changeRequest.reviewNotes}"` : "."}`
                : " by a reviewer, then an admin."}{" "}
            The public campaign still shows the last-approved version until they clear.
          </div>
        )}

      {campaign && (campaign.status === "ACTIVE" || campaign.status === "PAUSED") && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          This campaign is live. Saved changes to the name, story, goal, service
          fee, category, dates, minimum amount, contact phone or cover image need
          a reviewer&apos;s <span className="font-medium">and</span> an
          admin&apos;s approval before they show publicly. Swahili translations
          and gallery photos apply right away.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Campaign Details</p>
            <p className="text-xs text-muted-foreground">
              Edit your campaign information
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input
              id="campaign-name"
              placeholder="e.g. Borehole for Majengo Village"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              aria-invalid={!!errors.name}
              className="h-9"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setField("category", v ?? "")}
            >
              <SelectTrigger id="campaign-category" className="h-9">
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
            <Label htmlFor="campaign-description">Description</Label>
            <Textarea
              id="campaign-description"
              placeholder="Describe the campaign, who it helps and how the funds will be used…"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-goal">Goal amount (TZS)</Label>
            <Input
              id="campaign-goal"
              type="number"
              min={1}
              placeholder="e.g. 5000000"
              value={form.goal}
              onChange={(e) => setField("goal", e.target.value)}
              aria-invalid={!!errors.goal}
              className="h-9"
            />
            {errors.goal && (
              <p className="text-xs text-destructive">{errors.goal}</p>
            )}
            {form.goal && Number(form.goal) > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatTZS(Number(form.goal))}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-fee">Service fee (%)</Label>
            <Input
              id="campaign-fee"
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
                The active rate for this campaign, added on top of the goal. Only
                an admin or reviewer can change it.
              </p>
            ) : campaign?.feeStatus === "PENDING" ? (
              <p className="text-xs text-amber-600">
                A custom rate of {campaign?.proposedServiceFeePercent}% is awaiting
                reviewer/admin approval. The campaign still uses {campaign?.serviceFeePercent}%
                until it&apos;s approved.
              </p>
            ) : campaign?.feeStatus === "REJECTED" ? (
              <p className="text-xs text-muted-foreground">
                The last custom-rate proposal was declined
                {campaign?.feeReviewNotes ? `: ${campaign.feeReviewNotes}` : "."} The
                active rate is {campaign?.serviceFeePercent}%.
              </p>
            ) : campaign?.status === "ACTIVE" || campaign?.status === "PAUSED" ? (
              <p className="text-xs text-muted-foreground">
                A change to this rate needs reviewer + admin approval before it
                takes effect.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your change to this rate applies immediately.
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="campaign-start">Start date</Label>
              <Input
                id="campaign-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                aria-invalid={!!errors.startDate}
                className="h-9"
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="campaign-end">End date</Label>
              <Input
                id="campaign-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                aria-invalid={!!errors.endDate}
                className="h-9"
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-phone">Contact phone</Label>
            <Input
              id="campaign-phone"
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
        </div>

        {submitError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.push(`/dashboard/campaigns/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !dirty}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : !dirty ? (
              "No changes"
            ) : campaign?.status === "ACTIVE" || campaign?.status === "PAUSED" ? (
              "Send for review"
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>

      {campaign && (
        <CampaignPhotosCard
          campaignId={id}
          images={campaign.images ?? []}
          coverUrl={campaign.imageUrl}
          canManage={canManagePhotos}
          showCover
          onChanged={loadCampaign}
        />
      )}
    </div>
  );
}
