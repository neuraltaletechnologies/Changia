"use client";

import { useEffect, useState } from "react";
import { campaignApi } from "@/lib/dashboard/api";
import { isAuthenticated } from "@/lib/api-client";
import { useRole } from "@/hooks/use-role";

/**
 * Count of campaigns awaiting THIS user's approval stage, for the sidebar
 * "Approvals" badge. A reviewer sees PENDING campaigns + PENDING change
 * requests; a final approver sees REVIEWED ones. Polls every 60s, silent on
 * error. Returns 0 for anyone who can't approve.
 */
export function usePendingApprovalCount(): number {
  const { canReviewCampaign, canFinalApproveCampaign, user } = useRole();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated() || (!canReviewCampaign && !canFinalApproveCampaign)) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const load = () => {
      campaignApi
        .list({ limit: 100 })
        .then((r) => {
          if (cancelled) return;
          const uid = user ? String(user.id) : null;
          const n = r.campaigns.filter((c) => {
            const cr = c.changeRequest;
            if (canReviewCampaign) {
              if (c.status === "PENDING" && String(c.createdBy ?? "") !== uid) return true;
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
            return false;
          }).length;
          setCount(n);
        })
        .catch(() => undefined);
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canReviewCampaign, canFinalApproveCampaign, user]);

  return count;
}
