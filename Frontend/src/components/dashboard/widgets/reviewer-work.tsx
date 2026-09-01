"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { CampaignRecord, PayoutRecord } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

interface ReviewerWorkProps {
  campaigns: CampaignRecord[];
  /** Payouts in the same two-stage chain — also this user's review work. */
  payouts?: PayoutRecord[];
  /** Current user's id, for attributing their own decisions. */
  reviewerId: string | null;
  /**
   * Which stage of the approval chain this user owns:
   *   1 — a REVIEWER's first review (PENDING campaigns / PENDING change requests
   *       / REQUESTED payouts)
   *   2 — an ORG_ADMIN's final approval (REVIEWED campaigns / change requests /
   *       payouts that first review has already cleared)
   * Closures and completion reports follow the same two-stage chain
   * (PENDING → REVIEWED). Single-stage reviews (fees) show for both.
   */
  stage?: 1 | 2;
}

const QUEUE_BARS = [
  { key: "campaigns", label: "Campaigns", color: "bg-orange-500" },
  { key: "edits", label: "Edits", color: "bg-sky-500" },
  { key: "payouts", label: "Payouts", color: "bg-teal-500" },
  { key: "fees", label: "Fees", color: "bg-amber-500" },
  { key: "closures", label: "Closures", color: "bg-rose-500" },
  { key: "reports", label: "Reports", color: "bg-violet-500" },
] as const;

/**
 * Snapshot of a reviewer's / org admin's open approval queue by request type
 * (the exact items that land on /dashboard/approvals for them), plus a
 * ring of how their own decisions have progressed. Pure CSS/SVG — mirrors
 * CampaignMix.
 */
export function ReviewerWork({
  campaigns,
  payouts = [],
  reviewerId,
  stage = 1,
}: ReviewerWorkProps) {
  const uid = reviewerId ? String(reviewerId) : null;
  const isFinal = stage === 2;
  const notMe = (id: number | null | undefined) => String(id ?? "") !== uid;
  const isMe = (id: number | null | undefined) => !!uid && String(id ?? "") === uid;

  // ── Open queue — matches this user's stage on the Approvals page and the
  //    sidebar "Approvals" badge (use-pending-approvals). ─────────────────────
  const queue = {
    campaigns: campaigns.filter((c) =>
      isFinal
        ? c.status === "REVIEWED" && notMe(c.firstApprovedBy) && notMe(c.createdBy)
        : c.status === "PENDING" &&
          c.reviewState !== "CHANGES_REQUESTED" &&
          notMe(c.createdBy)
    ).length,
    edits: campaigns.filter((c) => {
      const cr = c.changeRequest;
      if (!cr) return false;
      return isFinal
        ? cr.status === "REVIEWED" && notMe(cr.firstApprovedBy)
        : cr.status === "PENDING";
    }).length,
    payouts: payouts.filter((p) =>
      isFinal
        ? p.status === "REVIEWED" && notMe(p.firstApprovedBy) && notMe(p.requestedBy)
        : p.status === "REQUESTED" && notMe(p.requestedBy)
    ).length,
    fees: campaigns.filter((c) => c.feeStatus === "PENDING").length,
    closures: campaigns.filter((c) => {
      const cr = c.latestClosureRequest;
      if (!cr) return false;
      return isFinal
        ? cr.status === "REVIEWED" && notMe(cr.firstApprovedBy)
        : cr.status === "PENDING";
    }).length,
    reports: campaigns.filter((c) => {
      const r = c.completionReport;
      if (!r) return false;
      return isFinal
        ? r.status === "REVIEWED" && notMe(r.firstReviewedBy)
        : r.status === "PENDING_REVIEW";
    }).length,
  };
  const max = Math.max(...Object.values(queue), 1);
  const openTotal = Object.values(queue).reduce((a, b) => a + b, 0);

  // ── This user's own decisions (campaigns + payouts) ─────────────────────
  const isLive = (s: CampaignRecord["status"]) =>
    s === "ACTIVE" || s === "PAUSED" || s === "COMPLETED";
  const myCampaigns = campaigns.filter((c) =>
    isMe(isFinal ? c.approvedBy : c.firstApprovedBy)
  );
  const myPayouts = payouts.filter((p) =>
    isMe(isFinal ? p.approvedBy : p.firstApprovedBy)
  );
  const cleared =
    myCampaigns.filter((c) => isLive(c.status)).length +
    myPayouts.filter((p) => p.status === "APPROVED" || p.status === "PAID").length;
  // For a reviewer, what's still parked awaiting the second approver; for an org
  // admin, what's still sitting in their own queue.
  const pending = isFinal
    ? queue.campaigns + queue.payouts
    : myCampaigns.filter((c) => c.status === "REVIEWED").length +
      myPayouts.filter((p) => p.status === "REVIEWED").length;
  const sentBack = campaigns.filter((c) => c.reviewState === "CHANGES_REQUESTED").length;
  const decided = cleared + pending;
  const pct = decided > 0 ? Math.round((cleared / decided) * 100) : 0;

  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  const stageLabel = isFinal ? "final approval" : "first review";

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Review workload</h2>
        <Link
          href="/dashboard/approvals"
          className="text-xs text-primary hover:underline"
        >
          Open approvals
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        {/* Open queue by type */}
        <div>
          {openTotal === 0 ? (
            <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              <p className="text-xs text-muted-foreground">
                Nothing is waiting for your {stageLabel}.
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-28">
              {QUEUE_BARS.map((b) => {
                const v = queue[b.key];
                return (
                  <div
                    key={b.key}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="text-xs font-semibold text-foreground">
                      {v}
                    </span>
                    <div
                      className={cn(
                        "w-full max-w-[2.25rem] rounded-t-md",
                        v > 0 ? b.color : "bg-muted"
                      )}
                      style={{ height: `${Math.max(4, (v / max) * 88)}px` }}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            {openTotal} item{openTotal === 1 ? "" : "s"} awaiting your {stageLabel}
            {sentBack > 0 ? ` · ${sentBack} sent back for changes` : ""}
          </p>
        </div>

        {/* Your approval throughput */}
        <div className="flex items-center gap-3 justify-self-center sm:justify-self-end">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                strokeWidth="8"
                stroke="currentColor"
                className="text-muted"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke="currentColor"
                className="text-primary"
                strokeDasharray={`${dash} ${circ}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-semibold text-foreground leading-none">
                {decided > 0 ? `${pct}%` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">live</span>
            </div>
          </div>
          <div className="text-xs leading-tight">
            <p className="font-semibold text-foreground">{cleared}</p>
            <p className="text-muted-foreground">
              {isFinal ? "you approved & live" : "approved & live"}
            </p>
            <p className="mt-1.5 font-semibold text-foreground">{pending}</p>
            <p className="text-muted-foreground">
              {isFinal ? "awaiting your approval" : "awaiting 2nd approver"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
