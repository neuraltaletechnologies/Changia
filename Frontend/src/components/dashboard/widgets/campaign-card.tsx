import Link from "next/link";
import { Campaign, formatTZS } from "@/lib/dashboard/types";
import { Progress } from "@/components/dashboard/ui/progress";
import { Badge } from "@/components/dashboard/ui/badge";
import { cn } from "@/lib/dashboard/utils";

export const campaignStatusMap: Record<Campaign["status"], { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DRAFT: { label: "Draft", className: "bg-slate-50 text-slate-600 border-slate-200" },
  COMPLETED: { label: "Completed", className: "bg-sky-50 text-sky-700 border-sky-200" },
  PAUSED: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING: { label: "Pending Approval", className: "bg-orange-50 text-orange-700 border-orange-200" },
  REVIEWED: { label: "Awaiting 2nd Approval", className: "bg-blue-50 text-blue-700 border-blue-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  const s = campaignStatusMap[campaign.status];

  return (
    <Link
      href={`/dashboard/campaigns/${campaign.id}`}
      className="block bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
    >
      {campaign.image && (
        // Plain <img>, not next/image — the cover is served from the
        // backend's own /uploads/ origin, which isn't in next.config.mjs's
        // remotePatterns allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.image}
          alt={campaign.name}
          className="h-32 w-full object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">{campaign.name}</p>
            {campaign.organizationName && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {campaign.organizationName}
              </p>
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium border rounded-full px-2 py-0.5 shrink-0",
              s.className
            )}
          >
            {s.label}
          </span>
        </div>
        <div className="mb-2.5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-medium text-foreground">{formatTZS(campaign.raised)}</span>
            <span>of {formatTZS(campaign.goal)}</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{pct}% funded</span>
          <span>{campaign.donors.toLocaleString()} donors</span>
        </div>
      </div>
    </Link>
  );
}
