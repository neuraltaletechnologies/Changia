import { Campaign, formatTZS } from "@/lib/dashboard/mock-data";
import { Progress } from "@/components/dashboard/ui/progress";
import { Badge } from "@/components/dashboard/ui/badge";
import { cn } from "@/lib/dashboard/utils";

const statusMap = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft: { label: "Draft", className: "bg-slate-50 text-slate-600 border-slate-200" },
  completed: { label: "Completed", className: "bg-sky-50 text-sky-700 border-sky-200" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  const s = statusMap[campaign.status];

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-foreground leading-snug flex-1">{campaign.name}</p>
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
  );
}
