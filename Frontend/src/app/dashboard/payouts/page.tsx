"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HandCoins,
  Loader2,
  Wallet,
  RefreshCw,
  History,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { Label } from "@/components/dashboard/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  payoutApi,
  formatTZSFull,
  type PayoutRecord,
  type ReviewTrailEntry,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";
import { ReviewTimeline } from "@/components/dashboard/widgets/review-timeline";

const STATUS_META: Record<PayoutRecord["status"], { label: string; styles: string }> = {
  REQUESTED: { label: "In first review", styles: "bg-orange-50 text-orange-700 border-orange-200" },
  REVIEWED: { label: "Awaiting final approval", styles: "bg-violet-50 text-violet-700 border-violet-200" },
  APPROVED: { label: "Approved", styles: "bg-sky-50 text-sky-700 border-sky-200" },
  PAID: { label: "Paid", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", styles: "bg-rose-50 text-rose-700 border-rose-200" },
};

const STATUS_ORDER: PayoutRecord["status"][] = [
  "REQUESTED",
  "REVIEWED",
  "APPROVED",
  "PAID",
  "REJECTED",
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-TZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PayoutsPage() {
  const { isSuperAdmin } = useRole();

  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | PayoutRecord["status"]>("ALL");

  // Mark-paid dialog state
  const [payingFor, setPayingFor] = useState<PayoutRecord | null>(null);
  const [gatewayRef, setGatewayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [acting, setActing] = useState(false);

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: payouts.length };
    for (const s of STATUS_ORDER) c[s] = payouts.filter((p) => p.status === s).length;
    return c;
  }, [payouts]);

  const openPay = (payout: PayoutRecord) => {
    setGatewayRef("");
    setPayNotes("");
    setPayingFor(payout);
  };

  const submitPay = async () => {
    if (!payingFor) return;
    setActing(true);
    setActionError(null);
    try {
      await payoutApi.markPaid(payingFor.id, {
        gatewayRef: gatewayRef.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      setPayingFor(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/campaigns/approvals" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Approvals
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record gateway transfers for approved payouts and review the full disbursement history.
            Requests are made from a campaign&rsquo;s Payout tab; approvals happen on the Approvals page.
          </p>
        </div>
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
      {actionError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm px-4 py-3">
          {actionError}
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Requested</th>
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
                filtered.map((p) => {
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
                          {p.status === "APPROVED" && isSuperAdmin && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openPay(p)}
                            >
                              <Wallet className="w-3 h-3 mr-1 text-emerald-600" />
                              Mark Paid
                            </Button>
                          )}
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

      {/* Mark-paid dialog */}
      <Dialog
        open={payingFor !== null}
        onOpenChange={(open) => {
          if (!open) setPayingFor(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark payout as paid</DialogTitle>
            <DialogDescription>
              {payingFor
                ? `${formatTZSFull(payingFor.amount)} for ${
                    payingFor.campaignName ?? "organisation"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payout-gateway-ref">Gateway reference (optional)</Label>
              <Input
                id="payout-gateway-ref"
                placeholder="e.g. Mobile money / bank reference"
                value={gatewayRef}
                onChange={(e) => setGatewayRef(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-paid-notes">Notes (optional)</Label>
              <Textarea
                id="payout-paid-notes"
                placeholder="Any notes to record against this transfer"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitPay} disabled={acting}>
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : (
                <HandCoins className="w-3.5 h-3.5 mr-1.5" />
              )}
              Mark Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
