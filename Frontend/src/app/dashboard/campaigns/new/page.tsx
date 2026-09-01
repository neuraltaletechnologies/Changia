"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ImageIcon,
  Megaphone,
  Layers,
  Users,
  Loader2,
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
import {
  campaignApi,
  poolApi,
  organizationApi,
  type DonorPool,
  type CampaignRecord,
} from "@/lib/dashboard/api";
import { formatTZS } from "@/lib/dashboard/types";
import { cn } from "@/lib/dashboard/utils";
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
  startDate: string;
  endDate: string;
  contactPhone: string;
}

// Mirrors the backend multer limit (Backend/middlewares/upload.js) so an
// oversized photo is caught here instead of failing mid-submit.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const initialForm: FormState = {
  name: "",
  category: CATEGORIES[0],
  description: "",
  scope: "",
  acceptance: "",
  goal: "",
  minimumAmount: "",
  startDate: "",
  endDate: "",
  contactPhone: "",
};

export default function NewCampaignPage() {
  const router = useRouter();
  // Only an admin (org/super) or reviewer sets the service-fee rate. A campaign
  // manager sees the org's rate but can't change it.
  const { hasPermission } = useRole();
  const canSetFee = hasPermission("campaign:fee_review");
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pools, setPools] = useState<DonorPool[]>([]);
  const [poolIds, setPoolIds] = useState<number[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = pendingAction !== null;
  const [created, setCreated] = useState<CampaignRecord | null>(null);
  // Once the draft exists on the server we keep its record so a retry after a
  // failed photo upload reuses it instead of creating a duplicate campaign.
  const [draft, setDraft] = useState<CampaignRecord | null>(null);

  // The org's default campaign service fee (%), added on top of the goal —
  // see computeFees() in Backend/modules/campaign/service.js. Only an admin or
  // reviewer (`canSetFee`) can change it per-campaign; a campaign manager just
  // sees the default. `orgDefaultFee` remembers the default so we can tell
  // whether an admin entered a custom rate.
  const [serviceFeePercent, setServiceFeePercent] = useState(5);
  const [orgDefaultFee, setOrgDefaultFee] = useState(5);

  const loadPools = useCallback(async () => {
    try {
      const r = await poolApi.list({ limit: 100 });
      setPools(r.pools.filter((p) => !p.isSystem));
    } catch {
      setPools([]);
    }
  }, []);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  useEffect(() => {
    organizationApi
      .getMine()
      .then((org) => {
        setServiceFeePercent(org.defaultServiceFeePercent);
        setOrgDefaultFee(org.defaultServiceFeePercent);
      })
      .catch(() => {
        // Keep the 5% fallback — the backend applies its own default anyway.
      });
  }, []);

  const goalAmount = Number(form.goal) || 0;
  // Only an admin/reviewer can reach the fee input, and their rate applies
  // immediately — so the entered rate is always the effective one.
  const isCustomFee = Number(serviceFeePercent) !== Number(orgDefaultFee);
  const effectiveFeePercent = serviceFeePercent;
  const serviceFeeAmount = Math.round(goalAmount * (effectiveFeePercent / 100));
  const publicTarget = goalAmount + serviceFeeAmount;

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const togglePool = (id: number) =>
    setPoolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // A draft only needs the essentials the backend enforces (name + a real
  // goal); everything else — cover photo, dates, contact phone — can be filled
  // in later before it's submitted for review.
  const validate = (mode: "draft" | "submit"): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Campaign name is required.";
    const goal = Number(form.goal);
    if (!form.goal.trim() || Number.isNaN(goal) || goal <= 0)
      next.goal = "Enter a goal amount greater than 0.";
    if (form.minimumAmount.trim()) {
      const min = Number(form.minimumAmount);
      if (Number.isNaN(min) || min <= 0) next.minimumAmount = "Minimum amount must be greater than 0.";
      else if (goal > 0 && min > goal) next.minimumAmount = "Minimum amount can't exceed the goal.";
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      next.endDate = "End date must be after the start date.";
    if (
      form.contactPhone.trim() &&
      !/^(\+?255|0)?[67][0-9]{8}$/.test(form.contactPhone.replace(/[\s-]/g, ""))
    )
      next.contactPhone = "Enter a valid Tanzanian phone number.";

    if (mode === "submit") {
      if (!form.startDate) next.startDate = "Select a start date.";
      if (!form.endDate) next.endDate = "Select an end date.";
      if (!form.contactPhone.trim()) next.contactPhone = "Contact phone is required.";
    }
    setErrors(next);

    let coverOk = true;
    if (mode === "submit" && !coverFile) {
      setCoverError("A cover photo is required to submit for review.");
      coverOk = false;
    } else if (coverFile && coverFile.size > MAX_IMAGE_BYTES) {
      setCoverError("The cover photo is larger than 5 MB. Choose a smaller image.");
      coverOk = false;
    } else {
      setCoverError(null);
    }

    const galleryOk = galleryFiles.every((f) => f.size <= MAX_IMAGE_BYTES);
    if (!galleryOk) {
      setGalleryError("One or more supporting photos are larger than 5 MB. Remove or replace them.");
    }

    return Object.keys(next).length === 0 && coverOk && galleryOk;
  };

  const save = async (mode: "draft" | "submit") => {
    if (!validate(mode)) return;

    setPendingAction(mode);
    setSubmitError(null);
    try {
      // Always create as a draft first. For a "submit", this lets us upload the
      // photos and only advance the campaign into the review queue once they're
      // safely stored — a failed photo upload must not leave a half-finished
      // campaign sitting in front of a reviewer. A retry after a failed upload
      // reuses the draft (patching in any form edits) rather than creating a
      // duplicate campaign.
      const payload = {
        name: form.name.trim(),
        category: form.category,
        story: form.description.trim() || undefined,
        scope: form.scope.trim() || undefined,
        acceptance: form.acceptance.trim() || undefined,
        goalAmount: Number(form.goal),
        minimumAmount: form.minimumAmount.trim() ? Number(form.minimumAmount) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        // Strip spaces/dashes — the backend expects a compact TZS number
        // (e.g. "+255700000000"), not the spaced placeholder format.
        contactPhone: form.contactPhone.trim()
          ? form.contactPhone.replace(/[\s-]/g, "")
          : undefined,
        // Only an admin/reviewer can set this, and only send it when it differs
        // from the org default (managers never send it).
        serviceFeePercent:
          canSetFee && isCustomFee ? Number(serviceFeePercent) : undefined,
      };
      const campaign = draft
        ? await campaignApi.update(draft.id, payload)
        : await campaignApi.create({
            ...payload,
            poolIds: poolIds.length > 0 ? poolIds : undefined,
            asDraft: true,
          });
      setDraft(campaign);

      // Upload photos. For a "submit" this is a hard gate: if it fails, the
      // campaign stays a draft, we surface the error, and we do NOT submit it
      // for review — the user fixes the photo on the campaign page and submits
      // from there. For a "draft" a failure is non-blocking (they can add
      // photos later).
      let imgError: string | null = null;
      if (coverFile || galleryFiles.length > 0) {
        try {
          const formData = new FormData();
          if (coverFile) formData.append("cover", coverFile);
          galleryFiles.forEach((f) => formData.append("gallery", f));
          await campaignApi.uploadImages(campaign.id, formData);
        } catch (imgErr) {
          imgError =
            imgErr instanceof Error ? imgErr.message : "the photos could not be uploaded";
        }
      }

      if (mode === "submit" && imgError) {
        // Hard stop: the campaign is saved as a draft but is NOT submitted for
        // review. Fix the photo and press "Submit for review" again — the retry
        // reuses this draft.
        setSubmitError(
          `The photos could not be uploaded: ${imgError}. ` +
            "Your campaign is saved as a draft — choose a photo under 5 MB (JPEG, PNG or WEBP) and submit again. " +
            "You can also finish it from the campaign page."
        );
        setPendingAction(null);
        return;
      }

      if (mode === "draft") {
        // Straight to the campaign page to keep working on it (photos, pools,
        // donors) and submit for review when ready.
        router.push(`/dashboard/campaigns/${campaign.id}`);
        return;
      }

      // Photos are stored — now actually put the campaign into the review queue.
      await campaignApi.submit(campaign.id);

      setCreated(campaign);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save the campaign.");
      setPendingAction(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void save("submit");
  };

  if (created) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-orange-50">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mt-4">
            Submitted for review
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Your campaign has been created and{" "}
            <span className="font-medium text-foreground">
              needs two approvals before it goes live
            </span>{" "}
            — first a reviewer, then an admin. You&apos;ll be notified as it moves
            through, and can share it once it&apos;s approved.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 rounded-full border px-3 py-1 text-xs font-medium border-orange-200 bg-orange-50 text-orange-700">
            <Clock className="w-3.5 h-3.5" />
            Pending first review
          </div>
          {poolIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {poolIds.length} donor pool{poolIds.length > 1 ? "s" : ""} imported for tracking.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/campaigns/${created.id}`} />}
            >
              View Campaign
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns" />}
            >
              View My Campaigns
            </Button>
            <Button size="sm" variant="ghost" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Start a New Campaign
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the details below. Save it as a draft to keep working on it
            (photos, donor pools, donors), or submit it for review now. Every
            campaign is reviewed before it goes live — first by a reviewer, then
            by an admin.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/campaigns" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
      </div>

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
              Tell donors what you are raising funds for
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
              onValueChange={(v) => setField("category", v ?? CATEGORIES[0])}
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
            <p className="text-xs text-muted-foreground">
              Swahili translation is generated automatically for the public /sw pages.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-scope">Scope</Label>
            <Textarea
              id="campaign-scope"
              placeholder="What exactly will the funds deliver? e.g. 200 desks, one borehole pump, a term of school fees for 12 pupils…"
              value={form.scope}
              onChange={(e) => setField("scope", e.target.value)}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the campaign&apos;s public &ldquo;Scope&rdquo; tab. Optional.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-acceptance">Acceptance</Label>
            <Textarea
              id="campaign-acceptance"
              placeholder="How will supporters know a contribution landed and the campaign delivered? e.g. receipts issued, a completion report with photos, funds released only against invoices…"
              value={form.acceptance}
              onChange={(e) => setField("acceptance", e.target.value)}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the campaign&apos;s public &ldquo;Acceptance&rdquo; tab, above Changia&apos;s
              standard payment-safety notes. Optional.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
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
              {goalAmount > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {formatTZS(goalAmount)} goal + {effectiveFeePercent}% service fee (
                    {formatTZS(serviceFeeAmount)})
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    Donors will see a target of {formatTZS(publicTarget)}
                  </p>
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="campaign-min">Minimum contribution (TZS, optional)</Label>
              <Input
                id="campaign-min"
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
                <p className="text-xs text-muted-foreground">Defaults to TZS 1,000 if left blank.</p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-fee">Service fee (%)</Label>
            {canSetFee ? (
              <>
                <Input
                  id="campaign-fee"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={serviceFeePercent}
                  onChange={(e) => setServiceFeePercent(Number(e.target.value))}
                  className="h-9"
                />
                {isCustomFee ? (
                  <p className="text-xs text-amber-600">
                    Custom rate (default is {orgDefaultFee}%). This applies to this
                    campaign only.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your organisation&apos;s default rate, added on top of the goal.
                  </p>
                )}
              </>
            ) : (
              <>
                <Input
                  id="campaign-fee"
                  type="number"
                  value={serviceFeePercent}
                  disabled
                  readOnly
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Your organisation&apos;s default rate ({orgDefaultFee}%), added on
                  top of the goal. Only an admin or reviewer can change it.
                </p>
              </>
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

          {/* Cover + gallery images */}
          <div className="grid gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Photos</p>
                <p className="text-xs text-muted-foreground">
                  A cover photo is required before the campaign can be submitted for review; add supporting photos to help donors trust the campaign.
                </p>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Cover photo</Label>
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
                <ImageIcon className="w-3.5 h-3.5" />
                {coverFile ? coverFile.name : "Choose a cover photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > MAX_IMAGE_BYTES) {
                      setCoverFile(null);
                      setCoverError(
                        "That image is larger than 5 MB. Choose a smaller cover photo."
                      );
                      e.target.value = "";
                      return;
                    }
                    setCoverFile(file);
                    setCoverError(null);
                  }}
                />
              </label>
              {coverError && <p className="text-xs text-destructive">{coverError}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Supporting photos (optional, up to 8)</Label>
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
                <ImageIcon className="w-3.5 h-3.5" />
                {galleryFiles.length > 0
                  ? `${galleryFiles.length} photo${galleryFiles.length > 1 ? "s" : ""} selected`
                  : "Choose supporting photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    const tooBig = picked.filter((f) => f.size > MAX_IMAGE_BYTES);
                    setGalleryFiles(
                      picked.filter((f) => f.size <= MAX_IMAGE_BYTES).slice(0, 8)
                    );
                    setGalleryError(
                      tooBig.length > 0
                        ? `${tooBig.length} photo${
                            tooBig.length > 1 ? "s were" : " was"
                          } larger than 5 MB and skipped.`
                        : null
                    );
                  }}
                />
              </label>
              {galleryError && (
                <p className="text-xs text-destructive">{galleryError}</p>
              )}
            </div>
          </div>

          {/* Import donor pools */}
          <div className="grid gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Import donor pools</p>
                <p className="text-xs text-muted-foreground">
                  Optional — pre-track donors from your existing pools. You can also
                  import pools later from the campaign page.
                </p>
              </div>
            </div>
            {pools.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No custom donor pools available yet.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {pools.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePool(p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                      poolIds.includes(p.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={poolIds.includes(p.id)}
                      readOnly
                      className="accent-primary"
                    />
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground truncate flex-1">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.memberCount}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {submitError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/campaigns")}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => void save("draft")}
          >
            {pendingAction === "draft" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save as draft"
            )}
          </Button>
          <Button type="submit" disabled={submitting}>
            {pendingAction === "submit" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit for review"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
