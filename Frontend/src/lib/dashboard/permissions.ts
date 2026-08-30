import type { ApiUser } from "@/lib/api-client";

/**
 * Role-Based Access Control (RBAC) for the Changia dashboard.
 *
 * Roles come straight from the backend user object (ApiUser.role):
 *   - SUPER_ADMIN        → platform config, fee/gateway settings, org setup,
 *                          support + audit access
 *   - ORG_ADMIN          → creates campaigns, gives the FINAL (stage-2)
 *                          approval, manages the donor pool, views reports,
 *                          requests payouts. User & role management is
 *                          SUPER_ADMIN-only.
 *   - REVIEWER           → PLATFORM-level (no organization): gives the FIRST
 *                          (stage-1) approval on campaigns from EVERY org, and
 *                          reviews closure requests, completion reports and fee
 *                          proposals. Creates nothing.
 *   - CAMPAIGN_MANAGER   → works only on assigned campaigns, adds consented
 *                          donors, sends approved push requests. NO withdrawal
 *                          / payout access.
 *
 * Campaign approval is a strict ordered chain: REVIEWER (stage 1) → ORG_ADMIN
 * (stage 2) → live, two different people, neither the creator. SUPER_ADMIN can
 * stand in for either stage. See `canReviewCampaign` / `canFinalApproveCampaign`.
 */

export type Role = ApiUser["role"];

export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  REVIEWER: "REVIEWER",
  CAMPAIGN_MANAGER: "CAMPAIGN_MANAGER",
} as const;

export const ALL_ROLES: Role[] = [
  ROLE.SUPER_ADMIN,
  ROLE.ORG_ADMIN,
  ROLE.REVIEWER,
  ROLE.CAMPAIGN_MANAGER,
];

// A REVIEWER is platform-level (no organization), so the org-scoped working
// areas — donors, donor pools, reminders — would only ever show them an empty
// page. Those routes use this list instead of ALL_ROLES.
export const NON_REVIEWER_ROLES: Role[] = [
  ROLE.SUPER_ADMIN,
  ROLE.ORG_ADMIN,
  ROLE.CAMPAIGN_MANAGER,
];

// ─── Role metadata ───────────────────────────────────────────────────────────

export interface RoleMeta {
  /** Short human label used in the UI. */
  label: string;
  /** Label shown under the user's name in nav/header. */
  shortLabel: string;
  /** One-line welcome tagline on the dashboard. */
  tagline: string;
  /** Longer scope description for the role banner. */
  scope: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    shortLabel: "Super Admin",
    tagline: "Platform control, organisation setup and compliance.",
    scope:
      "Full platform access: organisation setup, campaign & donor pool approvals/management, user management, payouts and audit logs. Doesn't create campaigns or donor pools itself — that stays with the organisation.",
  },
  ORG_ADMIN: {
    label: "Org Admin",
    shortLabel: "Org Admin",
    tagline: "Campaigns, donors and payouts for your organisation.",
    scope:
      "Create campaigns, give the final (stage-2) approval, manage donors and donor pools, and request payouts. User and role management is handled by a platform super admin.",
  },
  REVIEWER: {
    label: "Reviewer",
    shortLabel: "Reviewer",
    tagline: "Give the first review on campaigns submitted across the platform.",
    scope:
      "Platform-level: give the first approval on campaigns from every organisation, and review closure requests, completion reports and custom service-fee proposals. Can't create campaigns, manage users, change platform settings or handle payouts.",
  },
  CAMPAIGN_MANAGER: {
    label: "Campaign Manager",
    shortLabel: "Campaign Manager",
    tagline: "Run campaigns and manage your consented donors.",
    scope:
      "Create campaigns, manage donor pools and add consented donors. Approvals, user management and payouts need an admin.",
  },
};

export function getRoleMeta(role?: Role): RoleMeta {
  return (role && ROLE_META[role]) || ROLE_META.CAMPAIGN_MANAGER;
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export type Permission =
  | "dashboard:view"
  | "campaign:view"
  | "campaign:create"
  | "campaign:approve"
  | "campaign:fee_review" // approve/reject a manager's custom service-fee proposal
  | "donor:view"
  | "donor:add" // add consented donors
  | "donor:manage" // full donor CRUD + imports
  | "user:manage"
  | "audit:view"
  | "settings:platform" // platform config, fees, gateways
  | "settings:org" // organisation preferences
  | "payout:request"
  | "reports:view"
  | "reminder:manage" // templates, auto-resend schedules, pending approvals
  | "donorpool:create"; // create a new donor pool (SUPER_ADMIN can still edit/manage existing ones)

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "campaign:view",
    // Deliberately no "campaign:create" — SUPER_ADMIN manages/edits/approves
    // what an organization already created, but doesn't create campaigns or
    // donor pools itself.
    "campaign:approve",
    "campaign:fee_review",
    "donor:view",
    "donor:add",
    "donor:manage",
    "user:manage",
    "audit:view",
    "settings:platform",
    "settings:org",
    "payout:request",
    "reports:view",
    "reminder:manage",
  ],
  ORG_ADMIN: [
    "dashboard:view",
    "campaign:view",
    "campaign:create",
    "campaign:approve",
    "campaign:fee_review",
    "donor:view",
    "donor:add",
    "donor:manage",
    // NOTE: no "user:manage" — all user & role management is SUPER_ADMIN-only.
    "settings:org",
    "payout:request",
    "reports:view",
    "reminder:manage",
    "donorpool:create",
  ],
  REVIEWER: [
    "dashboard:view",
    "campaign:view",
    "campaign:approve",
    "campaign:fee_review",
    "donor:view",
    "reports:view",
  ],
  CAMPAIGN_MANAGER: [
    "dashboard:view",
    "campaign:view",
    "campaign:create",
    "donor:view",
    "donor:add",
    "reminder:manage",
    "donorpool:create",
  ],
};

export function hasPermission(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}

// ─── Ordered campaign-approval chain ─────────────────────────────────────────
// Stage 1 ("first review") — a REVIEWER (or SUPER_ADMIN).
// Stage 2 ("final approval") — an ORG_ADMIN (or SUPER_ADMIN).
// The backend additionally enforces "two different people, neither the creator".

export function canReviewCampaign(role: Role | undefined): boolean {
  return role === "REVIEWER" || role === "SUPER_ADMIN";
}

export function canFinalApproveCampaign(role: Role | undefined): boolean {
  return role === "ORG_ADMIN" || role === "SUPER_ADMIN";
}

// ─── Route access ────────────────────────────────────────────────────────────
//
// Kept in one place so the sidebar, mobile nav, route guard and dashboard all
// agree on what every role may open.

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ALL_ROLES,
  "/dashboard/profile": ALL_ROLES,
  "/dashboard/campaigns": ALL_ROLES,
  "/dashboard/campaigns/new": [ROLE.ORG_ADMIN, ROLE.CAMPAIGN_MANAGER],
  "/dashboard/campaigns/approvals": [ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN, ROLE.REVIEWER],
  "/dashboard/donors": NON_REVIEWER_ROLES,
  "/dashboard/donors/import": [ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN],
  "/dashboard/pools": NON_REVIEWER_ROLES,
  "/dashboard/pools/new": [ROLE.ORG_ADMIN, ROLE.CAMPAIGN_MANAGER],
  "/dashboard/pools/anomalous": NON_REVIEWER_ROLES,
  "/dashboard/reminders": NON_REVIEWER_ROLES,
  "/dashboard/reminders/templates": NON_REVIEWER_ROLES,
  "/dashboard/reminders/schedules": NON_REVIEWER_ROLES,
  "/dashboard/notifications": ALL_ROLES,
  "/dashboard/user": [ROLE.SUPER_ADMIN],
  "/dashboard/audit-log": [ROLE.SUPER_ADMIN],
  "/dashboard/settings": ALL_ROLES,
  "/dashboard/payouts": [ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN],
};

/** Whether a role may open the given pathname (longest-prefix match wins). */
export function canAccessRoute(role: Role | undefined, pathname: string): boolean {
  if (!role) return false;
  const matched = Object.keys(ROUTE_ACCESS)
    .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (!matched) return false;
  return ROUTE_ACCESS[matched].includes(role);
}

/** The default landing route for a role when they have been blocked somewhere. */
export function getRoleLanding(role: Role): string {
  // Everyone can land on the dashboard overview.
  return "/dashboard";
}