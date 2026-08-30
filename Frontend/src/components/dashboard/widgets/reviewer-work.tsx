"use client";

import Link from "next/link";
import type { CampaignRecord } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

interface ReviewerWorkProps {
  campaigns: CampaignRecord[];
  /** Current reviewer's user id, for attributing their own decisions. */
  reviewerId: string | null;
}

const QUEUE_BARS = [
  { key: "campaigns", label: "Campaigns", color: "bg-orange-500" },
  { key: "edits", label: "Edits", color: "bg-sky-500" },
  { key: "fees", label: "Fees", color: "bg-amber-500" },
  { key: "closures", label: "Closures", color: "bg-rose-500" },
  { key: "reports", label: "Reports", color: "bg-violet-500" },
] as const;

/**
 * Minimal snapshot for a REVIEWER: a small bar chart of the open review queue
 * by request type, and a ring of how their own first-stage approvals have
 * progressed (cleared / awaiting the second approver / sent back). Pure
 * CSS/SVG — mirrors CampaignMix.
 */
export function ReviewerWork({ campaigns, reviewerId }: ReviewerWorkProps) {
  const uid = reviewerId || null;

  // ── Open queue (what needs the reviewer now) ──────────────────────────────
  const queue = {
    campaigns: campaigns.filter(
      (c) => c.status === "PENDING" && String(c.createdBy ?? "") !== uid
    ).length,
    edits: campaigns.filter(
      (c) => c.changeRequest && c.changeRequest.status === "PENDING"
    ).length,
    fees: campaigns.filter((c) => c.feeStatus === "PENDING").length,
    closures: campaigns.filter(
      (c) => c.latestClosureRequest && c.latestClosureRequest.status === "PENDING"
    ).length,
    reports: campaigns.filter(
      (c) => c.completionReport && c.completionReport.status === "PENDING_REVIEW"
    ).length,
  };
  const max = Math.max(...Object.values(queue), 1);
  const openTotal = Object.values(queue).reduce((a, b) => a + b, 0);

  // ── The reviewer's own first-stage decisions ──────────────────────────────
  const mine = campaigns.filter((c) => uid && String(c.firstApprovedBy ?? "") === uid);
  const cleared = mine.filter((c) => c.status === "ACTIVE").length;
  const awaitingFinal = mine.filter((c) => c.status === "REVIEWED").length;
  const sentBack = campaigns.filter(
    (c) => c.reviewState === "CHANGES_REQUESTED"
  ).length;
  const decided = cleared + awaitingFinal;
  const pct = decided > 0 ? Math.round((cleared / decided) * 100) : 0;

  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Review workload</h2>
        <Link
          href="/dashboard/campaigns/approvals"
          className="text-xs text-primary hover:underline"
        >
          Open queue
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        {/* Open queue by type */}
        <div>
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
                    className={cn("w-full max-w-[2.25rem] rounded-t-md", b.color)}
                    style={{ height: `${Math.max(4, (v / max) * 88)}px` }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            {openTotal} item{openTotal === 1 ? "" : "s"} awaiting your review
            {sentBack > 0 ? ` · ${sentBack} sent back` : ""}
          </p>
        </div>

        {/* Your first-approval throughput */}
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
                {pct}%
              </span>
              <span className="text-[10px] text-muted-foreground">live</span>
            </div>
          </div>
          <div className="text-xs leading-tight">
            <p className="font-semibold text-foreground">{cleared}</p>
            <p className="text-muted-foreground">approved &amp; live</p>
            <p className="mt-1.5 font-semibold text-foreground">{awaitingFinal}</p>
            <p className="text-muted-foreground">awaiting 2nd approver</p>
          </div>
        </div>
      </div>
    </section>
  );
}
