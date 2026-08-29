"use client";

import { useEffect, useState } from "react";
import { getStoredUser, type ApiUser } from "@/lib/api-client";
import {
  canAccessRoute,
  canFinalApproveCampaign,
  canReviewCampaign,
  getRoleMeta,
  hasPermission,
  type Permission,
  type Role,
} from "@/lib/dashboard/permissions";

/**
 * Returns the current session user and derived role-based capabilities.
 * Role state is hydrated once from the stored session on mount so that it
 * stays in sync with what AuthGuard validated.
 */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setRole(stored?.role ?? null);
  }, []);

  const meta = getRoleMeta(role ?? undefined);

  return {
    role,
    user,
    meta,
    isSuperAdmin: role === "SUPER_ADMIN",
    isOrgAdmin: role === "ORG_ADMIN",
    isReviewer: role === "REVIEWER",
    isCampaignManager: role === "CAMPAIGN_MANAGER",
    /** Can give a campaign / campaign-edit its FIRST (stage-1) approval. */
    canReviewCampaign: canReviewCampaign(role ?? undefined),
    /** Can give a campaign / campaign-edit its FINAL (stage-2) approval. */
    canFinalApproveCampaign: canFinalApproveCampaign(role ?? undefined),
    hasPermission: (perm: Permission) => hasPermission(role ?? undefined, perm),
    canAccessRoute: (pathname: string) => canAccessRoute(role ?? undefined, pathname),
    resolved: role !== null,
  };
}

export type UseRole = ReturnType<typeof useRole>;