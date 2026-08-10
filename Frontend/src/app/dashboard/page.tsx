"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Megaphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/widgets/stat-card";
import { CampaignCard } from "@/components/dashboard/widgets/campaign-card";
import { RecentDonations } from "@/components/dashboard/widgets/recent-donations";
import { ActivityFeed } from "@/components/dashboard/widgets/activity-feed";
import { Button } from "@/components/dashboard/ui/button";
import { loadUserCampaigns } from "@/lib/dashboard/campaign-store";
import { loadDonors } from "@/lib/dashboard/donor-store";
import { formatTZS, type Campaign, type Donor } from "@/lib/dashboard/types";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);

  useEffect(() => {
    setCampaigns(loadUserCampaigns());
    setDonors(loadDonors());
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raised, 0);
  const givingDonors = donors.filter((d) => d.totalGiven > 0);
  const avgGift =
    givingDonors.length > 0
      ? Math.round(
          givingDonors.reduce((sum, d) => sum + d.lastGiftAmount, 0) /
            givingDonors.length
        )
      : 0;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Donors"
          value={donors.length.toString()}
          sub="Across all campaigns"
          icon={Users}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          href="/dashboard/donors"
        />
        <StatCard
          label="Active Campaigns"
          value={activeCampaigns.length.toString()}
          sub="Live right now"
          icon={Megaphone}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          href="/dashboard/campaigns"
        />
        <StatCard
          label="Total Raised"
          value={formatTZS(totalRaised)}
          sub="Across all time"
          icon={Wallet}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          href="/dashboard/campaigns"
        />
        <StatCard
          label="Avg Gift Size"
          value={avgGift > 0 ? formatTZS(avgGift) : "—"}
          sub="Last 30 days"
          icon={TrendingUp}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          href="/dashboard/donors"
        />
      </div>

      {/* Active Campaigns */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Active Campaigns
          </h2>
          <Link href="/dashboard/campaigns" className="text-xs text-primary hover:underline">
            View all campaigns
          </Link>
        </div>
        {activeCampaigns.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              No active campaigns yet.
            </p>
            <Button
              className="mt-4"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns/new" />}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Start a Campaign
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RecentDonations />
        <ActivityFeed />
      </div>
    </div>
  );
}
