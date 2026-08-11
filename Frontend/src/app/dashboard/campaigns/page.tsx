"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Campaign } from "@/lib/dashboard/types";
import { CampaignCard } from "@/components/dashboard/widgets/campaign-card";
import { Button } from "@/components/dashboard/ui/button";
import { loadUserCampaigns } from "@/lib/dashboard/campaign-store";
import { Plus } from "lucide-react";
import { useRole } from "@/hooks/use-role";

const statusChips: { status: Campaign["status"]; styles: string }[] = [
  { status: "active", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { status: "pending", styles: "bg-orange-50 text-orange-700 border-orange-200" },
  { status: "draft", styles: "bg-slate-50 text-slate-600 border-slate-200" },
  { status: "completed", styles: "bg-sky-50 text-sky-700 border-sky-200" },
  { status: "paused", styles: "bg-amber-50 text-amber-700 border-amber-200" },
];

export default function CampaignsPage() {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const { hasPermission } = useRole();
  const canCreate = hasPermission("campaign:create");

  useEffect(() => {
    setAllCampaigns(loadUserCampaigns());
  }, []);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allCampaigns.length} campaigns &mdash; track goals and donor engagement
          </p>
        </div>
        {canCreate && (
        <Button size="sm" nativeButton={false} render={<Link href="/dashboard/campaigns/new" />}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Campaign
        </Button>
        )}
      </div>

      {/* Tabs summary */}
      <div className="flex gap-3 flex-wrap">
        {statusChips.map(({ status, styles }) => {
          const count = allCampaigns.filter((c) => c.status === status).length;
          return (
            <span
              key={status}
              className={`text-xs font-medium border rounded-full px-3 py-1 capitalize ${styles}`}
            >
              {count} {status}
            </span>
          );
        })}
      </div>

      {allCampaigns.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
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
          {allCampaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
