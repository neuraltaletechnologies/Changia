"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HandCoins,
  Plus,
  Loader2,
  Check,
  X,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
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
  campaignApi,
  formatTZSFull,
  type PayoutRecord,
  type CampaignRecord,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";

const STATUS_META: Record<PayoutRecord["status"], { label: string; styles: string }> = {
  REQUESTED: { label: "Requested", styles: "bg-orange-50 text-orange-700 border-orange-200" },
  APPROVED: { label: "Approved", styles: "bg-sky-50 text-sky-700 border-sky-200" },
  PAID: { label: "Paid", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", styles: "bg-rose-50 text-rose-700 border-rose-200" },
};

const STATUS_ORDER: PayoutRecord["status"][] = ["REQUESTED", "APPROVED", "PAID", "REJECTED"];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-TZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type DecisionKind = "approve" | "reject" | "paid";

export default function PayoutsPage() {
  const { hasPermission, isSuperAdmin, isOrgAdmin } = useRole();
  const canRequest = hasPermission("payout:request");
  const isAdmin = isSuperAdmin || isOrgAdmin;

  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | PayoutRecord["status"]>("ALL");

  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [campaignIdStr, setCampaignIdStr] = useState("none");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Decision dialog state (approve / reject / mark paid)
  const [action, setAction] = useState<{ kind: DecisionKind; payout: PayoutRecord } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [gatewayRef, setGatewayRef] = useState("");
  const [acting, setActing] = useState(false);

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

  const loadCampaigns = useCallback(async () => {
    try {
      const result = await campaignApi.list({ limit: 100 });
      setCampaigns(result.campaigns);
    } catch {
      setCampaigns([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadCampaigns();
  }, [load, loadCampaigns]);

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? payouts : payouts.filter((p) => p.status === statusFilter)),
    [payouts, statusFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: payouts.length };
    for (const s of STATUS_ORDER) c[s] = payouts.filter((p) => p.status === s).length;
    return c;
  }, [payouts]);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const openCreate = () => {
    setAmount("");
    setCampaignIdStr("none");
    setReason("");
    setNotes("");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      setActionError("Enter a valid withdrawal amount.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await payoutApi.create({
        amount: amt,
        campaignId:
          campaignIdStr && campaignIdStr !== "none" ? Number(campaignIdStr) : undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to request payout.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDecision = (kind: DecisionKind, payout: PayoutRecord) => {
    setActionNotes("");
    setGatewayRef("");
    setAction({ kind, payout });
  };

  const submitDecision = async () => {
    if (!action) return;
    setActing(true);
    setActionError(null);
    try {
      if (action.kind === "approve") {
        await payoutApi.approve(action.payout.id, actionNotes.trim() || undefined);
      } else if (action.kind === "reject") {
        await payoutApi.reject(action.payout.id, actionNotes.trim() || undefined);
      } else {
        await payoutApi.markPaid(action.payout.id, {
          gatewayRef: gatewayRef.trim() || undefined,
          notes: actionNotes.trim() || undefined,
        });
      }
      setAction(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  const decisionTitle =
    action?.kind === "approve"
      ? "Approve payout"
      : action?.kind === "reject"
        ? "Reject payout"
        : "Mark payout as paid";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Payouts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Withdraw raised funds &mdash; request, approve and track disbursements
          </p>
        </div>
        {canRequest && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Request Payout
          </Button>
        )}
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
                    No payouts yet. Use the &ldquo;Request Payout&rdquo; button to withdraw raised funds.
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
                          {p.status === "REQUESTED" && isAdmin && (
                            <>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => openDecision("approve", p)}
                              >
                                <Check className="w-3 h-3 mr-1 text-emerald-600" />
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => openDecision("reject", p)}
                              >
                                <X className="w-3 h-3 mr-1 text-rose-500" />
                                Reject
                              </Button>
                            </>
                          )}
                          {p.status === "APPROVED" && isSuperAdmin && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openDecision("paid", p)}
                            >
                              <Wallet className="w-3 h-3 mr-1 text-emerald-600" />
                              Mark Paid
                            </Button>
                          )}
                          {p.status !== "REQUESTED" && p.status !== "APPROVED" && (
                            <span className="text-[11px] text-muted-foreground">—</span>
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
          <Button
            size="xs"
            variant="ghost"
            onClick={() => run(() => load())}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-amber-600" />
              Request Payout
            </DialogTitle>
            <DialogDescription>
              Withdraw raised funds from your organisation. Optionally link the
              request to a campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payout-amount">Amount (TZS)</Label>
              <Input
                id="payout-amount"
                type="number"
                min={1}
                placeholder="e.g. 500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Campaign (optional)</Label>
              <Select
                value={campaignIdStr}
                onValueChange={(v) => setCampaignIdStr(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No campaign (org-level withdrawal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payout-reason">Reason (optional)</Label>
              <Textarea
                id="payout-reason"
                placeholder="Why are you withdrawing these funds?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payout-notes">Notes (optional)</Label>
              <Textarea
                id="payout-notes"
                placeholder="Any internal notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Request Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision dialog */}
      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{decisionTitle}</DialogTitle>
            <DialogDescription>
              {action
                ? `${formatTZSFull(action.payout.amount)} for ${
                    action.payout.campaignName ?? "organisation"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action?.kind === "paid" && (
              <div className="space-y-1.5">
                <Label htmlFor="payout-gateway-ref">Gateway reference (optional)</Label>
                <Input
                  id="payout-gateway-ref"
                  placeholder="e.g. Mobile money / bank reference"
                  value={gatewayRef}
                  onChange={(e) => setGatewayRef(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="payout-decision-notes">
                {action?.kind === "reject" ? "Reason for rejection" : "Notes (optional)"}
              </Label>
              <Textarea
                id="payout-decision-notes"
                placeholder={
                  action?.kind === "reject"
                    ? "Explain why this request was rejected"
                    : "Any notes to record against this request"
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant={action?.kind === "reject" ? "destructive" : "default"}
              onClick={submitDecision}
              disabled={acting}
            >
              {acting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : null}
              {action?.kind === "approve"
                ? "Approve"
                : action?.kind === "reject"
                  ? "Reject"
                  : "Mark Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
