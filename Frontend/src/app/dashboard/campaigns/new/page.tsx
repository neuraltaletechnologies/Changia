"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Megaphone,
  Clock,
  Plus,
  X,
  Image as ImageIcon,
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
import { saveUserCampaign } from "@/lib/dashboard/campaign-store";
import type { Campaign } from "@/lib/dashboard/types";
import { formatTZS } from "@/lib/dashboard/types";

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
  ownerName: string;
  image: string;
  evidence: string[];
}

const initialForm: FormState = {
  name: "",
  category: CATEGORIES[0],
  description: "",
  goal: "",
  startDate: "",
  endDate: "",
  contactPhone: "",
  ownerName: "",
  image: "",
  evidence: [],
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState<Campaign | null>(null);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setEvidenceAt = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.evidence];
      next[index] = value;
      return { ...prev, evidence: next };
    });
  };

   const setCoverAt = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.evidence];
      next[index] = value;
      return { ...prev, evidence: next };
    });
  };
  const addEvidence = () => {
    setForm((prev) => ({ ...prev, evidence: [...prev.evidence, ""] }));
  };

   const addCover = () => {
    setForm((prev) => ({ ...prev, evidence: [...prev.evidence, ""] }));
  };

  const removeEvidence = (index: number) => {
    setForm((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index),
    }));
  };

   const removeCover = (index: number) => {
    setForm((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index),
    }));
  };

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
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const campaign: Campaign = {
      id: `uc-${Date.now()}`,
      name: form.name.trim(),
      goal: Number(form.goal),
      raised: 0,
      donors: 0,
      status: "pending",
      startDate: form.startDate,
      endDate: form.endDate,
      description: form.description.trim(),
      category: form.category,
      contactPhone: form.contactPhone.trim(),
      ownerName: form.ownerName.trim() || undefined,
      image: form.image.trim() || undefined,
      evidence: form.evidence.map((u) => u.trim()).filter(Boolean),
      submittedAt: new Date().toISOString(),
    };

    saveUserCampaign(campaign);
    setSubmitted(campaign);
  };

  if (submitted) {
    return (
      <div className="space-y-6 max-w-[720px]">
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mt-4">
            Campaign submitted
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Your campaign &ldquo;{submitted.name}&rdquo; has been submitted and is
            now waiting for admin approval. You will be able to share it with
            donors once it is approved.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
            <Clock className="w-3.5 h-3.5" />
            Pending admin approval
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns" />}
            >
              View My Campaigns
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSubmitted(null)}>
              Create Another
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
            Fill in the details below. Your campaign will go live once an admin
            approves it.
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

          <div className="grid gap-1.5">
            <Label htmlFor="campaign-owner">Campaign owner</Label>
            <Input
              id="campaign-owner"
              placeholder="e.g. Jane Mwangi"
              value={form.ownerName}
              onChange={(e) => setField("ownerName", e.target.value)}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              The person responsible for managing this campaign.
            </p>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
               <Label htmlFor="campaign-image">Banner image </Label>
            <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={addCover}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add image
              </Button>
            </div>
            {form.evidence.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Optional. A cover image shown at the top of the campaign page.
              </p>
            ) : (
              <div className="space-y-2">
                {form.evidence.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      type="url"
                      placeholder="https://example.com/evidence.jpg"
                      value={url}
                      onChange={(e) => setCoverAt(index, e.target.value)}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0"
                      onClick={() => removeCover(index)}
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Evidence images</Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={addEvidence}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add image
              </Button>
            </div>
            {form.evidence.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Optional. Add photos that prove how the funds are used.
              </p>
            ) : (
              <div className="space-y-2">
                {form.evidence.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      type="url"
                      placeholder="https://example.com/evidence.jpg"
                      value={url}
                      onChange={(e) => setEvidenceAt(index, e.target.value)}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0"
                      onClick={() => removeEvidence(index)}
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/campaigns")}>
            Cancel
          </Button>
          <Button type="submit">Submit for Approval</Button>
        </div>
      </form>
    </div>
  );
}
