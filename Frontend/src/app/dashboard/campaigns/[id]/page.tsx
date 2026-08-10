"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Megaphone,
  Phone,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Progress } from "@/components/dashboard/ui/progress";
import { campaigns, formatTZS, type Campaign } from "@/lib/dashboard/mock-data";
import { loadUserCampaigns } from "@/lib/dashboard/campaign-store";
import { campaignStatusMap } from "@/components/dashboard/widgets/campaign-card";
import { cn } from "@/lib/dashboard/utils";

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = [...loadUserCampaigns(), ...campaigns].find((c) => c.id === id);
    setCampaign(found ?? null);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[800px]">
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground text-sm">Campaign not found.</p>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/campaigns" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  const s = campaignStatusMap[campaign.status];

  return (
    <div className="space-y-6 max-w-[800px]">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/dashboard/campaigns" />}
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        Back to Campaigns
      </Button>

      {campaign.status === "pending" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3 dark:border-orange-500/40 dark:bg-orange-500/10">
          <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
              Awaiting admin approval
            </p>
            <p className="text-xs text-orange-700/80 dark:text-orange-200/70 mt-0.5">
              This campaign has been submitted but is not live yet. Once an admin
              approves it, it will be published and ready to share with donors.
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {campaign.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {campaign.category && (
                <span className="inline-flex items-center gap-1">
                  <Megaphone className="w-3.5 h-3.5" />
                  {campaign.category}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {campaign.startDate} → {campaign.endDate}
              </span>
            </div>
          </div>
          <span
            className={cn(
              "text-[10px] font-medium border rounded-full px-2.5 py-1 shrink-0",
              s.className
            )}
          >
            {s.label}
          </span>
        </div>

        {campaign.submittedAt && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Submitted for approval on{" "}
            {new Date(campaign.submittedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4">Progress</h2>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-foreground">{formatTZS(campaign.raised)}</span>
          <span className="text-muted-foreground">of {formatTZS(campaign.goal)}</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-3">
          <span>{pct}% funded</span>
          <span>{campaign.donors.toLocaleString()} donors</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-2">Details</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {campaign.description || "No description provided."}
        </p>
        {campaign.contactPhone && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
            <Phone className="w-3.5 h-3.5" />
            {campaign.contactPhone}
          </p>
        )}
      </div>
    </div>
  );
}
