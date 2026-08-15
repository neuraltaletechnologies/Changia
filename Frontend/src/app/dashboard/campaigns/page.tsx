"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { type Campaign, type CampaignStatus } from "@/lib/dashboard/types";
import { CampaignCard } from "@/components/dashboard/widgets/campaign-card";
import { Button } from "@/components/dashboard/ui/button";
import {
  campaignApi,
  formatTZSCompact,
  type CampaignRecord,
} from "@/lib/dashboard/api";
import { Plus, Megaphone } from "lucide-react";
import { useRole } from "@/hooks/use-role";

const statusChips: { status: string; styles: string }[] = [
  { status: "ACTIVE", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { status: "PENDING", styles: "bg-orange-50 text-orange-700 border-orange-200" },
  { status: "DRAFT", styles: "bg-slate-50 text-slate-600 border-slate-200" },
  { status: "COMPLETED", styles: "bg-sky-50 text-sky-700 border-sky-200" },
  { status: "PAUSED", styles: "bg-amber-50 text-amber-700 border-amber-200" },
  { status: "CANCELLED", styles: "bg-rose-50 text-rose-700 border-rose-200" },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = useRole();
  const canCreate = hasPermission("campaign:create");

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await campaignApi.list({ limit: 100 });
      setCampaigns(result.campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaigns.length} campaigns &mdash; track goals and donor engagement
          </p>
        </div>
        {canCreate && (
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard/campaigns/new" />}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Campaign
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabs summary */}
      <div className="flex gap-3 flex-wrap">
        {statusChips.map(({ status, styles }) => {
          const count = campaigns.filter((c) => c.status === status).length;
          return (
            <span
              key={status}
              className={`text-xs font-medium border rounded-full px-3 py-1 capitalize ${styles}`}
            >
              {count} {status.toLowerCase()}
            </span>
          );
        })}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Megaphone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          {canCreate && (
            <Button
              className="mt-4"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns/new" />}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Start a Campaign
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={toCardCampaign(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function toCardCampaign(c: CampaignRecord): Campaign {
  return {
    id: String(c.id),
    name: c.name,
    goal: c.publicTarget > 0 ? c.publicTarget : c.goalAmount,
    raised: c.raisedAmount,
    donors: c.donorCount,
    status: (c.status.toLowerCase() as CampaignStatus) || "draft",
    startDate: c.startDate ? new Date(c.startDate).toLocaleDateString() : "—",
    endDate: c.endDate ? new Date(c.endDate).toLocaleDateString() : "—",
    category: c.category ?? undefined,
    description: c.story ?? undefined,
    ownerName: c.assignments?.[0]
      ? `${c.assignments[0].user.firstName} ${c.assignments[0].user.lastName ?? ""}`.trim()
      : undefined,
  };
}