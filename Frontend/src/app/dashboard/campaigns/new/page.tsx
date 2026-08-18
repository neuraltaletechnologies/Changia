"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
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
import { campaignApi, poolApi, type DonorPool } from "@/lib/dashboard/api";
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
  startDate: string;
  endDate: string;
  contactPhone: string;
}

const initialForm: FormState = {
  name: "",
  category: CATEGORIES[0],
  description: "",
  goal: "",
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

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
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await campaignApi.create({
        name: form.name.trim(),
        category: form.category,
        story: form.description.trim() || undefined,
        goalAmount: Number(form.goal),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        poolIds: poolIds.length > 0 ? poolIds : undefined,
      });
      setCreatedId(created.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create the campaign.");
      setSubmitting(false);
    }
  };

  if (createdId) {
    return (
      <div className="space-y-6 max-w-[720px]">
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mt-4">
            Campaign is live
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Your campaign has been created and is{" "}
            <span className="font-medium text-foreground">already public and accepting contributions</span>.
            You can share it with donors right away.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
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
              render={<Link href={`/dashboard/campaigns/${createdId}`} />}
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
            Fill in the details below. Your campaign goes live immediately — no
            separate approval step.
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