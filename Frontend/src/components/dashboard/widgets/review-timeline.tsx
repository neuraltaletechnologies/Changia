"use client";

import { History } from "lucide-react";
import type { ReviewTrailEntry } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

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
  imageUrl: "Cover image",
  isPublic: "Visibility",
  nameSw: "Name (Swahili)",
  storySw: "Story (Swahili)",
  categorySw: "Category (Swahili)",
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ORG_ADMIN: "Org admin",
  REVIEWER: "Reviewer",
  CAMPAIGN_MANAGER: "Campaign manager",
};

interface ReviewTimelineProps {
  entries: ReviewTrailEntry[];
  /** Card header (omit to render just the list, no card chrome). */
  title?: string;
  subtitle?: string;
  emptyText?: string;
}

/**
 * Shared chronological review trail — used for both the campaign history tab
 * and the payout history dialog. Newest step first; "sent back" / "rejected"
 * steps and their reason notes are highlighted.
 */
export function ReviewTimeline({
  entries,
  title,
  subtitle,
  emptyText = "No activity recorded yet.",
}: ReviewTimelineProps) {
  const body =
    entries.length === 0 ? (
      <div className="py-14 text-center">
        <History className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Step
              </th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                By
              </th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Details
              </th>
              <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                When
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...entries].reverse().map((e) => {
              const warn = e.severity === "WARNING" || e.severity === "CRITICAL";
              const sentBack =
                e.action.includes("changes_requested") || e.action.includes("rejected");
              const flag = warn || sentBack;
              return (
                <tr key={e.id} className="align-top hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          flag ? "bg-amber-500" : "bg-primary/60"
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">{e.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                    {e.actor ? (
                      <>
                        {e.actor.name}
                        {e.actor.role && ROLE_LABEL[e.actor.role] && (
                          <span className="ml-1.5 rounded-full border border-border px-1.5 py-0.5 text-[10px]">
                            {ROLE_LABEL[e.actor.role]}
                          </span>
                        )}
                      </>
                    ) : (
                      "System"
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {e.fields && e.fields.length > 0 && (
                      <p className="text-muted-foreground">
                        Changed:{" "}
                        <span className="text-foreground">
                          {e.fields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}
                        </span>
                      </p>
                    )}
                    {e.notes ? (
                      <span
                        className={cn(
                          "mt-1.5 inline-block rounded-lg border px-3 py-1.5 max-w-md",
                          flag
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-border bg-muted/40 text-muted-foreground"
                        )}
                      >
                        &ldquo;{e.notes}&rdquo;
                      </span>
                    ) : (
                      !(e.fields && e.fields.length > 0) && (
                        <span className="text-muted-foreground/50">—</span>
                      )
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  if (!title) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {body}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {body}
    </div>
  );
}
