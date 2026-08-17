"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Megaphone,
  TrendingUp,
  Wallet,
  UserCog,
  ShieldCheck,
  Settings,
  Plus,
  HandCoins,
  UserPlus,
  BadgeCheck,
  Info,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/widgets/stat-card";
import { CampaignCard } from "@/components/dashboard/widgets/campaign-card";
import { RecentDonations } from "@/components/dashboard/widgets/recent-donations";
import { ActivityFeed } from "@/components/dashboard/widgets/activity-feed";
import { Button } from "@/components/dashboard/ui/button";
import { Badge } from "@/components/dashboard/ui/badge";
import { loadDonors } from "@/lib/dashboard/donor-store";
import { loadUsers} from "@/lib/dashboard/user-store";
import { campaignApi, type CampaignRecord } from "@/lib/dashboard/api";
import { formatTZS, type Campaign, type CampaignStatus, type Donor, type User } from "@/lib/dashboard/types";
import { ROLE } from "@/lib/dashboard/permissions";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";

interface QuickAction {
  label: string;
  sub: string;
  href: string;
  icon: typeof Settings;
  accent: string;
}

/**
 * Role-specific quick actions. Each entry is only rendered when the current
 * role holds the permission it needs — e.g. a CAMPAIGN_MANAGER never sees a
 * payout / withdrawal action.
 */
function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-3">Quick actions</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="group bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", a.accent)}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {a.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{a.sub}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { role, meta, resolved, hasPermission, canAccessRoute } = useRole();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [user, setUser] = useState<User[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDonors(loadDonors());
    setUser(loadUsers());
    campaignApi
      .list({ limit: 100 })
      .then((r) => {
        setCampaigns(
          r.campaigns.map((c: CampaignRecord) => ({
            id: String(c.id),
            name: c.name,
            goal: c.publicTarget > 0 ? c.publicTarget : c.goalAmount,
            raised: c.raisedAmount,
            donors: c.donorCount,
            status: c.status as CampaignStatus,
            startDate: c.startDate ? new Date(c.startDate).toLocaleDateString() : "—",
            endDate: c.endDate ? new Date(c.endDate).toLocaleDateString() : "—",
            category: c.category ?? undefined,
            description: c.story ?? undefined,
            ownerName: c.assignments?.[0]
              ? `${c.assignments[0].user.firstName} ${c.assignments[0].user.lastName ?? ""}`.trim()
              : undefined,
          }))
        );
      })
      .catch(() => setCampaigns([]));
    setHydrated(true);
  }, []);

  if (!resolved || !hydrated) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <div className="h-9 w-56 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
      </div>
    );
  }

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const pendingCampaigns = campaigns.filter((c) => c.status === "PENDING");
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raised, 0);
  const givingDonors = donors.filter((d) => d.totalGiven > 0);
  const avgGift =
    givingDonors.length > 0
      ? Math.round(
          givingDonors.reduce((sum, d) => sum + d.lastGiftAmount, 0) /
            givingDonors.length
        )
      : 0;

  const consentedDonors = donors.filter((d) => d.consentStatus === "consented");

  const canCreateCampaigns = hasPermission("campaign:create");
  const canApproveCampaigns = hasPermission("campaign:approve");
  const canManageDonors = hasPermission("donor:manage");
  const canRequestPayout = hasPermission("payout:request");
  const isPlatformRole = role === ROLE.SUPER_ADMIN;

  // Role-specific stats. Super admins get a platform overview; everyone else
  // gets an operational view (campaign managers see their assigned campaigns).
  const stats = isPlatformRole
    ? [
        {
          label: "Active Campaigns",
          value: activeCampaigns.length.toString(),
          sub: "Platform-wide",
          icon: Megaphone,
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-600",
          href: "/dashboard/campaigns",
        },
        {
          label: "Total Raised",
          value: formatTZS(totalRaised),
          sub: "All organisations",
          icon: Wallet,
          iconBg: "bg-amber-50",
          iconColor: "text-amber-600",
          href: "/dashboard/campaigns",
        },
        {
          label: "Registered Donors",
          value: donors.length.toString(),
          sub: "Across programs",
          icon: Users,
          iconBg: "bg-sky-50",
          iconColor: "text-sky-600",
          href: "/dashboard/donors",
        },
        {
          label: "User Members",
          value: user.length.toString(),
          sub: "Org users managed",
          icon: UserCog,
          iconBg: "bg-violet-50",
          iconColor: "text-violet-600",
          href: "/dashboard/user",
        },
      ]
    : [
        {
          label: "Total Donors",
          value: donors.length.toString(),
          sub: "Across all campaigns",
          icon: Users,
          iconBg: "bg-sky-50",
          iconColor: "text-sky-600",
          href: "/dashboard/donors",
        },
        {
          label:
            role === ROLE.CAMPAIGN_MANAGER
              ? "Assigned Campaigns"
              : "Active Campaigns",
          value: activeCampaigns.length.toString(),
          sub: "Live right now",
          icon: Megaphone,
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-600",
          href: "/dashboard/campaigns",
        },
        {
          label: "Total Raised",
          value: formatTZS(totalRaised),
          sub: "Across all time",
          icon: Wallet,
          iconBg: "bg-amber-50",
          iconColor: "text-amber-600",
          href: "/dashboard/campaigns",
        },
        {
          label: "Avg Gift Size",
          value: avgGift > 0 ? formatTZS(avgGift) : "—",
          sub: "Last 30 days",
          icon: TrendingUp,
          iconBg: "bg-rose-50",
          iconColor: "text-rose-500",
          href: "/dashboard/donors",
        },
      ];

  // Role-specific quick actions. Nothing payout-related is offered unless the
  // role holds `payout:request` (ORG_ADMIN / SUPER_ADMIN only).
  const quickActions: QuickAction[] = [];
  if (canCreateCampaigns) {
    quickActions.push({
      label: "New Campaign",
      sub: "Create and submit",
      href: "/dashboard/campaigns/new",
      icon: Plus,
      accent: "bg-primary/10 text-primary",
    });
  }
  if (canManageDonors) {
    quickActions.push({
      label: "Add Donor",
      sub: "Add to donor pool",
      href: "/dashboard/donors",
      icon: UserPlus,
      accent: "bg-sky-50 text-sky-600",
    });
  }
  if (canApproveCampaigns && pendingCampaigns.length > 0) {
    quickActions.push({
      label: "Approve Campaigns",
      sub: `${pendingCampaigns.length} awaiting approval`,
      href: "/dashboard/campaigns/approvals",
      icon: BadgeCheck,
      accent: "bg-emerald-50 text-emerald-600",
    });
  }
  if (canRequestPayout) {
    quickActions.push({
      label: "Request Payout",
      sub: "Withdraw raised funds",
      href: "/dashboard/payouts",
      icon: HandCoins,
      accent: "bg-amber-50 text-amber-600",
    });
  }

  const roleBannerStyles: Record<string, string> = {
    [ROLE.SUPER_ADMIN]: "bg-violet-50 border-violet-200",
    [ROLE.ORG_ADMIN]: "bg-sky-50 border-sky-200",
    [ROLE.CAMPAIGN_MANAGER]: "bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-2 capitalize rounded-full text-muted-foreground"
          >
            {role!.toLocaleLowerCase().replaceAll("_", " ")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{meta.tagline}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            icon={s.icon}
            iconBg={s.iconBg}
            iconColor={s.iconColor}
            href={s.href}
          />
        ))}
      </div>

      {/* Quick actions */}
      <QuickActions actions={quickActions} />

      {/* Active Campaigns */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {role === ROLE.CAMPAIGN_MANAGER
              ? "Your Assigned Campaigns"
              : "Active Campaigns"}
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
            {canCreateCampaigns && (
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
            {activeCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RecentDonations />
        {canAccessRoute("/dashboard/audit-log") ? (
          <ActivityFeed />
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Your Access Scope
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  As a {meta.label} you work on your assigned campaigns and add{" "}
                  <span className="text-foreground font-medium">
                    consented donors
                  </span>{" "}
                  only (no unsolicited contact), and you can send approved push
                  requests.
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {consentedDonors.length} consented donors ready to engage
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  Withdrawals, payouts and platform settings are admin-only
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}