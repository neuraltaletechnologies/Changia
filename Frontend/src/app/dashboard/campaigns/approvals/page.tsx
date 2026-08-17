"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { campaignApi, formatTZSFull, type CampaignRecord } from "@/lib/dashboard/api";
import { Button } from "@/components/dashboard/ui/button";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { ArrowLeft, Check, Clock, Loader2, Megaphone, X } from "lucide-react";
import { cn } from "@/lib/dashboard/utils";

export default function CampaignApprovalsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await campaignApi.list({ status: "PENDING", limit: 100 });
      setCampaigns(result.campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: number) => {
    setActingId(id);
    try {
      await campaignApi.approve(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve campaign.");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: number) => {
    setActingId(id);
    try {
      await campaignApi.changeStatus(id, "CANCELLED");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject campaign.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns" />}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Campaign Approvals
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} pending review
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Megaphone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No campaigns pending approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {c.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="w-full sm:w-20 h-20 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-full sm:w-20 h-20 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                  <Megaphone className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                  >
                    {c.name}
                  </Link>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200 shrink-0">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                  {c.category && <span>{c.category}</span>}
                  <span>{formatTZSFull(c.publicTarget)} target</span>
                  {c.startDate && c.endDate && (
                    <span>
                      {new Date(c.startDate).toLocaleDateString()} →{" "}
                      {new Date(c.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {c.assignments?.[0] && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                        {c.assignments[0].user.firstName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-muted-foreground">
                      {c.assignments[0].user.firstName} {c.assignments[0].user.lastName ?? ""}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/dashboard/campaigns/${c.id}`} />}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actingId === c.id}
                  onClick={() => reject(c.id)}
                >
                  {actingId === c.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5 mr-1" />
                  )}
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={actingId === c.id}
                  onClick={() => approve(c.id)}
                >
                  {actingId === c.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
