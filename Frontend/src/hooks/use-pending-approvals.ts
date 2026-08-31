"use client";

import { useEffect, useState } from "react";
import { campaignApi, payoutApi, reminderScheduleApi } from "@/lib/dashboard/api";
import { isAuthenticated } from "@/lib/api-client";
import { useRole } from "@/hooks/use-role";

/**
 * Count of items awaiting THIS user's approval stage, for the sidebar
 * "Approvals" badge. A reviewer sees PENDING campaigns + PENDING change
 * requests + REQUESTED payouts; a final approver sees the REVIEWED ones.
 * Whoever manages reminders also sees the pending auto-resend cycles waiting
 * for confirmation (they're actioned on the Approvals page too). Polls every
 * 60s, silent on error. Returns 0 for anyone with nothing to action.
 */
export function usePendingApprovalCount(): number {
  const {
    canReviewCampaign,
    canFinalApproveCampaign,
    canReviewPayout,
    canFinalApprovePayout,
    isSuperAdmin,
    hasPermission,
    user,
  } = useRole();
  const [count, setCount] = useState(0);
  const seesReminders = hasPermission("reminder:manage");

  useEffect(() => {
    const canApprove =
      canReviewCampaign ||
      canFinalApproveCampaign ||
      canReviewPayout ||
      canFinalApprovePayout ||
      seesReminders;
    if (!isAuthenticated() || !canApprove) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const seesPayouts = canReviewPayout || canFinalApprovePayout || isSuperAdmin;
    const canApproveCampaignOrPayout =
      canReviewCampaign || canFinalApproveCampaign || seesPayouts;

    const load = () => {
      Promise.all([
        canApproveCampaignOrPayout
          ? campaignApi.list({ limit: 100 }).catch(() => null)
          : Promise.resolve(null),
        seesPayouts ? payoutApi.list({ limit: 100 }).catch(() => null) : Promise.resolve(null),
        seesReminders ? reminderScheduleApi.pending().catch(() => null) : Promise.resolve(null),
      ])
        .then(([r, payoutRes, reminderRes]) => {
          if (cancelled) return;
          const uid = user ? String(user.id) : null;
          const reminderN = reminderRes?.pending.length ?? 0;
          const campaignN = (r?.campaigns ?? []).filter((c) => {
            const cr = c.changeRequest;
            if (canReviewCampaign) {
              if (
                c.status === "PENDING" &&
                c.reviewState !== "CHANGES_REQUESTED" &&
                String(c.createdBy ?? "") !== uid
              )
                return true;
              if (cr && cr.status === "PENDING") return true;
            }
            if (canFinalApproveCampaign) {
              const notMine =
                String(c.firstApprovedBy ?? "") !== uid && String(c.createdBy ?? "") !== uid;
              if (c.status === "REVIEWED" && notMine) return true;
              if (cr && cr.status === "REVIEWED" && String(cr.firstApprovedBy ?? "") !== uid)
                return true;
            }
            if (c.feeStatus === "PENDING") return true;
            // Closure requests + completion reports are reviewed by any approver
            // (in full context on the campaign page).
            if (c.latestClosureRequest?.status === "PENDING") return true;
            if (c.completionReport?.status === "PENDING_REVIEW") return true;
            return false;
          }).length;

          const payoutN = (payoutRes?.payouts ?? []).filter((p) => {
            if (
              canReviewPayout &&
              p.status === "REQUESTED" &&
              String(p.requestedBy ?? "") !== uid
            )
              return true;
            if (
              canFinalApprovePayout &&
              p.status === "REVIEWED" &&
              String(p.firstApprovedBy ?? "") !== uid &&
              String(p.requestedBy ?? "") !== uid
            )
              return true;
            // SUPER_ADMIN still owes the final "mark as paid" step.
            if (isSuperAdmin && p.status === "APPROVED") return true;
            return false;
          }).length;

          setCount(campaignN + payoutN + reminderN);
        })
        .catch(() => undefined);
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    canReviewCampaign,
    canFinalApproveCampaign,
    canReviewPayout,
    canFinalApprovePayout,
    isSuperAdmin,
    seesReminders,
    user,
  ]);

  return count;
}
