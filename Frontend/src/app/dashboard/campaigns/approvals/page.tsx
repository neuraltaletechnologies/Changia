"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  campaignApi,
  payoutApi,
  formatTZSFull,
  type CampaignRecord,
  type PayoutRecord,
  type ReviewAction,
} from "@/lib/dashboard/api";
import { Button } from "@/components/dashboard/ui/button";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import {
  ArrowLeft,
  Ban,
  Check,
  Clock,
  FileText,
  HandCoins,
  Loader2,
  Megaphone,
  PencilRuler,
  ShieldCheck,
} from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";
import { ReviewDecisionDialog } from "@/components/dashboard/campaigns/review-decision-dialog";
import { PendingResendsPanel } from "@/components/dashboard/reminders/pending-resends-panel";

const SUMMARY_ITEMS = [
  { key: "campaigns", label: "Campaigns", icon: Megaphone, color: "text-orange-500" },
  { key: "edits", label: "Edits", icon: PencilRuler, color: "text-sky-500" },
  { key: "payouts", label: "Payouts", icon: HandCoins, color: "text-teal-500" },
  { key: "fees", label: "Fees", icon: ShieldCheck, color: "text-amber-500" },
  { key: "closures", label: "Closures", icon: Ban, color: "text-rose-500" },
  { key: "reports", label: "Reports", icon: FileText, color: "text-violet-500" },
] as const;

type DialogTarget =
  | { kind: "campaign"; id: number; action: Exclude<ReviewAction, "approve"> }
  | {
      kind: "change-request";
      id: number;
      requestId: number;
      action: Exclude<ReviewAction, "approve">;
    }
  | { kind: "fee"; id: number; action: Exclude<ReviewAction, "approve"> }
  | { kind: "payout"; id: number; action: "reject" };

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  story: "Story",
  goalAmount: "Goal amount",
  serviceFeePercent: "Service fee %",
  category: "Category",
  startDate: "Start date",
  endDate: "End date",
  minimumAmount: "Minimum amount",
  contactPhone: "Contact phone",
};

export default function CampaignApprovalsPage() {
  const {
    user,
    canReviewCampaign,
    canFinalApproveCampaign,
    canReviewPayout,
    canFinalApprovePayout,
    isSuperAdmin,
    hasPermission,
  } = useRole();
  const uid = user ? String(user.id) : null;
  const seesPayouts = canReviewPayout || canFinalApprovePayout;
  const seesReminders = hasPermission("reminder:manage");

  const [all, setAll] = useState<CampaignRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [reminderCount, setReminderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [res, payoutRes] = await Promise.all([
        campaignApi.list({ limit: 100 }),
        seesPayouts
          ? payoutApi.list({ limit: 100 }).catch(() => null)
          : Promise.resolve(null),
      ]);
      setAll(res.campaigns);
      if (payoutRes) setPayouts(payoutRes.payouts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending items.");
    } finally {
      setLoading(false);
    }
  }, [seesPayouts]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Queues ────────────────────────────────────────────────────────────────
  const stage1Campaigns = useMemo(
    () =>
      all.filter(
        (c) =>
          c.status === "PENDING" &&
          // A campaign that was just sent back sits at PENDING + CHANGES_REQUESTED
          // until the manager re-edits and resubmits — it's not our queue yet.
          c.reviewState !== "CHANGES_REQUESTED" &&
          (canReviewCampaign || isSuperAdmin) &&
          String(c.createdBy ?? "") !== uid
      ),
    [all, canReviewCampaign, isSuperAdmin, uid]
  );
  const stage2Campaigns = useMemo(
    () =>
      all.filter(
        (c) =>
          c.status === "REVIEWED" &&
          (canFinalApproveCampaign || isSuperAdmin) &&
          String(c.firstApprovedBy ?? "") !== uid &&
          String(c.createdBy ?? "") !== uid
      ),
    [all, canFinalApproveCampaign, isSuperAdmin, uid]
  );
  const changeRequests = useMemo(
    () =>
      all
        .filter((c) => c.changeRequest && ["PENDING", "REVIEWED"].includes(c.changeRequest.status))
        .filter((c) => {
          const cr = c.changeRequest!;
          if (cr.status === "PENDING") return canReviewCampaign || isSuperAdmin;
          return (
            (canFinalApproveCampaign || isSuperAdmin) &&
            String(cr.firstApprovedBy ?? "") !== uid
          );
        }),
    [all, canReviewCampaign, canFinalApproveCampaign, isSuperAdmin, uid]
  );
  const feeProposals = useMemo(() => all.filter((c) => c.feeStatus === "PENDING"), [all]);

  // ── Closure requests + completion reports — reviewed in full context on the
  //    campaign page, so here we just surface the queue and link through.
  const closureReviews = useMemo(
    () =>
      all.filter(
        (c) => c.latestClosureRequest && c.latestClosureRequest.status === "PENDING"
      ),
    [all]
  );
  const reportReviews = useMemo(
    () =>
      all.filter(
        (c) => c.completionReport && c.completionReport.status === "PENDING_REVIEW"
      ),
    [all]
  );

  // ── Payout queues — the same two-stage chain as campaigns.
  //    Stage 1: a reviewer's first review of a REQUESTED payout.
  //    Stage 2: an org admin's final approval of one that cleared first review.
  const stage1Payouts = useMemo(
    () =>
      payouts.filter(
        (p) =>
          p.status === "REQUESTED" &&
          (canReviewPayout || isSuperAdmin) &&
          String(p.requestedBy ?? "") !== uid
      ),
    [payouts, canReviewPayout, isSuperAdmin, uid]
  );
  const stage2Payouts = useMemo(
    () =>
      payouts.filter(
        (p) =>
          p.status === "REVIEWED" &&
          (canFinalApprovePayout || isSuperAdmin) &&
          String(p.firstApprovedBy ?? "") !== uid &&
          String(p.requestedBy ?? "") !== uid
      ),
    [payouts, canFinalApprovePayout, isSuperAdmin, uid]
  );

  // ── Approved payouts still awaiting the gateway transfer — only SUPER_ADMIN
  //    records this final "paid" step, and it happens on the slim payouts page.
  const payoutsToPay = useMemo(
    () => (isSuperAdmin ? payouts.filter((p) => p.status === "APPROVED") : []),
    [payouts, isSuperAdmin]
  );

  // ── Counts per request type, for the summary bar at the top of the page ────
  const counts = {
    campaigns: stage1Campaigns.length + stage2Campaigns.length,
    edits: changeRequests.length,
    payouts: stage1Payouts.length + stage2Payouts.length + payoutsToPay.length,
    fees: feeProposals.length,
    closures: closureReviews.length,
    reports: reportReviews.length,
  };

  const totalPending =
    counts.campaigns +
    counts.edits +
    counts.payouts +
    counts.fees +
    counts.closures +
    counts.reports +
    reminderCount;

  // ── Actions ───────────────────────────────────────────────────────────────
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setActingId(key);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActingId(null);
    }
  };

  const submitDialog = async (notes: string) => {
    if (!dialog) return;
    setDialogSubmitting(true);
    try {
      if (dialog.kind === "campaign") {
        if (dialog.action === "reject") await campaignApi.reject(dialog.id, notes);
        else await campaignApi.requestChanges(dialog.id, notes);
      } else if (dialog.kind === "change-request") {
        await campaignApi.decideChangeRequest(dialog.id, dialog.requestId, {
          action: dialog.action,
          notes,
        });
      } else if (dialog.kind === "payout") {
        await payoutApi.reject(dialog.id, notes);
      } else {
        await campaignApi.reviewFee(dialog.id, { action: dialog.action, notes });
      }
      setDialog(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setDialogSubmitting(false);
    }
  };

  const ActionRow = ({
    approveLabel,
    onApprove,
    onRequestChanges,
    onReject,
    busyKey,
  }: {
    approveLabel: string;
    onApprove: () => void;
    onRequestChanges: () => void;
    onReject: () => void;
    busyKey: string;
  }) => (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <Button size="sm" variant="outline" onClick={onRequestChanges}>
        Request changes
      </Button>
      <Button size="sm" variant="destructive" onClick={onReject}>
        Reject
      </Button>
      <Button size="sm" onClick={onApprove} disabled={actingId === busyKey}>
        {actingId === busyKey ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5 mr-1" />
        )}
        {approveLabel}
      </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campaign Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalPending} item{totalPending !== 1 ? "s" : ""} awaiting your review
            {" · "}open any campaign to review it in full context.
          </p>
        </div>
      </div>

      {/* ── Summary bar — counts by request type, jumps to each section ──── */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {SUMMARY_ITEMS.map((s) => {
            const v = counts[s.key];
            return (
              <a
                key={s.key}
                href={`#${s.key}`}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                  v > 0
                    ? "border-border bg-card hover:border-primary/40"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                <s.icon className={cn("h-3.5 w-3.5", v > 0 ? s.color : "text-muted-foreground/50")} />
                <span className="font-medium text-foreground">{s.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    v > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {v}
                </span>
              </a>
            );
          })}
        </div>
      )}

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
      ) : totalPending === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Megaphone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nothing is waiting for your approval.</p>
        </div>
      ) : null}

      <span id="campaigns" className="block scroll-mt-24" aria-hidden />

      {/* ── Stage 1: first review ─────────────────────────────────────────── */}
      {stage1Campaigns.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={Clock}
            title="Awaiting first review"
            sub="New campaigns needing a reviewer's first approval."
          />
          {stage1Campaigns.map((c) => (
            <CampaignCard key={c.id} c={c} badge="Awaiting 1st approval" badgeTone="orange">
              <ActionRow
                approveLabel="Give first approval"
                busyKey={`c-${c.id}`}
                onApprove={() => run(`c-${c.id}`, () => campaignApi.approve(c.id))}
                onRequestChanges={() =>
                  setDialog({ kind: "campaign", id: c.id, action: "request_changes" })
                }
                onReject={() => setDialog({ kind: "campaign", id: c.id, action: "reject" })}
              />
            </CampaignCard>
          ))}
        </section>
      )}

      {/* ── Stage 2: final approval ───────────────────────────────────────── */}
      {stage2Campaigns.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={ShieldCheck}
            title="Awaiting final approval"
            sub="First review done — an admin gives the decisive approval."
          />
          {stage2Campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              c={c}
              badge="1st approval done — needs a different final approver"
              badgeTone="blue"
            >
              <ActionRow
                approveLabel="Give final approval"
                busyKey={`c-${c.id}`}
                onApprove={() => run(`c-${c.id}`, () => campaignApi.approve(c.id))}
                onRequestChanges={() =>
                  setDialog({ kind: "campaign", id: c.id, action: "request_changes" })
                }
                onReject={() => setDialog({ kind: "campaign", id: c.id, action: "reject" })}
              />
            </CampaignCard>
          ))}
        </section>
      )}

      <span id="edits" className="block scroll-mt-24" aria-hidden />

      {/* ── Campaign changes (parked material edits) ──────────────────────── */}
      {changeRequests.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={PencilRuler}
            title="Campaign changes"
            sub="Edits to live campaigns, and manager requests to suspend or resume a campaign — nothing takes effect until both approvals clear."
          />
          {changeRequests.map((c) => {
            const cr = c.changeRequest!;
            const stage2 = cr.status === "REVIEWED";
            const isStatusReq = cr.kind === "STATUS";
            return (
              <div
                key={c.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/campaigns/${c.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                    {c.organizationName && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.organizationName}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium border rounded-full px-2 py-0.5 shrink-0 ${
                      stage2
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-orange-50 text-orange-700 border-orange-200"
                    }`}
                  >
                    {stage2 ? "Needs final approval" : "Needs first review"}
                  </span>
                </div>
                {isStatusReq ? (
                  <div className="text-[12px] space-y-1">
                    <p className="font-medium text-foreground">
                      Requested:{" "}
                      {cr.statusAction === "PAUSE" ? "Suspend campaign" : "Resume campaign"}
                    </p>
                    {cr.payload.reason && (
                      <p className="text-muted-foreground">Reason: {String(cr.payload.reason)}</p>
                    )}
                  </div>
                ) : (
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
                    {Object.entries(cr.payload).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">{FIELD_LABELS[k] ?? k}:</dt>
                        <dd className="font-medium text-foreground truncate">{String(v)}</dd>
                      </div>
                    ))}
                    {cr.hasStagedCover && (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Cover image:</dt>
                        <dd className="font-medium text-foreground">new image staged</dd>
                      </div>
                    )}
                  </dl>
                )}
                <div className="flex justify-end">
                  <ActionRow
                    approveLabel={stage2 ? "Give final approval" : "Give first approval"}
                    busyKey={`cr-${cr.id}`}
                    onApprove={() =>
                      run(`cr-${cr.id}`, () =>
                        campaignApi.decideChangeRequest(c.id, cr.id, { action: "approve" })
                      )
                    }
                    onRequestChanges={() =>
                      setDialog({
                        kind: "change-request",
                        id: c.id,
                        requestId: cr.id,
                        action: "request_changes",
                      })
                    }
                    onReject={() =>
                      setDialog({
                        kind: "change-request",
                        id: c.id,
                        requestId: cr.id,
                        action: "reject",
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <span id="fees" className="block scroll-mt-24" aria-hidden />

      {/* ── Service-fee proposals ─────────────────────────────────────────── */}
      {feeProposals.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={ShieldCheck}
            title="Service-fee proposals"
            sub="Custom fee rates a manager proposed instead of the org default."
          />
          {feeProposals.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                  {c.organizationName && <span className="font-medium">{c.organizationName}</span>}
                  <span>
                    Proposed{" "}
                    <span className="font-medium text-amber-600">
                      {c.proposedServiceFeePercent}%
                    </span>{" "}
                    (current {c.serviceFeePercent}%)
                  </span>
                  <span>{formatTZSFull(c.goalAmount)} goal</span>
                </div>
              </div>
              <ActionRow
                approveLabel="Approve rate"
                busyKey={`fee-${c.id}`}
                onApprove={() =>
                  run(`fee-${c.id}`, () => campaignApi.reviewFee(c.id, { action: "approve" }))
                }
                onRequestChanges={() =>
                  setDialog({ kind: "fee", id: c.id, action: "request_changes" })
                }
                onReject={() => setDialog({ kind: "fee", id: c.id, action: "reject" })}
              />
            </div>
          ))}
        </section>
      )}

      <span id="payouts" className="block scroll-mt-24" aria-hidden />

      {/* ── Payout approvals — a distinct area from campaign approvals ─────── */}
      {seesPayouts && (
        <section className="space-y-3">
          <SectionHeading
            icon={HandCoins}
            title="Payout approvals"
            sub="Withdrawal requests move through the same two-stage chain as campaigns — a reviewer's first approval, then an admin's final approval, then payment."
          />
          {counts.payouts === 0 && (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              No payout requests are waiting for your approval.
            </div>
          )}
        </section>
      )}

      {/* ── Payout requests — first review ────────────────────────────────── */}
      {stage1Payouts.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={HandCoins}
            title="Payout requests — first review"
            sub="Withdrawal requests needing a reviewer's first approval before an admin signs off."
          />
          {stage1Payouts.map((p) => (
            <PayoutCard
              key={p.id}
              p={p}
              stage={1}
              busy={actingId === `p-${p.id}`}
              onApprove={() => run(`p-${p.id}`, () => payoutApi.approve(p.id))}
              onReject={() => setDialog({ kind: "payout", id: p.id, action: "reject" })}
            />
          ))}
        </section>
      )}

      {/* ── Payout requests — final approval ──────────────────────────────── */}
      {stage2Payouts.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={HandCoins}
            title="Payout requests — final approval"
            sub="First review done — an admin gives the decisive approval before the funds can be paid."
          />
          {stage2Payouts.map((p) => (
            <PayoutCard
              key={p.id}
              p={p}
              stage={2}
              busy={actingId === `p-${p.id}`}
              onApprove={() => run(`p-${p.id}`, () => payoutApi.approve(p.id))}
              onReject={() => setDialog({ kind: "payout", id: p.id, action: "reject" })}
            />
          ))}
        </section>
      )}

      {/* ── Approved payouts — record the gateway transfer ────────────────── */}
      {payoutsToPay.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={HandCoins}
            title="Approved payouts — mark as paid"
            sub="Both approvals are done. Record the gateway transfer on the payouts page to close each one out."
          />
          {payoutsToPay.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {p.campaignName ?? `Campaign #${p.campaignId ?? "—"}`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200">
                    Approved — awaiting payment
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatTZSFull(p.amount)}</span>
                  {p.reason && <span className="ml-3 truncate">{p.reason}</span>}
                </div>
              </div>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/payouts" />}
              >
                Mark as paid
              </Button>
            </div>
          ))}
        </section>
      )}

      <span id="closures" className="block scroll-mt-24" aria-hidden />

      {/* ── Closure requests — reviewed in full context on the campaign ───── */}
      {closureReviews.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={Ban}
            title="Closure requests"
            sub="Managers asking to end a campaign early — open each campaign to review the reason and decide."
          />
          {closureReviews.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {c.organizationName && <span className="font-medium">{c.organizationName} · </span>}
                  {c.latestClosureRequest?.reason && (
                    <span className="truncate">“{c.latestClosureRequest.reason}”</span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={`/dashboard/campaigns/${c.id}`} />}
              >
                Review on campaign
              </Button>
            </div>
          ))}
        </section>
      )}

      <span id="reports" className="block scroll-mt-24" aria-hidden />

      {/* ── Completion reports — reviewed in full context on the campaign ─── */}
      {reportReviews.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={FileText}
            title="Completion reports"
            sub="Reports submitted after a campaign ends — open each campaign to review the report and record your decision."
          />
          {reportReviews.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {c.organizationName && <span className="font-medium">{c.organizationName} · </span>}
                  {c.completionReport?.submittedAt && (
                    <span>
                      Submitted {new Date(c.completionReport.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={`/dashboard/campaigns/${c.id}`} />}
              >
                Review on campaign
              </Button>
            </div>
          ))}
        </section>
      )}

      {/* ── Pending reminder resends ──────────────────────────────────────── */}
      {seesReminders && (
        <PendingResendsPanel hideWhenEmpty onLoaded={setReminderCount} />
      )}

      {dialog && (
        <ReviewDecisionDialog
          open
          onOpenChange={(v) => !v && setDialog(null)}
          action={dialog.action}
          title={dialog.kind === "payout" ? "Reject payout request" : undefined}
          description={
            dialog.kind === "payout"
              ? "The requester is notified with your reason. They can submit a new request afterwards."
              : undefined
          }
          submitting={dialogSubmitting}
          onSubmit={submitDialog}
        />
      )}
    </div>
  );
}

function PayoutCard({
  p,
  stage,
  busy,
  onApprove,
  onReject,
}: {
  p: PayoutRecord;
  stage: 1 | 2;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {p.campaignId ? (
            <Link
              href={`/dashboard/campaigns/${p.campaignId}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {p.campaignName ?? `Campaign #${p.campaignId}`}
            </Link>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {p.campaignName ?? "Organisation payout"}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 ${
              stage === 2
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-orange-50 text-orange-700 border-orange-200"
            }`}
          >
            {stage === 2 ? "1st approval done — needs a different final approver" : "Awaiting 1st approval"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{formatTZSFull(p.amount)}</span>
          {p.reason && <span className="truncate max-w-xs">{p.reason}</span>}
        </div>
        {p.campaignId && (
          <Link
            href={`/dashboard/campaigns/${p.campaignId}`}
            className="inline-block text-[11px] font-medium text-primary hover:underline mt-2"
          >
            Open campaign for context →
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button size="sm" variant="destructive" onClick={onReject}>
          Reject
        </Button>
        <Button size="sm" onClick={onApprove} disabled={busy}>
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1" />
          )}
          {stage === 2 ? "Give final approval" : "Give first approval"}
        </Button>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function CampaignCard({
  c,
  badge,
  badgeTone,
  children,
}: {
  c: CampaignRecord;
  badge: string;
  badgeTone: "orange" | "blue";
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
      {c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/campaigns/${c.id}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {c.name}
          </Link>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 ${
              badgeTone === "blue"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-orange-50 text-orange-700 border-orange-200"
            }`}
          >
            {badge}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
          {c.organizationName && <span className="font-medium">{c.organizationName}</span>}
          {c.category && <span>{c.category}</span>}
          <span>{formatTZSFull(c.publicTarget)} target</span>
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
        {c.reviewNotes && c.reviewState === "CHANGES_REQUESTED" && (
          <p className="text-[11px] text-amber-600 mt-2">
            Previously sent back: “{c.reviewNotes}”
          </p>
        )}
        <Link
          href={`/dashboard/campaigns/${c.id}`}
          className="inline-block text-[11px] font-medium text-primary hover:underline mt-2"
        >
          Open campaign to review →
        </Link>
      </div>
      {children}
    </div>
  );
}
