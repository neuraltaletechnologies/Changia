import {
  Users,
  Megaphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { CampaignCard } from "@/components/dashboard/campaign-card";
import { RecentDonations } from "@/components/dashboard/recent-donations";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { campaigns, statsOverview, formatTZS } from "@/lib/mock-data";

export default function DashboardPage() {
  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, Admin. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Donors"
          value={statsOverview.totalDonors.toString()}
          sub="Across all campaigns"
          icon={Users}
          trend={8.3}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Active Campaigns"
          value={statsOverview.activeCampaigns.toString()}
          sub="3 ending this quarter"
          icon={Megaphone}
          trend={25}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Total Raised"
          value={formatTZS(statsOverview.totalRaised)}
          sub="Across all time"
          icon={Wallet}
          trend={12.4}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Avg Gift Size"
          value={formatTZS(statsOverview.avgGift)}
          sub="Last 30 days"
          icon={TrendingUp}
          trend={-3.1}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
        />
      </div>

      {/* Active Campaigns */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Active Campaigns
          </h2>
          <a href="/campaigns" className="text-xs text-primary hover:underline">
            View all campaigns
          </a>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeCampaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      </section>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RecentDonations />
        <ActivityFeed />
      </div>
    </div>
  );
}
