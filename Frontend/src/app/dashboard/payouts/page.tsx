"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  History,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  payoutApi,
  formatTZSFull,
  type PayoutRecord,
  type ReviewTrailEntry,
} from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";
import { ReviewTimeline } from "@/components/dashboard/widgets/review-timeline";
import { ExportMenu } from "@/components/dashboard/export-menu";
import {
  SortableTh,
  useTableSort,
  type SortAccessors,
} from "@/components/dashboard/ui/sortable-table";

const STATUS_META: Record<PayoutRecord["status"], { label: string; styles: string }> = {
  REQUESTED: { label: "In first review", styles: "bg-orange-50 text-orange-700 border-orange-200" },
  REVIEWED: { label: "Awaiting final approval", styles: "bg-violet-50 text-violet-700 border-violet-200" },
  APPROVED: { label: "On hold — awaiting manager confirmation", styles: "bg-amber-50 text-amber-700 border-amber-200" },
  PAID: { label: "Released", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", styles: "bg-rose-50 text-rose-700 border-rose-200" },
};

const STATUS_ORDER: PayoutRecord["status"][] = [
  "REQUESTED",
  "REVIEWED",
  "APPROVED",
  "PAID",
  "REJECTED",
];

type PayoutColumn = "campaign" | "amount" | "reason" | "status" | "requested";

const payoutColumnAccessors: SortAccessors<PayoutRecord, PayoutColumn> = {
  campaign: (p) => p.campaignName?.toLowerCase() ?? "",
  amount: (p) => p.amount ?? 0,
  reason: (p) => p.reason?.toLowerCase() ?? "",
  status: (p) => {
    const i = STATUS_ORDER.indexOf(p.status);
    return i === -1 ? STATUS_ORDER.length : i;
  },
  requested: (p) => (p.createdAt ? Date.parse(p.createdAt) : 0),
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-TZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | PayoutRecord["status"]>("ALL");

  // History dialog state
  const [historyFor, setHistoryFor] = useState<PayoutRecord | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ReviewTrailEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const openHistory = async (payout: PayoutRecord) => {
    setHistoryFor(payout);
    setHistoryEntries(null);
    setHistoryError(null);
    try {
      setHistoryEntries(await payoutApi.history(payout.id));
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Failed to load the payout history.");
    }
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await payoutApi.list({ limit: 100 });
      setPayouts(result.payouts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payouts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? payouts : payouts.filter((p) => p.status === statusFilter)),
    [payouts, statusFilter]
  );

  const {
    sorted: sortedPayouts,
    sort: colSort,
    toggle: toggleColSort,
  } = useTableSort(filtered, payoutColumnAccessors);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: payouts.length };
    for (const s of STATUS_ORDER) c[s] = payouts.filter((p) => p.status === s).length;
    return c;
  }, [payouts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/approvals" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Approvals
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every payout across the platform and its full disbursement history. Requests
            are made from a campaign&rsquo;s Payout tab, approvals happen on the Approvals
            page, and the requesting manager confirms the release once it&rsquo;s approved.
          </p>
        </div>
        <ExportMenu
          dataset="payouts"
          params={{ status: statusFilter !== "ALL" ? statusFilter : undefined }}
        />
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1 transition-all",
            statusFilter === "ALL"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <span>All</span>
          <span className="opacity-70">({counts.ALL})</span>
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter((prev) => (prev === s ? "ALL" : s))}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1 transition-all",
              statusFilter === s
                ? STATUS_META[s].styles
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="capitalize">{STATUS_META[s].label}</span>
            <span className="opacity-70">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Error banners */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <SortableTh sortKey="campaign" sort={colSort} onSort={toggleColSort} className="px-5 py-3 font-medium text-left">
                  Campaign
                </SortableTh>
                <SortableTh sortKey="amount" sort={colSort} onSort={toggleColSort} className="px-4 py-3 font-medium text-left">
                  Amount
                </SortableTh>
                <SortableTh sortKey="reason" sort={colSort} onSort={toggleColSort} className="px-4 py-3 font-medium text-left hidden md:table-cell">
                  Reason
                </SortableTh>
                <SortableTh sortKey="status" sort={colSort} onSort={toggleColSort} className="px-4 py-3 font-medium text-left">
                  Status
                </SortableTh>
                <SortableTh sortKey="requested" sort={colSort} onSort={toggleColSort} className="px-4 py-3 font-medium text-left hidden lg:table-cell">
                  Requested
                </SortableTh>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Loading payouts…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No payouts to show.
                  </td>
                </tr>
              )}
              {!loading &&
                sortedPayouts.map((p) => {
                  const meta = STATUS_META[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      {/* Campaign */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground">
                          {p.campaignName ?? "—"}
                        </p>
                        {p.campaignId && (
                          <p className="text-[11px] text-muted-foreground">
                            #{p.campaignId}
                          </p>
                        )}
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-foreground">
                          {formatTZSFull(p.amount)}
                        </span>
                      </td>
                      {/* Reason */}
                      <td className="px-4 py-3.5 hidden md:table-cell max-w-xs">
                        <p className="text-xs text-muted-foreground truncate" title={p.reason ?? undefined}>
                          {p.reason || "—"}
                        </p>
                        {p.proofImages.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.proofImages.map((img) => (
                              <a
                                key={img.id}
                                href={img.url}
                                target="_blank"
                                rel="noreferrer"
                                title="Open proof of use"
                                className="h-9 w-9 rounded overflow-hidden border border-border hover:ring-2 hover:ring-primary/40"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt="Payout proof" className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize whitespace-nowrap",
                            meta.styles
                          )}
                        >
                          {meta.label}
                        </span>
                      </td>
                      {/* Requested */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                          {fmtDate(p.createdAt)}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => openHistory(p)}
                            title="View review history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {payouts.length} requests
          </p>
          <Button size="xs" variant="ghost" onClick={() => load()} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* History dialog */}
      <Dialog
        open={historyFor !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryFor(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Payout history
            </DialogTitle>
            <DialogDescription>
              {historyFor
                ? `${formatTZSFull(historyFor.amount)} for ${
                    historyFor.campaignName ?? "organisation"
                  } — every step, most recent first.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {historyError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">
              {historyError}
            </div>
          ) : historyEntries === null ? (
            <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
          ) : (
            <ReviewTimeline entries={historyEntries} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
