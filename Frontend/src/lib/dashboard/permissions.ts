import type { ApiUser } from "@/lib/api-client";

/**
 * Role-Based Access Control (RBAC) for the Changia dashboard.
 *
 * Roles come straight from the backend user object (ApiUser.role):
 *   - SUPER_ADMIN        → platform config, fee/gateway settings, org setup,
 *                          support + audit access
 *   - ORG_ADMIN          → creates/approves campaigns, manages org users +
 *                          donor pool, views reports, requests payouts
 *   - CAMPAIGN_MANAGER   → works only on assigned campaigns, adds consented
 *                          donors, sends approved push requests. NO withdrawal
 *                          / payout access.
 */

export type Role = ApiUser["role"];

export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  CAMPAIGN_MANAGER: "CAMPAIGN_MANAGER",
} as const;

export const ALL_ROLES: Role[] = [
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
    tagline: "Campaigns, donors, users and payouts for your organisation.",
    scope:
      "Create and approve campaigns, manage donors and donor pools, manage your user and request payouts.",
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
    "donor:view",
    "donor:add",
    "donor:manage",
    "user:manage",
    "settings:org",
    "payout:request",
    "reports:view",
    "reminder:manage",
    "donorpool:create",
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

// ─── Route access ────────────────────────────────────────────────────────────
//
// Kept in one place so the sidebar, mobile nav, route guard and dashboard all
// agree on what every role may open.

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ALL_ROLES,
  "/dashboard/profile": ALL_ROLES,
  "/dashboard/campaigns": ALL_ROLES,
  "/dashboard/campaigns/new": [ROLE.ORG_ADMIN, ROLE.CAMPAIGN_MANAGER],
  "/dashboard/campaigns/approvals": [ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN],
  "/dashboard/donors": ALL_ROLES,
  "/dashboard/donors/import": [ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN],
  "/dashboard/pools": ALL_ROLES,
  "/dashboard/pools/new": [ROLE.ORG_ADMIN, ROLE.CAMPAIGN_MANAGER],
  "/dashboard/pools/anomalous": ALL_ROLES,
  "/dashboard/reminders": ALL_ROLES,
  "/dashboard/reminders/templates": ALL_ROLES,
  "/dashboard/reminders/schedules": ALL_ROLES,
  "/dashboard/user": [ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN],
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