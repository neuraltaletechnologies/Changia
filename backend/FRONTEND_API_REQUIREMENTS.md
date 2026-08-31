# Changia — API Requirements for the Backend Developer

> **Author:** Frontend Developer
> **Audience:** Backend Developer
> **Purpose:** The single source of truth for **every API the frontend needs the backend to create**, the **data models / TypeScript types** the backend must return, and the **role-based permissions** that decide what a manager, admin, or system (super-admin) user can see and do.

This document covers the whole flow **from login and registration onward** and describes the exact contract the frontend already expects (see `Frontend/src/lib/api-client.ts` and `Frontend/src/lib/dashboard/types.ts`). Anything the current backend has not implemented yet is explicitly marked **[TO BUILD]**.

---

## Table of contents

1. [Conventions & base URL](#1-conventions--base-url)
2. [Response envelope & error handling](#2-response-envelope--error-handling)
3. [Roles & permissions](#3-roles--permissions)
4. [Data models (types the API must use)](#4-data-models-types-the-api-must-use)
5. [Auth — login & registration](#5-auth--login--registration)
6. [Organizations](#6-organizations)
7. [Users / User](#7-users--user)
8. [Campaigns](#8-campaigns)
9. [Donors (CRM)](#9-donors-crm)
10. [Donations & payments](#10-donations--payments)
11. [Audit logs](#11-audit-logs)
12. [Payouts](#12-payouts--to-build)
13. [Settings](#13-settings--to-build)
14. [Donor pools](#14-donor-pools)
15. [Reminder templates & auto-resend schedules](#15-reminder-templates--auto-resend-schedules)
16. [Public campaign page](#16-public-campaign-page)
17. [Quick start / how to test](#17-quick-start--how-to-test)

---

## 1. Conventions & base URL

> **Backed by frontend pages:** the entire dashboard (`http://localhost:3000/dashboard/...`) reads this contract — login/registration at `/login` and `/register`.

| Item | Value |
|------|-------|
| Base URL (dev) | `http://localhost:5000/api/v1` |
| Format | JSON only — `Content-Type: application/json` |
| Amounts | **Whole TZS integers** (no decimals) — e.g. `20000`, not `20000.0` |
| Dates | ISO-8601 UTC strings, e.g. `2026-01-03T10:00:00.000Z` |
| Auth header | `Authorization: Bearer <accessToken>` |
| IDs | Strings throughout (`id`, `organizationId`, `campaignId`, `donorId`…) |

**Field naming must be `camelCase`** in every request body and response. The frontend maps these directly onto its TypeScript interfaces — a `snake_case` response breaks the UI. The backend may store `snake_case` in MySQL, but must convert before responding.

> ⚠️ **Critical for the frontend:** the frontend stores the user object returned by the API (`ApiUser`) and reads `role` to gate the entire dashboard UI. The `role` field must be exactly one of `SUPER_ADMIN`, `ORG_ADMIN`, `CAMPAIGN_MANAGER`.

---

## 2. Response envelope & error handling

> **Backed by frontend pages:** error codes/messages surface on the auth forms (`/login`, `/register`) and the whole dashboard; a `401` force-redirects to `/login` with a `?redirect=` back to the originating page.

### Success (object payload)

```json
{ "success": true, "data": { } }
```

### Success (message-only)

```json
{ "success": true, "message": "Password updated successfully" }
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": null
  }
}
```

The frontend reads `error.code`, `error.message` and optional `error.details` and throws an `ApiClientError(status, code, message, details)`. Keep the `code` values stable so the UI can map the right message.

### HTTP status codes the frontend expects

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad request — validation failed / rule violated |
| `401` | Missing/invalid token (`UNAUTHORIZED`), wrong credentials (`INVALID_CREDENTIALS`) |
| `403` | Authenticated but not allowed (`INSUFFICIENT_ROLE`, `ACCOUNT_INACTIVE`) |
| `404` | Not found (`NOT_FOUND`) |
| `409` | Conflict — duplicate / already processed (`DUPLICATE_RECORD`, `ALREADY_RESOLVED`) |
| `500` | Internal error (`INTERNAL_ERROR`) |

### Common error codes used by the frontend

| Code | When |
|------|------|
| `VALIDATION_ERROR` | body/query failed validation (`details` lists fields) |
| `EMAIL_TAKEN` | registration email already exists |
| `INVALID_CREDENTIALS` | wrong email/password on login |
| `INVALID_PASSWORD` | wrong current password on change-password |
| `ACCOUNT_INACTIVE` | user status is not `ACTIVE` |
| `INSUFFICIENT_ROLE` | role is not allowed on the route |
| `INVALID_TOKEN` | token missing/malformed/expired (frontend force-redirects to `/login`) |
| `NOT_FOUND` | resource not found in the user's org |
| `DUPLICATE_RECORD` | unique constraint violation |
| `RECORD_IN_USE` | record is referenced elsewhere and can't be deleted |
| `CANNOT_EDIT_PUBLISHED` | trying to edit a campaign after it has been published/active |
| `CANNOT_DELETE_PUBLISHED` | trying to delete a campaign after it has been published/active |

> On a `401`, the frontend automatically clears the stored session and redirects to `/login`. If you add refresh-token handling later, keep returning `401` for an invalid/expired access token so this behaviour stays correct.
### Input validation (applies to EVERY endpoint)

Every request body and query must be validated **server-side** before it is processed. Do not rely on the frontend or the database to catch bad input — validate each field for **type**, **length**, **format**, and **required-ness**, then return `400 VALIDATION_ERROR` with a `details` array listing every failing field.

**Rules the backend MUST enforce:**

| Rule | Example |
|------|---------|
| **Type** | `goal` must be a `number` (integer ≥ 1); `firstName`/`email` must be strings |
| **Required** | Every required field must be present and non-empty before anything is sent/saved |
| **Length** | `firstName` ≤ 80 chars, `lastName` ≤ 80, `name` ≤ 120, `email` ≤ 254, `password` 8–72 (with letters + numbers), `description` ≤ 2000, `category` ≤ 80, `location` ≤ 120 |
| **Format** | `email` must be a valid email; `phone` a valid format we can normalize (e.g. `+255…`); dates are ISO-8601 |
| **Range** | `goal` ≥ 1; `amount` ≥ 1 and ≤ a max configured max single donation; `serviceFeePercent` 0–25; `page` ≥ 1; `limit` 1–100 |
| **Enums** | `role` ∈ `SUPER_ADMIN\|ORG_ADMIN\|CAMPAIGN_MANAGER`; `status`/`action`/`severity`/`channel`/`consentStatus` must match their allowed values |
| **Cross-field** | `endDate` ≥ `startDate`; `newPassword` === `confirmPassword`; `donorId` belongs to the caller's org |

**Example validation-error response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "is required and must be a string (max 120)" },
      { "field": "goal", "message": "must be a positive integer amount (TZS)" },
      { "field": "endDate", "message": "must be on or after startDate" }
    ]
  }
}
```

> If **any** field is invalid, do **not** create/update the record — reject the whole request. Never truncate, coerce or silently drop an invalid field. The frontend shows the `details` messages next to the matching form fields, so the messages should be human-readable and reference the field name.

---

## 3. Roles & permissions

> **Backed by frontend pages:** these roles gate the sidebar, mobile nav, route guard, and quick actions across every dashboard page (`/dashboard`, `/dashboard/campaigns`, `/dashboard/donors`, `/dashboard/users`, `/dashboard/audit-log`, `/dashboard/settings`, `/dashboard/payouts`).

There are **three** platform roles. The user-facing names the customer uses map to the API role strings as follows:

| Customer term | API role (`ApiUser.role`) | Scope |
|---------------|---------------------------|-------|
| **System** | `SUPER_ADMIN` | Platform-wide: config, fee & gateway settings, org setup, support + audit. No organization by default (`organizationId: null`). |
| **Admin** | `ORG_ADMIN` | One organization: creates/approves campaigns, manages user + donor pool, requests payouts. |
| ~~**System** creates campaigns/pools~~ | — | **`SUPER_ADMIN` cannot create a campaign or a donor pool** — creation is `ORG_ADMIN`/`CAMPAIGN_MANAGER` only. `SUPER_ADMIN` keeps full edit/approve/manage access to whatever already exists platform-wide. |
| **Manager** | `CAMPAIGN_MANAGER` | Only assigned campaigns: adds consented donors, sends approved push payment requests. **No withdrawals/payouts.** |

### Permission matrix the frontend enforces in the UI (mirror this on the backend)

| Permission | `SUPER_ADMIN` | `ORG_ADMIN` | `CAMPAIGN_MANAGER` |
|------------|:---:|:---:|:---:|
| `dashboard:view` | ✅ | ✅ | ✅ |
| `campaign:view` | ✅ | ✅ | ✅ |
| `campaign:create` | ❌ | ✅ | ✅ |
| `campaign:approve` | ✅ | ✅ | ❌ |
| `donorpool:create` | ❌ | ✅ | ✅ |
| `donor:view` | ✅ | ✅ | ✅ |
| `donor:add` (add consented donors) | ✅ | ✅ | ✅ |
| `donor:manage` (full CRUD + import) | ✅ | ✅ | ❌ |
| `user:manage` | ✅ | ✅ | ❌ |
| `audit:view` | ✅ | ❌ | ❌ |
| `settings:platform` | ✅ | ❌ | ❌ |
| `settings:org` | ✅ | ✅ | ❌ |
| `payout:request` | ✅ | ✅ | ❌ |
| `reports:view` | ✅ | ✅ | ❌ |

**Backend rule of thumb:** a `CAMPAIGN_MANAGER` can CREATE/READ donors and create payment attempts, but can **never** update/delete donors, manage user, approve campaigns, change org settings, or do payouts. Enforce this server-side with `authorize(...)` middleware — never trust the UI/role alone.

---

## 4. Data models (types the API must use)

> **Backed by frontend code:** these shapes mirror `Frontend/src/lib/dashboard/types.ts` (and `api-client.ts` for `ApiUser`) — every dashboard page maps them directly onto its components.

These are the canonical shapes the frontend expects. Every list endpoint returns an array of these; every create/update returns the object back. Field names are `camelCase`.

### `ApiUser` — returned by login / register / me

```ts
interface ApiUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'CAMPAIGN_MANAGER';
  status: string;                 // 'ACTIVE' etc.
  avatarUrl?: string | null;
  organizationId: string | null;  // null for SUPER_ADMIN
}
```

### `Organization`

```ts
interface Organization {
  id: string;
  name: string;
  slug: string;              // URL-safe
  ownerUserId: string;
  serviceFeePercent?: number;
  createdAt: string;
  updatedAt: string;
}
```

### `Campaign`

```ts
type CampaignStatus = 'draft' | 'pending' | 'active' | 'paused' | 'completed';

interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  goal: number;              // base amount (TZS integer)
  serviceFeePercent: number;
  publicTarget: number;      // goal + fee — public number
  raised: number;            // confirmed donations only
  donors: number;            // distinct confirmed donors
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  description?: string;
  category?: string;
  contactPhone?: string;
  submittedAt?: string;
  ownerName?: string;
  ownerEmail?: string;
  image?: string;
  evidence?: string[];
  memberIds?: string[];      // assigned CAMPAIGN_MANAGER ids
}
```
### `Donor`

```ts
type DonorStatus = 'active' | 'inactive' | 'prospect' | 'lapsed';
type ConsentStatus = 'consented' | 'pending' | 'withdrawn';
type CommChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'post';
type DonorTag = 'major-donor' | 'recurring' | 'corporate' | 'anonymous'
             | 'volunteer' | 'diaspora' | 'first-time';

interface Donor {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  status: DonorStatus;
  consentStatus: ConsentStatus;  // required — consent-aware CRM
  preferredChannel: CommChannel; // channel a push request can be sent to
  tags: DonorTag[];
  totalGiven: number;            // in this org
  lastGift: string;              // date or 'Never'
  lastGiftAmount: number;
  giftCount: number;
  joinedDate: string;
  avatar?: string;
  notes?: string;
}
```

### `DonorPool` — backed by `Frontend/src/lib/dashboard/api.ts`

```ts
type PoolCategory = 'FAMILY' | 'SCHOOL' | 'STUDENT' | 'OFFICE';
type PayStatus = 'UNPAID' | 'PARTIAL' | 'PAID_FULL';

interface DonorPool {
  id: number;
  name: string;
  description: string | null;
  category: PoolCategory;
  isSystem: boolean;          // true = a manager's own anomalous/unmatched pool
  status: 'ACTIVE' | 'ARCHIVED';
  createdBy: { id: number; firstName: string; lastName: string; email: string } | null;
  memberCount: number;
  expectedTotal: number;
  paidTotal: number;
  createdAt: string;
  updatedAt: string;
  members?: {
    id: number;
    expectedAmount: number | null;
    paidAmount: number;
    donationCount: number;
    status: PayStatus | null;   // only set when a ?campaignId= comparison is requested
    donor: { id: number; firstName: string | null; lastName: string | null; email: string | null;
              phone: string | null; gender: 'MALE'|'FEMALE'|'UNSPECIFIED'|null; position: string | null;
              isAnomalous: boolean };
  }[];
}
```

> Visibility: only the pool's `createdBy` manager and `ORG_ADMIN`/`SUPER_ADMIN` can see a given pool — the frontend must not assume a `CAMPAIGN_MANAGER` can list another manager's pools.

### `MessageTemplate` / `ReminderSchedule` / `PendingReminderBatch`

```ts
type ReminderChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

interface MessageTemplate {
  id: number; name: string; channel: ReminderChannel;
  subject: string | null; body: string;             // supports {{donorName}}, {{amountDue}}, {{campaignName}}, {{orgName}}
  createdBy: number | null; createdAt: string; updatedAt: string;
}

interface ReminderSchedule {
  id: number; name: string; scope: 'POOL' | 'CAMPAIGN';
  poolId: number | null; campaignId: number | null;
  intervalDays: number; channels: ReminderChannel[];
  templateIdSms: number | null; templateIdWhatsapp: number | null; templateIdEmail: number | null;
  isActive: boolean; nextRunAt: string; lastRunAt: string | null;
  createdBy: number | null; createdAt: string; updatedAt: string;
}

interface PendingReminderBatch {
  id: number; scheduleId: number; scheduleName: string; scope: 'POOL' | 'CAMPAIGN';
  pool: { id: number; name: string } | null; campaign: { id: number; name: string } | null;
  channels: ReminderChannel[]; status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'SKIPPED' | 'EXPIRED';
  donorCount: number; generatedAt: string; resolvedAt: string | null;
}
```

> **Auto-resend is never silent.** A schedule's due cycle only produces a `PendingReminderBatch` — the frontend's `/dashboard/reminders` inbox must show it and require an explicit confirm click (`POST /reminder-schedules/pending/:id/confirm`) before anything is actually sent.

### `Donation`

```ts
interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  campaignId: string;
  campaign: string;          // campaign name
  amount: number;            // confirmed amount (TZS)
  channel: CommChannel;
  date: string;              // ISO date
  status: 'completed' | 'pending' | 'failed';
  method: 'PUSH' | 'LINK';
  isAnonymous: boolean;
  receiptNumber?: string;    // e.g. CHG-2026-000031
  gatewayRef?: string;
  confirmedAt?: string;
}
```

### `PaymentAttempt` (push payment request)

```ts
interface PaymentAttempt {
  id: string;
  campaignId: string;
  donorId: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  idempotencyKey: string;    // unique per request — prevents double count
  createdAt: string;
  expiresAt?: string;
  donationId?: string | null; // populated once confirmed
}
```

### `User` (user rows listing)

```ts
interface User {
  id: string;
  name: string;              // firstName + lastName
  email: string;
  role: 'admin' | 'manager' | 'viewer' | 'fundraiser'; // UI label — see mapping below
  status: 'active' | 'pending' | 'inactive';
  lastActive: string;
  avatar?: string;
}
```

> **Loose coupling note:** the user page currently uses UI labels `admin | manager | viewer | fundraiser`. Map from the API role: `ORG_ADMIN` → `admin`, `CAMPAIGN_MANAGER` → `manager`/`fundraiser`, `SUPER_ADMIN` → `admin`. Ideally also expose the canonical `ApiUser.role` field.

### `AuditLog`

```ts
interface AuditLog {
  id: string;
  action: string;       // e.g. 'donation.confirmed', 'campaign.approved'
  resource: string;     // e.g. 'donation', 'campaign'
  resourceId: string;
  user: string;         // actor name/email
  userId: string;
  ipAddress: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  details?: string;
}
```

### `Notification`

```ts
interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'donation' | 'campaign' | 'system' | 'user';
}
```

### Pagination convention (used by every list endpoint)

```json
{
  "success": true,
  "data": { "items": [], "pagination": { "page": 1, "limit": 25, "total": 120, "totalPages": 5 } }
}
```

Query params: `page` (1-based) and `limit` (default 25, max 100). Return the `pagination` object so the frontend can build pager controls. Some endpoints may return the array under a named key instead of `items` (e.g. `campaigns`, `donors`, `donations`, `logs`, `users`) — keep the shape consistent per module and document it there.
---

## 5. Auth — login & registration

> **Backed by frontend pages:** `/login` and `/register` (plus the login/register modals), and session re-hydration via `GET /auth/me` on page load.

All auth endpoints except `/login` and `/register` require a valid JWT in the `Authorization` header. On success the backend returns `data.accessToken` and `data.user` (an `ApiUser`). The frontend stores both in `localStorage` (`changia_access_token`, `changia_user`).

> The frontend already calls these three endpoints in `api-client.ts` — **they must exist first** for the app to work at all.

### `POST /auth/register` — create organization + first admin

Public. Creates an organization and its first `ORG_ADMIN` (the "owner"), then returns a JWT so the user is logged in immediately.

**Request body:**

```json
{
  "firstName": "Neema",
  "lastName": "Msuya",
  "email": "neema@changia.org.tz",
  "phone": "+255755000111",
  "password": "StrongPass@2026",
  "confirmPassword": "StrongPass@2026",
  "organizationName": "Dr. Msuya Foundation",
  "termsAccepted": true
}
```

**Response — `201 Created`:**

```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "user": { "id": "1", "firstName": "Neema", "lastName": "Msuya", "email": "neema@changia.org.tz", "phone": "+255755000111", "role": "ORG_ADMIN", "status": "ACTIVE", "avatarUrl": null, "organizationId": "2" },
    "organization": { "id": "2", "name": "Dr. Msuya Foundation", "slug": "dr-msuya-foundation" }
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN` (email already exists), `400` if `termsAccepted` is false.

### `POST /auth/login` — sign in

Public. **Required by the frontend login page.**

**Request body:**

```json
{ "email": "neema@changia.org.tz", "password": "StrongPass@2026" }
```

**Response — `200 OK`:** same `data` shape as register (accessToken + user). `organization` may be omitted/`null` for a `SUPER_ADMIN`.

**Errors:** `401 INVALID_CREDENTIALS` (wrong email or password), `403 ACCOUNT_INACTIVE`, `401 INVALID_TOKEN` (bad token).

### `GET /auth/me` — current user + organization

Authenticated. Used by the frontend to re-hydrate the session on page load.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": { "user": { "...": "ApiUser" }, "organization": { "...": "Organization | null" } }
}
```

### `POST /auth/change-password` — update own password

Authenticated.

**Request body:**

```json
{ "currentPassword": "StrongPass@2026", "newPassword": "NewStrong@2027", "confirmPassword": "NewStrong@2027" }
```

**Response — `200 OK`:** `{ "success": true, "message": "Password updated successfully" }`

**Errors:** `401 INVALID_PASSWORD` (wrong `currentPassword`), `400 VALIDATION_ERROR`.

### `POST /auth/logout` — revoke token **[TO BUILD]**

Authenticated. Invalidates the current access token / clears the server session. The frontend also clears `localStorage` locally on sign-out, but a server-side revoke is expected for security.

**Response — `200 OK`:** `{ "success": true, "message": "Logged out" }`

---

## 6. Organizations

> **Backed by frontend pages:** `/dashboard` (org profile + dashboard stat cards via `GET /organizations/stats`) and the `/dashboard/settings` → Organisation tab.

Routes are org-scoped: a user only ever reads/writes their own organization. `SUPER_ADMIN` has no org (`organizationId: null`) and is denied these routes unless it can specify an org to act on.

### `GET /organizations` — org profile

Authenticated (all roles).

**Response — `200 OK`:** `{ "success": true, "data": { "organization": { "...": "Organization" } } }`

> A `GET /organizations/:id` variant that lets a `SUPER_ADMIN` read any org is useful for platform auditing — **[TO BUILD]**.

### `GET /organizations/stats` — dashboard summary numbers

Authenticated (all roles). Powers the dashboard stat cards.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "totalCampaigns": 12,
    "activeCampaigns": 3,
    "totalRaised": 2500000,
    "totalDonors": 84,
    "consentedDonors": 60,
    "pendingApprovals": 2,
    "recentDonations": [ { "...": "Donation" } ],
    "recentActivity": [ { "...": "ActivityItem" } ]
  }
}
```

> Options: return these as separate dedicated endpoints (`/campaigns/stats`, `/donors/stats`, `/reports`) if the backend prefers smaller responses. Keep `data` flat so the frontend reads top-level keys.

### `PUT /organizations` — update org profile and settings

Authenticated (SUPER_ADMIN, ORG_ADMIN). `CAMPAIGN_MANAGER` is denied.

**Request body example:**

```json
{ "name": "Dr. Msuya Foundation", "serviceFeePercent": 5, "settings": { "notifyOnDonation": true } }
```

**Response — `200 OK`:** returns the updated `Organization`.

---
## 7. Users / User

> **Backed by frontend pages:** `/dashboard/users` — user list, "Invite User Member", change role, resend invite, remove member.

Routes manage the org's user members (all have `role` in `SUPER_ADMIN | ORG_ADMIN | CAMPAIGN_MANAGER`). Creating a user returns a **temporary password** (or an invite link) the admin shares with them. Invitation emails are required later — **[TO BUILD]**.

### `GET /users` — list user members

Authenticated (all roles). Org-scoped.

**Query params:** `search` (name/email), `role` (`ORG_ADMIN` | `CAMPAIGN_MANAGER`), `status`, plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "users": [ { "id": "4", "firstName": "Peter", "lastName": "John", "name": "Peter John", "email": "peter@changia.org.tz", "role": "CAMPAIGN_MANAGER", "status": "ACTIVE", "lastActive": "2026-01-03T10:00:00.000Z", "avatar": null } ],
    "pagination": { "page": 1, "limit": 25, "total": 3, "totalPages": 1 }
  }
}
```

### `POST /users` — invite a user member (the User page "Invite User Member")

Authenticated (SUPER_ADMIN, ORG_ADMIN). `CAMPAIGN_MANAGER` denied. This backs the **"Invite User Member"** dialog on `http://localhost:3000/dashboard/users` — enter an email, pick a role, and send the invite. The user is created with `status: "pending"` and an invitation/link is dispatched.

**Request body:**

```json
{ "firstName": "Peter", "lastName": "John", "email": "peter@changia.org.tz", "phone": "+255755123999", "role": "CAMPAIGN_MANAGER" }
```

> **UI role label → API role mapping (the User page offers these 4 choices):**

| User page label (`User.role`) | API `ApiUser.role` to store |
|--------------------------------------|-----------------------------|
| `admin`      | `ORG_ADMIN` (or `SUPER_ADMIN` when the org is being set up platform-wide) |
| `manager`    | `ORG_ADMIN` |
| `fundraiser` | `CAMPAIGN_MANAGER` |
| `viewer`     | `CAMPAIGN_MANAGER` (read-only; enforced by a `viewer`/`readonly` user flag if you want stricter gating) |

> The User page can invite with **email + role only** (name is derived from the email address when a display name isn't supplied). The backend must accept a role label from the API enum (`ORG_ADMIN`/`CAMPAIGN_MANAGER`) and return both the canonical `ApiUser.role` **and** the friendly `User.role` label for the UI list.

**Response — `201 Created`:** returns the new `ApiUser` plus `temporaryPassword` (shown once) or an `inviteUrl`.

```json
{ "success": true, "data": { "user": { "...": "ApiUser", "status": "PENDING" }, "temporaryPassword": "Xk9!qW2z", "inviteUrl": "https://changia.org.tz/accept-invite/TOKEN" } }
```

**Errors:** `409 EMAIL_TAKEN`, `400 VALIDATION_ERROR`.

### `POST /users/:id/resend-invite` — resend an invite **[TO BUILD]**

Authenticated (SUPER_ADMIN, ORG_ADMIN). Backs the User page's **"Resend Invite"** action for a member still `pending`. Re-sends the invite email / regenerates the token.

**Response — `200 OK`:** `{ "success": true, "message": "Invitation resent" }`

**Errors:** `404 NOT_FOUND`, `400` (member is not `pending`).

### `PUT /users/:id` — update a user member

Authenticated (SUPER_ADMIN, ORG_ADMIN).

**Request body:** any of `firstName`, `lastName`, `phone`, `role`, `status`. Guard: an org must always keep at least one active `ORG_ADMIN`.

**Response — `200 OK`:** updated `ApiUser`.

### `DELETE /users/:id` — remove a user member

Authenticated (SUPER_ADMIN, ORG_ADMIN). Cannot self-delete or remove the last remaining or.'s last `ORG_ADMIN`.

**Response — `200 OK`:** `{ "success": true, "message": "User removed" }`

**Errors:** `400` (last admin), `409 RECORD_IN_USE`, `404 NOT_FOUND`.

---

## 8. Campaigns

> **Backed by frontend pages:** `/dashboard/campaigns` (list + status tabs), `/dashboard/campaigns/new` (create), `/dashboard/approvals` (the cross-cutting approvals workspace — campaigns, edits, fees, closures, reports, payouts, plus a "My history" tab backed by `GET /approvals/history`), and `/dashboard/campaigns/:id` (detail with Overview · Donors · Transactions · Evidence · User tabs).

Campaigns have an approval workflow and a status lifecycle. All authenticated org members can read; only `SUPER_ADMIN`/`ORG_ADMIN` can create/manage; managers only view campaigns they're assigned to.

### Edit / delete / stop rules (IMPORTANT)

| Lifecycle phase | Edit | Delete | Stop (pause / cancel / complete) |
|------------------|:---:|:---:|:---:|
| **Draft** (created, not yet published) | ✅ allowed | ✅ allowed | — |
| **Pending review** (submitted, not yet approved) | ✅ allowed | ✅ allowed | — |
| **Published / Active** (approved & live) | ❌ **NOT allowed** | ❌ **NOT allowed** | ✅ allowed |
| **Paused / Completed / Cancelled** | ❌ NOT allowed | ❌ NOT allowed | (pause/resume only on active) |

> **Rule of thumb:** a campaign may be **edited or deleted** freely while it is a **draft or pending**. Once it is **published (approved → active)** it can **no longer be edited or deleted** — it may only be **stopped** via `POST /campaigns/:id/status` (`pause`, `resume`, `complete`, `cancel`). Attempting to edit/delete a published campaign returns `409` (`CANNOT_EDIT_PUBLISHED` / `CANNOT_DELETE_PUBLISHED`).

### Campaign status lifecycle

```
draft → submitted (pending approval) → approved (active)
                                          │
                 active → paused → active  │
                 active → completed        │
                 (any)  → cancelled        │
                                          ├→ completed
                                          └→ cancelled
```

### `GET /campaigns` — list campaigns

Authenticated (all roles). Orgs see their own; managers additionally only get campaigns in `memberIds`.

**Query params:** `status` (`draft|pending|active|paused|completed|cancelled`), `search`, `assignedToMe` (`true` for a manager's own list), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "campaigns": [ { "...": "Campaign", "progressPercent": 62, "serviceFeeAmount": 500000 } ],
    "pagination": { "page": 1, "limit": 25, "total": 12, "totalPages": 1 }
  }
}
```

### `GET /campaigns/:id` — campaign detail (everything the campaign page renders)

Authenticated (all roles). Returns the full campaign object the detail page at `http://localhost:3000/dashboard/campaigns/:id` needs. This page renders **a lot** — the status banner, header meta, progress card, and five tabs (Overview, Donors, Transactions, Evidence, User) — so the response must include every field below.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "campaign": {
      "id": "1",
      "organizationId": "2",
      "name": "School Laboratory",
      "category": "Education",
      "description": "Build a science lab.",
      "goal": 10000000,
      "raised": 6200000,
      "donors": 31,
      "progressPercent": 62,
      "status": "pending",
      "startDate": "2026-02-01",
      "endDate": "2026-06-30",
      "contactPhone": "+255755123999",
      "ownerName": "Neema Msuya",
      "ownerEmail": "neema@changia.org.tz",
      "image": "https://…/lab.jpg",
      "evidence": ["https://…/quote.pdf"],
      "memberIds": ["4", "6"],
      "submittedAt": "2026-08-12T09:00:00.000Z",
      "recentDonations": [ { "...": "Donation" } ]
    }
  }
}
```

**Every field the page uses (and what it powers):**

| Field | Rendered as |
|-------|-------------|
| `name` | Page title |
| `category` | Header meta chip (with Megaphone icon); hidden if absent |
| `startDate` → `endDate` | Header chip "`2026-02-01 → 2026-06-30`" (Calendar icon) |
| `ownerName` | Header chip (UserRound) **and** the Overview "Owner" card + the User tab's "Campaign owner" card |
| `ownerEmail` | Overview "Owner" card subtitle (falls back to `contactPhone`, then "No contact set") |
| `submittedAt` | "Submitted for approval on `<localized date>`" under the header — **only shown when present** |
| `status` | Status badge. **Pending** also triggers the orange "Awaiting admin approval" banner: *"This campaign has been submitted but is not live yet. Once an admin approves it, it will be published and ready to share with donors."* The badge maps via `campaignStatusMap`: `active`→Active, `draft`→Draft, `completed`→Completed, `paused`→Paused, `pending`→Pending Approval |
| `image` | Cover image at the top of the header card (hidden if absent) |
| `raised` / `goal` / `donors` / `progressPercent` | Progress card: "`TZS raised` of `TZS goal`", `progressPercent% funded`, `donors` donors |
| `description` | Overview → "About" paragraph (falls back to "No description provided.") |
| `contactPhone` | Overview → "About" card (Phone icon) |
| `evidence` | Overview → "Evidence" tab image grid (array of image URLs) |
| `memberIds` | Overview → "User" tab assign/remove list (which members are `assigned`) |
| `recentDonations` | Overview → "Transactions" tab (donations with `donorName`, `date`, `channel`, `amount`) |

> **Donors / Transactions tab data:** the Donors tab (distinct donors with total given, no. of gifts, last gift date) and Transactions tab (full list + "Total collected") are served by `GET /donations?campaignId=:id` — each `Donation` must carry `donorId`, `donorName`, `campaignId`, `campaign`, `channel`, `date`, `amount`. The UI aggregates distinct donors itself; you may alternatively return a `donors` aggregation array on the campaign if you prefer to precompute it.

### `POST /campaigns` — create a campaign

Authenticated (ORG_ADMIN, CAMPAIGN_MANAGER). **`SUPER_ADMIN` cannot create a campaign** (see §3) — a `SUPER_ADMIN` hitting this returns `403`.

> A `CAMPAIGN_MANAGER` is additionally blocked (`409 CAMPAIGN_PROOF_REQUIRED`) while any campaign assigned to them is `completed` without an **approved** completion report — see "Completion reports" below. Surface the error message (it names the blocking campaign) rather than a generic failure toast.

**Request body:**

```json
{
  "name": "School Laboratory",
  "goal": 10000000,
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "description": "Build a science lab",
  "category": "Education",
  "contactPhone": "+255755123999",
  "image": "https://…/lab.jpg",
  "evidence": ["https://…/quote.pdf"],
  "memberIds": ["4", "6"]
}
```

> `serviceFeePercent` is taken from the org's platform config by default. The backend must compute `publicTarget = goal + goal * fee` and `serviceFeeAmount` and return them.

**Response — `201 Created`:** returns the created `Campaign` with `status: "PENDING"`.

**Errors:** `400 VALIDATION_ERROR`, `403 INSUFFICIENT_ROLE`.

### `PUT /campaigns/:id` — edit a draft/pending campaign

Authenticated (SUPER_ADMIN, ORG_ADMIN). **Only while `status` is `draft` or `pending`.**

- Edits apply to the full allowed field set (name, goal, dates, description, category, contactPhone, image, evidence, memberIds).
- **After publish** (`active`/`completed`/`paused`/`cancelled`) editing is **not allowed** → return `409 CANNOT_EDIT_PUBLISHED`.
- Recomputes `publicTarget`/`serviceFeeAmount` if `goal` changes.

**Response — `200 OK`:** updated `Campaign`.

### `DELETE /campaigns/:id` — delete an unpublished campaign

Authenticated (SUPER_ADMIN, ORG_ADMIN). **Only while `status` is `draft` or `pending`.**

- Soft-delete or hard-delete the campaign row (recommended: soft-delete with a `deletedAt` mark so audit/users history is retained).
- **After publish** deletion is **not allowed** → return `409 CANNOT_DELETE_PUBLISHED`. A published campaign may only be **stopped** (paused/cancelled/completed).
- Also validate the campaign belongs to the caller's organization (org-scoped) → `404 NOT_FOUND` otherwise.

**Response — `200 OK`:** `{ "success": true, "message": "Campaign deleted" }`

### `POST /campaigns/:id/submit` — submit for approval

Authenticated (SUPER_ADMIN, ORG_ADMIN). Moves `draft → pending`.

**Response — `200 OK`:** `{ "success": true, "data": { "campaign": { "...": "Campaign", "status": "pending" } } }`

### `POST /campaigns/:id/approve` — approve a submitted campaign

Authenticated (SUPER_ADMIN, ORG_ADMIN). Moves `pending → active`.

**Response — `200 OK`:** returns campaign with `status: "active"`.

### `POST /campaigns/:id/status` — stop a live campaign (pause / resume / complete / cancel)

Authenticated (SUPER_ADMIN, ORG_ADMIN). When a campaign is **published/active** this is the **only** administrative action allowed — it cannot be edited or deleted.

**Request body:**

```json
{ "action": "pause" }
```

Allowed `action` values: `pause`, `resume`, `complete`, `cancel`.

| Action | Allowed from | → to |
|--------|--------------|------|
| `pause` | `active` | `paused` |
| `resume` | `paused` | `active` |
| `complete` | `active` | `completed` |
| `cancel` | `draft`/`pending`/`active`/`paused` | `cancelled` |

- `pause` stops new payment requests/donations; `resume` re-opens them; `complete` marks the goal finished; `cancel` permanently closes the campaign.
- **Response — `200 OK`:** returns campaign with updated `status`.

### `PUT /campaigns/:id/managers` — assign campaign managers

Authenticated (SUPER_ADMIN, ORG_ADMIN). Sets which `CAMPAIGN_MANAGER` users (`memberIds`) work on the campaign.

**Request body:**

```json
{ "memberIds": ["4", "6"] }
```

**Response — `200 OK`:** returns the updated campaign with `memberIds`.

### `POST /campaigns/:id/submit` → audit

Every create/update/delete/submit/approve/status change must write an immutable `audit_logs` entry (e.g. `campaign.created`, `campaign.updated`, `campaign.deleted`, `campaign.approved`, `campaign.paused`).

### Completion reports — mandatory proof of fund usage (powers the Evidence tab + the public blog)

This is the real, backend-wired version of the `Campaign.evidence` field sketched in §4 — once a campaign is `completed`, the **assigned `CAMPAIGN_MANAGER` must submit** a narrative + at least one photo proving how the funds were used, before an admin approves it. It's a separate sub-resource (not a plain field) because it carries its own review workflow and file uploads.

```ts
interface CampaignCompletionReport {
  id: string;
  campaignId: string;
  summary: string;                 // narrative, min 20 chars
  amountUtilized: number | null;   // TZS integer
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedBy: { id: string; firstName: string; lastName: string } | null;
  submittedAt: string;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  images: { id: string; url: string }[];  // absolute /uploads/... URLs
}
```

Every `Campaign` returned by `GET /campaigns` / `GET /campaigns/:id` additionally carries `completionReport: { status, submittedAt, reviewedAt } | null` when `status === 'completed'` — enough to badge the campaigns list without an extra request.

- **`GET /campaigns/:id/completion-report`** — any org member with access to the campaign. Returns the full `CampaignCompletionReport`, or `data: null`.
- **`POST /campaigns/:id/completion-report`** — assigned `CAMPAIGN_MANAGER` only. **`multipart/form-data`** (not JSON): `summary` (text, required), `amountUtilized` (text/number, optional), `images` (file[], **required, ≥1**, ≤8, JPEG/PNG/WEBP, ≤5MB each — field name must be `images`). Resubmitting replaces the previous submission and resets to `PENDING_REVIEW`; an `APPROVED` report is locked (`409 REPORT_ALREADY_APPROVED`). Errors: `400 CAMPAIGN_NOT_COMPLETED`, `400 PROOF_IMAGES_REQUIRED`, `400 INVALID_IMAGE_TYPE`.
- **`POST /campaigns/:id/completion-report/review`** — `SUPER_ADMIN`/`ORG_ADMIN` only. Body `{ "approved": boolean, "notes"?: string }`. Sets `APPROVED`/`REJECTED`. **Approval is what makes the campaign eligible for the public blog** (see below) and unblocks the manager's next `POST /campaigns`.

**Frontend note:** because the endpoint takes `FormData`, `src/lib/api-client.ts`'s `request()` must skip `JSON.stringify`/`Content-Type: application/json` when `body instanceof FormData` and let the browser set the multipart boundary.

### In-kind gifts & the campaign payment breakdown

Not every contribution is money. A campaign can also receive **in-kind gifts** (donated goods, services or time) recorded with an *estimated* TZS value.

- **`GET /campaigns/payments/breakdown`** — any authenticated member (a `CAMPAIGN_MANAGER` gets only their assigned campaigns). Array of `{ campaignId, name, goal, raised, paid, unpaid, promisedPaid, promisedUnpaid, giftValue }` — the split (TZS) behind the dashboard payment pie per campaign. `paid` = confirmed money with no pledge, `unpaid` = goal not covered by a pledge, `promisedPaid` / `promisedUnpaid` = received / still-owed against donor pledges, `giftValue` = summed in-kind estimates. A row sums to `goal + giftValue`.
- **`GET /campaigns/:id/gifts`** — any member with campaign access. `Gift[]`: `{ id, campaignId, donorId, donorName, description, estimatedValue, receivedAt, createdAt }`.
- **`POST /campaigns/:id/gifts`** — `SUPER_ADMIN` / `ORG_ADMIN` / assigned `CAMPAIGN_MANAGER`. JSON `{ description (1–300, required), estimatedValue? (int TZS ≥ 0, default 0), donorId?, receivedAt? "YYYY-MM-DD" }`. Returns the updated `Gift[]`.
- **`DELETE /campaigns/:id/gifts/:giftId`** — same roles. Returns the updated `Gift[]`.

Recorded on the campaign detail page's **Board** tab (alongside the donor pledge board).

### Public — completed-campaign blog posts (`/public/campaigns/completed`, unauthenticated)

This is what actually **posts a campaign to the public blog**: a campaign shows up here once it's `completed` **and** its completion report is `APPROVED`. Used by the marketing `/blog` page and a new `/blog/campaign/:slug` detail route (merge these into the existing Markdown blog feed, sorted by `publishedAt`).

- `GET /public/campaigns/completed?locale=&page=&limit=` → `{ campaigns: [{ id, slug, title, excerpt, image, organizationName, goalAmount, raisedAmount, donorCount, publishedAt }], pagination }`.
- `GET /public/campaigns/completed/:slug?locale=` → full story: adds `campaignStory`, `category`, `progressPercent`, `startDate`/`endDate`, `completionSummary`, `amountUtilized`, `proofImages: string[]`.

---
## 9. Donors (CRM)

> **Backed by frontend pages:** `/dashboard/donors` (Donor Pool with full filter set + counts), `/dashboard/donors/import`, and `/dashboard/donors/:id` (profile + donation history).

A consent-aware donor pool. All roles can list and add donors; only `SUPER_ADMIN`/`ORG_ADMIN` can update/delete/import. This module powers the **Donor Pool** page at `http://localhost:3000/dashboard/donors` and the **donor profile** page at `http://localhost:3000/dashboard/donors/:id`.

### `GET /donors` — list donors (with the full pool filter set)

Authenticated (all roles). Org-scoped. Managers see the org's consented donors they may target. This is the **Donor Pool** list endpoint — it must support **every filter the UI exposes** and return accurate per-filter counts so the page can show "N donors total" and segmented chips.

**Query params (the complete "ensure filter" set the Donor Pool page uses):**

| Param | Values | Behaviour |
|-------|--------|-----------|
| `search` | free text | Case-insensitive **partial match** across `firstName`, `lastName`, `email`, `phone` **and** `location` — the pool page searches all of these at once |
| `status` | `active` \| `inactive` \| `prospect` \| `lapsed` | Exact match on `Donor.status` |
| `consentStatus` | `consented` \| `pending` \| `withdrawn` | Exact match on `Donor.consentStatus` — used for the consent-aware "ready to engage" count |
| `tag` | any `DonorTag` (`major-donor`, `recurring`, `corporate`, `anonymous`, `volunteer`, `diaspora`, `first-time`) | Donor must carry the tag in its `tags` array |
| `channel` | `email` \| `sms` \| `whatsapp` \| `phone` \| `post` | Exact match on `Donor.preferredChannel` (needed for "which push channel am I allowed to send on") |
| `page` | integer ≥ 1 | 1-based page number |
| `limit` | integer 1–100 (default 25) | Page size |

> **Filter combination rule:** the frontend combines `search` with `status` and `consentStatus` filters together (e.g. search + status + consent at once), so the backend must treat every query param as an **AND** condition, never mutually exclusive.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "donors": [ { "...": "Donor" } ],
    "counts": {
      "total": 84,
      "active": 50, "inactive": 6, "prospect": 20, "lapsed": 8,
      "consented": 60, "pending": 12, "withdrawn": 12,
      "channels": { "email": 30, "sms": 10, "whatsapp": 25, "phone": 12, "post": 7 }
    },
    "pagination": { "page": 1, "limit": 25, "total": 84, "totalPages": 4 }
  }
}
```

> The `counts` object is **optional but recommended** — it lets the UI render the "N donors total", status/consent segmented chips and the manager's "X consented donors ready to engage" figure without N+1 requests. If you prefer separate lightweight endpoints, expose `GET /donors/stats` returning the same `counts` shape.

### `GET /donors/:id` — donor detail

Authenticated (all roles). Returns the donor plus their **donation history** for the profile page (`http://localhost:3000/dashboard/donors/:id`).

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "donor": { "...": "Donor" },
    "donations": [
      { "id": "31", "campaignId": "1", "campaign": "School Laboratory", "amount": 200000, "channel": "whatsapp", "date": "2026-01-03", "status": "completed", "receiptNumber": "CHG-2026-000031" }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 12, "totalPages": 1 }
  }
}
```

> The `donations` array is the donor's **transaction history** (the "Donation History" panel). It can alternatively be served by `GET /donations?donorId=:id` — the `Donation` objects returned must carry `campaignId` + `campaign` (name) so the UI can label each gift.

### `POST /donors` — add a donor (with consent)

Authenticated (all roles, matching the `donor:add` permission).

**Request body:**

```json
{
  "firstName": "Amina",
  "lastName": "Hassan",
  "email": "amina@example.com",
  "phone": "+255752222333",
  "location": "Dar es Salaam",
  "consentStatus": "consented",
  "preferredChannel": "whatsapp",
  "tags": ["first-time"]
}
```

**Response — `201 Created`:** returns the new `Donor`.

**Errors:** `400 VALIDATION_ERROR`, `409 DUPLICATE_RECORD` (unique email/phone per org).

### `PUT /donors/:id` — update a donor

Authenticated (SUPER_ADMIN, ORG_ADMIN). Update profile, consent, tags, status, notes.

**Response — `200 OK`:** updated `Donor`.

### `DELETE /donors/:id` — remove a donor

Authenticated (SUPER_ADMIN, ORG_ADMIN). If the donor has confirmed donations, prefer deactivating (`status: inactive`) rather than hard-deleting; return `409 RECORD_IN_USE` if hard delete is attempted.

**Response — `200 OK`:** `{ "success": true, "message": "Donor removed" }`

### `POST /donors/import` — bulk-import donors **[TO BUILD]**

Authenticated (SUPER_ADMIN, ORG_ADMIN). Accepts CSV/JSON array, dedupes by email/phone, and returns an import report.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": { "created": 40, "updated": 5, "duplicates": 2, "failed": 0, "errors": [] }
}
```

---

## 10. Donations & payments

> **Backed by frontend pages:** the campaign detail **Transactions** tab (`/dashboard/campaigns/:id`), the campaign detail / donor-pool **"Record Donation"** action, and the donor profile **Donation History** panel (`/dashboard/donors/:id`).

Donations are **only ever confirmed by a gateway callback** — never by the app body. The frontend won't double-count because of a unique `idempotencyKey` per payment attempt. Amounts are whole TZS integers. **The platform never stores or asks for a mobile-money PIN.**

### `GET /donations` — list confirmed donations

Authenticated (all roles). Org-scoped, newest first. Powers the campaign detail **Transactions** tab and the **Donation History** panel on a donor profile.

**Query params:** `campaignId`, `donorId` (donor's transaction history), `channel`, `status`, `from`/`to` (ISO dates), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "donations": [ { "...": "Donation" } ],
    "pagination": { "page": 1, "limit": 25, "total": 120, "totalPages": 5 }
  }
}
```

> Each `Donation` must include `donorId`, `donorName`, `campaignId` and `campaign` (name) — the UI tabs show all of these columns (see the `Donation` model in section 4).

### `POST /donations` — record a manual / offline donation

Authenticated (SUPER_ADMIN, ORG_ADMIN). This is the **"Record Donation"** action on the campaign detail page (`http://localhost:3000/dashboard/campaigns/:id`) and the **"Record Donation"** menu item on the Donor Pool row. It creates a **confirmed** `completed` donation directly (e.g. cash, bank transfer, or a gift already collected offline), without going through a payment attempt. It must atomically bump the campaign's `raised` + `donor` counts in the **same transaction**.

**Request body:**

```json
{ "campaignId": "1", "donorId": "12", "amount": 20000, "channel": "whatsapp", "date": "2026-01-03" }
```

| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `campaignId` | string | ✅ | Must belong to the caller's org; campaign must be `active` (not paused/completed) |
| `donorId` | string | ✅ | Must belong to the caller's org |
| `amount` | integer TZS | ✅ | Whole number ≥ 1 and ≤ configured max single donation |
| `channel` | `email\|sms\|whatsapp\|phone\|post` | ✅ | Defaults to the donor's `preferredChannel` if omitted |
| `date` | ISO date | ❌ | Defaults to now |
| `isAnonymous` | boolean | ❌ | Default `false` |

**Response — `201 Created`:** returns the created `Donation` with `status: "completed"`, a generated `receiptNumber` (`CHG-YYYY-NNNNNN`) and `confirmedAt` set.

```json
{
  "success": true,
  "data": {
    "donation": { "id": "31", "donorId": "12", "donorName": "Peter John", "campaignId": "1", "campaign": "School Laboratory", "amount": 20000, "channel": "whatsapp", "date": "2026-01-03", "status": "completed", "method": "MANUAL", "receiptNumber": "CHG-2026-000031", "confirmedAt": "2026-01-03T10:00:00.000Z" }
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `403 INSUFFICIENT_ROLE`, `404 NOT_FOUND` (campaign/donor not in org), `409` (explicit duplicate transaction via an `idempotencyKey`).

> **Guarantee:** this record-donation call and the `raised`/`donorCount` update on the campaign must be atomic — same transaction, confirmed-only logic, and a unique receipt number, exactly like a gateway-confirmed donation.

### `POST /donations/campaigns/:campaignId/attempts` — send a push payment request

Authenticated (all roles; managers only for campaigns assigned to them). Requires the donor's `consentStatus === "consented"`.

**Request body:**

```json
{ "donorId": "12", "amount": 20000 }
```

**Response — `201 Created`:**

```json
{ "success": true, "data": { "attempt": { "...": "PaymentAttempt", "status": "PENDING" } } }
```

**Errors:** `400` (donor not consented / campaign not active / amount 0), `403 INSUFFICIENT_ROLE` (manager on unassigned campaign).

### `GET /donations/campaigns/:campaignId/attempts` — payment request status

Authenticated (all roles). Lists attempts for a campaign with current status and any linked donation.

**Response — `200 OK`:** `{ "success": true, "data": { "attempts": [ { "...": "PaymentAttempt" } ] } }`

### `POST /donations/simulate-callback` — simulate gateway callback (dev)

Authenticated (SUPER_ADMIN, ORG_ADMIN). **Development only.** Simulates the payment gateway confirming (or failing) an attempt. Campaignion must replace this with a signature-verified webhook.

**Request body example:**

```json
{ "attemptId": "7", "result": "PAID", "gatewayRef": "GW-889900" }
```

**Response — `200 OK`:** returns the resolved `donation` (or `null` on failure) plus the attempt status.

```json
{ "success": true, "data": { "donation": { "...": "Donation", "status": "completed", "receiptNumber": "CHG-2026-000031" }, "attempt": { "...": "PaymentAttempt", "status": "PAID" } } }
```

**Guarantees the backend must provide (money rules):**

- A donation is inserted in the **same transaction** as the `raised`/`donor` update on the campaign.
- **Idempotency:** the same `attemptId` resolved twice → second request returns `409 ALREADY_RESOLVED` / no new donation.
- **Confirmed only:** `raised` and `donorCount` use confirmed donations only.
- **Receipt numbers** follow the `CHG-YYYY-NNNNNN` sequence.

### `POST /donations/webhook` — real gateway webhook **[TO BUILD, PRODUCTION]**

Signature-verified callback from the live payment provider. Same idempotency and confirmed-only rules as `simulate-callback`. Public (no JWT) but must verify the provider signature.

---
## 11. Audit logs

> **Backed by frontend pages:** `/dashboard/audit-log` (search / severity / resource filters + "Export CSV").

Read-only, immutable security trail. Only `SUPER_ADMIN` may view it in the UI (the `audit:view` permission).

### `GET /audit-logs` — list audit entries

Authenticated; **role-gated to `SUPER_ADMIN`** by default (mirror `audit:view`). This backs the Audit Log page at `http://localhost:3000/dashboard/audit-log`.

**Query params:** `action` (partial), `severity` (`INFO|WARNING|CRITICAL`), `resource` (e.g. `donation`, `campaign`, `user`, `donor`, `organization`), `search` (actor email / resource / details), plus `page`/`limit`. All filters combine as AND.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "logs": [ { "...": "AuditLog" } ],
    "pagination": { "page": 1, "limit": 50, "total": 1200, "totalPages": 24 }
  }
}
```

### `GET /audit-logs/export` — export CSV `[TO BUILD]`

Authenticated (`SUPER_ADMIN`). Backs the Audit Log **"Export CSV"** button. Returns a CSV download of the currently-filtered logs (same query params as `GET /audit-logs`), columns: `timestamp, action, resource, resourceId, user, userId, ipAddress, severity, details`. Retention: the page states entries are **retained for 90 days**.

### `GET /audit-logs/recent` — recent entries

Authenticated (`SUPER_ADMIN`). The latest ~10 entries for the activity feed. Same log shape, no pagination.

**Response — `200 OK`:** `{ "success": true, "data": [ { "...": "AuditLog" } ] }`

**Action values used by the UI feed:** `donation.confirmed`, `donor_added`, `donor_updated`, `campaign_created`, `import`, `note_added`, `campaign.approved`.

---

## 12. Payouts `[TO BUILD]`

> **Backed by frontend pages:** `/dashboard/payouts` (available to `SUPER_ADMIN` / `ORG_ADMIN` only).

Org admins request withdrawals; the system/super-admin approves and reconciles them. Managers **never** access payouts.

### `GET /payouts` — list payout requests

Authenticated (SUPER_ADMIN, ORG_ADMIN).

**Response — `200 OK`:**

```json
{ "success": true, "data": { "payouts": [ { "id": "1", "amount": 2000000, "status": "PENDING", "method": "bank", "requestedAt": "2026-01-05T08:00:00.000Z", "approvedAt": null } ], "pagination": { "page": 1, "limit": 25, "total": 2, "totalPages": 1 } } }
```

### `POST /payouts` — request a payout

Authenticated (SUPER_ADMIN, ORG_ADMIN).

**Request body:** `{ "amount": 2000000, "method": "bank", "accountDetails": { } }`

**Response — `201 Created`:** the new payout with `status: "PENDING"`.

### `POST /payouts/:id/approve` / `POST /payouts/:id/reject` — decide a payout

Authenticated (`SUPER_ADMIN`).

**Response — `200 OK`:** the updated payout status.

---
## 13. Settings `[TO BUILD]`

> **Backed by frontend pages:** `/dashboard/settings` — Organisation, Notifications, Security and Localisation tabs, plus the "Delete Organisation" danger zone.

Backs the **Settings** page at `http://localhost:3000/dashboard/settings`, which has four tabs: **Organisation**, **Notifications**, **Security** and **Localisation**.

### `GET/PUT /settings/platform` — platform config

Authenticated (`SUPER_ADMIN`, mirrors the `settings:platform` permission).

```json
{ "defaultServiceFeePercent": 5, "gateway": { "provider": "vodacom_mpesa", "sandbox": false }, "currency": "TZS" }
```

### `GET/PUT /settings/org` — organization preferences

Authenticated (SUPER_ADMIN, ORG_ADMIN). `CAMPAIGN_MANAGER` denied. These are the persisted fields for the Settings page:

```json
{
  "brandName": "Dr. Msuya Foundation",
  "logoUrl": "https://…/logo.png",
  "orgName": "Changia Foundation TZ",
  "registrationNumber": "NGO-TZ-2021-004872",
  "primaryEmail": "hello@changia.tz",
  "phone": "+255755000111",
  "defaultChannel": "whatsapp",
  "currency": "TZS",
  "language": "en",
  "timezone": "eat",
  "dateFormat": "dmy",
  "notifications": {
    "notifyOnDonation": true,
    "notifyOnCampaignStatus": true,
    "notifyOnUserInvite": true
  },
  "security": {
    "twoFactorEnabled": false,
    "loginAlerts": true
  }
}
```

> **Enums the Settings page uses:** `currency` ∈ `TZS | USD | EUR | GBP`; `language` ∈ `en | sw`; `timezone` ∈ `eat | utc`; `dateFormat` ∈ `dmy | mdy | ymd`. The backend must validate these and store them so they can be re-served on reload.

### `DELETE /organizations` — delete organization `[TO BUILD]`

Authenticated (SUPER_ADMIN, ORG_ADMIN). Backs the Settings **"Delete Organisation"** danger-zone action. Permanently removes the org and all dependent data (campaigns, donors, donations, users, audit logs) — requires the caller's fresh password (`{ "password": "…" }`) as confirmation.

**Response — `200 OK`:** `{ "success": true, "message": "Organization deleted" }`

**Errors:** `401 INVALID_PASSWORD`, `403 INSUFFICIENT_ROLE`.

---

## 14. Donor pools

> **Backed by frontend pages:** `/dashboard/pools`, `/dashboard/pools/[id]`, `/dashboard/pools/new`, `/dashboard/pools/anomalous` (see `DonorPool` in [§4](#4-data-models-types-the-api-must-use)).

A `CAMPAIGN_MANAGER` can create multiple named pools by category
(`FAMILY`/`SCHOOL`/`STUDENT`/`OFFICE`), each visible **only to them** —
`ORG_ADMIN` can also create pools; `SUPER_ADMIN` **cannot** (`POST /donor-pools`
is `ORG_ADMIN`/`CAMPAIGN_MANAGER` only — same rule as campaign creation, §8).
`ORG_ADMIN`/`SUPER_ADMIN` can still browse and manage (edit/delete) any
manager's pools (a "created by manager" filter drives this on
`/dashboard/pools`). Every pool
member's payment status (`UNPAID`/`PARTIAL`/`PAID_FULL`) is derived by
comparing confirmed donations to the pledge — never stored by the frontend.

Unrecognized payments (a donor who paid with a phone/method the org hasn't
registered) are parked in a **per-manager anomalous pool**
(`GET /donor-pools/anomalous`, `isSystem: true`) — the manager who owns the
campaign that received the payment. They can be re-attached to a real donor
from `/dashboard/pools/anomalous` (`POST /donor-pools/anomalous/:id/merge`),
optionally registering the payment method that was used so it's recognized
next time.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/donor-pools` | List (own; admin: all / filter by `createdBy`) / create |
| GET / PUT / DELETE | `/donor-pools/:id` | Detail (+ `?campaignId=` comparison) / update / delete |
| POST | `/donor-pools/:id/members` | Add existing or newly-created donors |
| PUT / DELETE | `/donor-pools/:id/members/:donorId` | Set expected pledge / remove |
| GET | `/donor-pools/duplicates` | Donors present in more than one pool |
| POST | `/donor-pools/duplicates/resolve` | Pick which pool each duplicate donor keeps |
| GET | `/donor-pools/anomalous` (+ `?managerId=`, admin only) | Own pool, or (admin) any manager's / unassigned fallback |
| POST | `/donor-pools/anomalous/:donorId/merge` | Re-attach to a known donor |
| POST | `/donor-pools/reminders/send` | Manual bulk reminder to selected donors |

See `Backend/API_REFERENCE.md` → **"Donor pools module"** for full request/response payloads.

### Campaign-time import

`POST /campaigns/:id/pools/import` (see [§8](#8-campaigns)) lets a manager pull
one or more of their pools into a campaign — either while creating it
(`campaigns/new`) or later from the campaign page. When the same donor
appears in more than one selected pool, `POST /campaigns/:id/pools/preview`
returns a `duplicateGroups` list; the frontend must ask **which pool the
donor should stay attached to** and send that back as `duplicateChoices` on
the import call — it is not auto-resolved silently.

---

## 15. Reminder templates & auto-resend schedules

> **Backed by frontend pages:** `/dashboard/reminders` (pending approval inbox), `/dashboard/reminders/templates`, `/dashboard/reminders/schedules` (see `MessageTemplate` / `ReminderSchedule` / `PendingReminderBatch` in [§4](#4-data-models-types-the-api-must-use)).

Two independent pieces:

1. **Templates** — reusable per-channel (SMS/WhatsApp/Email) message bodies with `{{donorName}}`/`{{amountDue}}`/`{{campaignName}}`/`{{orgName}}` placeholders. Selectable from the existing manual "Send Reminder" dialogs on the pool and campaign pages, or attached to a schedule.
2. **Auto-resend schedules** — an interval (days) attached to either a non-system donor pool or a campaign, with the channels to use. **The anomalous/system pool can never be scheduled.** Every due cycle only creates a `PendingReminderBatch` — the frontend must always require an explicit "Confirm & Send" click (`POST /reminder-schedules/pending/:id/confirm`) before treating it as sent; a "Skip" action (`POST .../skip`) is also available. Each donor in a confirmed batch is messaged on their **own** `preferredChannel`, not a single channel picked for the whole batch.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/reminder-templates` | List / create |
| PUT / DELETE | `/reminder-templates/:id` | Update / delete |
| GET / POST | `/reminder-schedules` | List / create |
| PUT / DELETE | `/reminder-schedules/:id` | Update / delete |
| GET | `/reminder-schedules/pending` | Batches awaiting confirmation |
| POST | `/reminder-schedules/pending/:id/confirm` \| `/skip` | Send now / skip this cycle |

See `Backend/API_REFERENCE.md` → **"Reminder templates module"** / **"Reminder schedules (auto-resend) module"** for full payloads. Actual delivery depends on the backend's `MESSAGE_PROVIDER` config — see `Backend/README.md` → "Messaging providers setup"; in `simulated` mode (the default) sends are logged, not delivered, which is fine for local development.

---

## 16. Public campaign page

> **Backed by frontend pages:** the public shareable campaign page at `/c/:slug` (marketing site, no auth).

The marketing/public site renders a shareable campaign page at `/c/:id` and a small donation flow **before authentication** (a donor can give without logging in). These endpoints are **public — no JWT**.

### `GET /public/campaigns/:slug` — public campaign detail `[TO BUILD]`

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": { "campaign": { "id": "1", "name": "School Laboratory", "publicTarget": 10500000, "raised": 2500000, "donors": 31, "progressPercent": 24, "status": "active", "orgName": "Dr. Msuya Foundation", "evidence": [] } }
}
```

### `POST /public/campaigns/:slug/donations` — public donate `[TO BUILD]`

Accepts a link-based donation. The backend creates a `LINK` payment attempt and calls the gateway, returning whatever the gateway needs (a short link / QR / authorization URL).

**Request body:**

```json
{ "donor": { "firstName": "Amina", "lastName": "Hassan", "email": "amina@example.com", "phone": "+255752222333", "isAnonymous": false }, "amount": 10000 }
```

**Response — `201 Created`:**

```json
{ "success": true, "data": { "paymentUrl": "https://wallet…/pay?x=…", "amount": 10000 } }
```

> Public endpoints must not expose any internal numbers beyond the public target and confirmed progress.

---
## 17. Quick start / how to test

> **Backed by frontend pages:** run the app local-first — API on `http://localhost:5000`, dashboard on `http://localhost:3000` (login at `/login`, register at `/register`).

```bash
# 1. Create the database (from repo root, points at Backend/database.sql)
mysql -u root -p < Backend/database.sql

# 2. Install + run the API
cd Backend
npm install
npm run dev              # http://localhost:5000

# 3. Run the frontend
cd ../Frontend
npm install
npm run dev              # http://localhost:3000
```

Smoke-test the auth contract first — the rest of the app depends on it:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@changia.org.tz","password":"Changia@2026"}'
```

Then verify role gating with the demo accounts (password `Changia@2026`):

| Role | Email |
|------|-------|
| Super admin (system) | `admin@changia.org.tz` |
| Org admin (admin) | `admin@msuya-foundation.org.tz` |
| Campaign manager (manager) | `manager@msuya-foundation.org.tz` |

---

## Status checklist — what the backend must build/confirm

| Module | Endpoint | Status |
|--------|----------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` | **Wired up now** — build/confirm first |
| Auth | `POST /auth/logout` | `[TO BUILD]` |
| Organizations | `GET /organizations`, `GET /organizations/stats`, `PUT /organizations` | `[TO BUILD]` |
| User | `GET/POST /users`, `PUT/DELETE /users/:id` | `[TO BUILD]` |
| Campaigns | `GET/POST /campaigns`, `GET/PUT/DELETE /campaigns/:id`, submit/approve/status/managers routes (edit/delete only before publish; stop via status after publish) | `[TO BUILD]` |
| Donors | `GET/POST /donors`, `GET/PUT/DELETE /donors/:id`, `POST /donors/import` — pool list **must support the full filter set** (`search`, `status`, `consentStatus`, `tag`, `channel`) + `counts` | `[TO BUILD]` |
| Donations | `GET /donations` (with `campaignId`/`donorId` filters), **`POST /donations` (manual/offline record)** , payment attempts, `simulate-callback` | `[TO BUILD]` |
| Audit | `GET /audit-logs` (with `resource` filter) , `GET /audit-logs/recent`, `GET /audit-logs/export` | `[TO BUILD]` |
| Payouts | payouts CRUD | `[TO BUILD]` |
| Settings | platform / org (organisation, notifications, security, localisation) , `DELETE /organizations` | `[TO BUILD]` |
| Donor pools | `GET/POST /donor-pools`, `:id` CRUD, members, duplicates, anomalous (+per-manager scoping), reminders/send | **Wired up now** |
| Reminders | `GET/POST /reminder-templates`, `GET/POST /reminder-schedules` + pending/confirm/skip | **Wired up now** — sending needs `MESSAGE_PROVIDER=live` + credentials in production |
| Public | `/public/campaigns/:slug` + public donate | `[TO BUILD]` |

---

*This document is the frontend's contract for the backend. Keep the field names, role strings, response envelope, and error codes in sync with `Frontend/src/lib/api-client.ts` and `Frontend/src/lib/dashboard/types.ts` — if a contract changes, update this file and the TypeScript types together.*