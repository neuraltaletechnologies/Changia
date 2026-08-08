import { campaigns, formatTZS } from "@/lib/mock-data";
import { CampaignCard } from "@/components/dashboard/campaign-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
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
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {/* Tabs summary */}
      <div className="flex gap-3 flex-wrap">
        {(["active", "draft", "completed", "paused"] as const).map((status) => {
          const count = campaigns.filter((c) => c.status === status).length;
          const styles: Record<string, string> = {
            active: "bg-emerald-50 text-emerald-700 border-emerald-200",
            draft: "bg-slate-50 text-slate-600 border-slate-200",
            completed: "bg-sky-50 text-sky-700 border-sky-200",
            paused: "bg-amber-50 text-amber-700 border-amber-200",
          };
          return (
            <span
              key={status}
              className={`text-xs font-medium border rounded-full px-3 py-1 capitalize ${styles[status]}`}
            >
              {count} {status}
            </span>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
    </div>
  );
}
