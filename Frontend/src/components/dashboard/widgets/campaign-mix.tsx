"use client";

import Link from "next/link";
import { formatTZS } from "@/lib/dashboard/types";
import { cn } from "@/lib/dashboard/utils";

interface CampaignMixProps {
  active: number;
  pending: number;
  reviewing: number;
  draft: number;
  raised: number;
  required: number;
  poolDonors: number;
  poolCount: number;
}

const BARS = [
  { key: "active", label: "Active", color: "bg-emerald-500" },
  { key: "pending", label: "Pending", color: "bg-amber-500" },
  { key: "reviewing", label: "Reviewing", color: "bg-sky-500" },
  { key: "draft", label: "Draft", color: "bg-slate-400" },
] as const;

/**
 * Minimal campaign snapshot for a CAMPAIGN_MANAGER: a small vertical bar chart
 * of campaigns by status and a funding ring of total raised vs total required
 * across their portfolio. Pure CSS/SVG — no chart dependency.
 */
export function CampaignMix({
  active,
  pending,
  reviewing,
  draft,
  raised,
  required,
  poolDonors,
  poolCount,
}: CampaignMixProps) {
  const counts = { active, pending, reviewing, draft };
  const max = Math.max(active, pending, reviewing, draft, 1);
  const total = active + pending + reviewing + draft;
  const pct = required > 0 ? Math.min(100, Math.round((raised / required) * 100)) : 0;

  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-foreground">Campaign overview</h2>
        <Link
          href="/dashboard/campaigns"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
        {/* Campaigns by status */}
        <div>
          <div className="flex items-end gap-5 h-44">
            {BARS.map((b) => {
              const v = counts[b.key];
              return (
                <div
                  key={b.key}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {v}
                  </span>
                  <div
                    className={cn("w-full max-w-[3rem] rounded-t-md", b.color)}
                    style={{ height: `${Math.max(6, (v / max) * 140)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-4">
            {total} campaign{total === 1 ? "" : "s"} &middot; {poolDonors} donor
            {poolDonors === 1 ? "" : "s"} in {poolCount} pool
            {poolCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Raised vs required */}
        <div className="flex items-center gap-4 justify-self-center sm:justify-self-end">
          <div className="relative w-32 h-32 shrink-0">
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
              <span className="text-xl font-semibold text-foreground leading-none">
                {pct}%
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">funded</span>
            </div>
          </div>
          <div className="text-sm leading-tight">
            <p className="font-semibold text-foreground">{formatTZS(raised)}</p>
            <p className="text-xs text-muted-foreground">raised</p>
            <p className="mt-2 font-semibold text-foreground">
              {formatTZS(required)}
            </p>
            <p className="text-xs text-muted-foreground">required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
