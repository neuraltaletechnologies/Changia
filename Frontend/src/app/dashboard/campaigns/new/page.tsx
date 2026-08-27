"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
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
  minimumAmount: string;
  startDate: string;
  endDate: string;
  contactPhone: string;
}

const initialForm: FormState = {
  name: "",
  category: CATEGORIES[0],
  description: "",
  goal: "",
  minimumAmount: "",
  startDate: "",
  endDate: "",
  contactPhone: "",
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pools, setPools] = useState<DonorPool[]>([]);
  const [poolIds, setPoolIds] = useState<number[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CampaignRecord | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  // The org's default campaign service fee (%), added on top of the goal —
  // see computeFees() in Backend/modules/campaign/service.js. A manager may
  // PROPOSE a different rate for this campaign: it needs a reviewer/admin's
  // approval before it takes effect, so until then the campaign still shows the
  // default rate. `orgDefaultFee` remembers the default so we can tell whether
  // the entered value is a custom proposal.
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
  // A rate different from the org default is a custom proposal that a
  // reviewer/admin must approve before it applies — so the target donors will
  // actually see is still computed off the default until that happens.
  const isCustomFee = Number(serviceFeePercent) !== Number(orgDefaultFee);
  const effectiveFeePercent = isCustomFee ? orgDefaultFee : serviceFeePercent;
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

  const validate = (): boolean => {
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
    if (!form.startDate) next.startDate = "Select a start date.";
    if (!form.endDate) next.endDate = "Select an end date.";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      next.endDate = "End date must be after the start date.";
    if (!form.contactPhone.trim()) next.contactPhone = "Contact phone is required.";
    if (
      form.contactPhone.trim() &&
      !/^(\+?255|0)?[67][0-9]{8}$/.test(form.contactPhone.replace(/[\s-]/g, ""))
    )
      next.contactPhone = "Enter a valid Tanzanian phone number.";
    setErrors(next);

    let coverOk = true;
    if (!coverFile) {
      setCoverError("A cover photo is required.");
      coverOk = false;
    } else {
      setCoverError(null);
    }

    return Object.keys(next).length === 0 && coverOk;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const campaign = await campaignApi.create({
        name: form.name.trim(),
        category: form.category,
        story: form.description.trim() || undefined,
        goalAmount: Number(form.goal),
        minimumAmount: form.minimumAmount.trim() ? Number(form.minimumAmount) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        poolIds: poolIds.length > 0 ? poolIds : undefined,
        // Only send a rate when it differs from the org default — a custom
        // value is stored as a proposal pending reviewer/admin approval.
        serviceFeePercent: isCustomFee ? Number(serviceFeePercent) : undefined,
      });

      // Images are a separate call — the campaign already exists once this
      // point is reached, so a failure here shouldn't block the flow, just
      // surface as a non-fatal warning on the success screen.
      try {
        const formData = new FormData();
        if (coverFile) formData.append("cover", coverFile);
        galleryFiles.forEach((f) => formData.append("gallery", f));
        const withImages = await campaignApi.uploadImages(campaign.id, formData);
        setCreated(withImages);
      } catch (imgErr) {
        setCreated(campaign);
        setImageWarning(
          imgErr instanceof Error
            ? `Campaign created, but the photos failed to upload: ${imgErr.message}. Add them from the campaign page.`
            : "Campaign created, but the photos failed to upload. Add them from the campaign page."
        );
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create the campaign.");
      setSubmitting(false);
    }
  };

  if (created) {
    const isPending = created.status === "PENDING";
    return (
      <div className="space-y-6 max-w-[720px]">
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <div
            className={cn(
              "mx-auto w-12 h-12 rounded-full flex items-center justify-center",
              isPending ? "bg-orange-50" : "bg-emerald-50"
            )}
          >
            {isPending ? (
              <Clock className="w-6 h-6 text-orange-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mt-4">
            {isPending ? "Submitted for approval" : "Campaign is live"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {isPending ? (
              <>
                Your campaign has been created and{" "}
                <span className="font-medium text-foreground">
                  is waiting for an admin to review and approve it
                </span>
                . You&apos;ll be able to share it once it&apos;s approved.
              </>
            ) : (
              <>
                Your campaign has been created and is{" "}
                <span className="font-medium text-foreground">already public and accepting contributions</span>.
                You can share it with donors right away.
              </>
            )}
          </p>
          <div
            className={cn(
              "inline-flex items-center gap-2 mt-4 rounded-full border px-3 py-1 text-xs font-medium",
              isPending
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {isPending ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isPending ? "Pending Approval" : "Active"}
          </div>
          {imageWarning && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 text-left">
              {imageWarning}
            </div>
          )}
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
    <div className="space-y-6 max-w-[720px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Start a New Campaign
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the details below. A campaign you create as a manager needs
            admin approval before it goes live; an admin&apos;s own campaign goes
            live immediately.
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
                Custom rate (default is {orgDefaultFee}%). This needs a reviewer or
                admin to approve it before it applies — until then the campaign
                uses the {orgDefaultFee}% default.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your organisation&apos;s default rate, added on top of the goal. Change
                it to propose a custom rate for this campaign.
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

          {/* Cover + gallery images */}
          <div className="grid gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Photos</p>
                <p className="text-xs text-muted-foreground">
                  A cover photo is required; add supporting photos to help donors trust the campaign.
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
                    setCoverFile(e.target.files?.[0] ?? null);
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
                  onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []).slice(0, 8))}
                />
              </label>
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

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/campaigns")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Campaign"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
