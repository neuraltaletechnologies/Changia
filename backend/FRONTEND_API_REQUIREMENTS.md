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
7. [Users / Team](#7-users--team)
8. [Campaigns](#8-campaigns)
9. [Donors (CRM)](#9-donors-crm)
10. [Donations & payments](#10-donations--payments)
11. [Audit logs](#11-audit-logs)
12. [Payouts](#12-payouts--to-build)
13. [Settings](#13-settings--to-build)
14. [Public campaign page](#14-public-campaign-page)
15. [Quick start / how to test](#15-quick-start--how-to-test)

---

## 1. Conventions & base URL

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

There are **three** platform roles. The user-facing names the customer uses map to the API role strings as follows:

| Customer term | API role (`ApiUser.role`) | Scope |
|---------------|---------------------------|-------|
| **System** | `SUPER_ADMIN` | Platform-wide: config, fee & gateway settings, org setup, support + audit. No organization by default (`organizationId: null`). |
| **Admin** | `ORG_ADMIN` | One organization: creates/approves campaigns, manages team + donor pool, requests payouts. |
| **Manager** | `CAMPAIGN_MANAGER` | Only assigned campaigns: adds consented donors, sends approved push payment requests. **No withdrawals/payouts.** |

### Permission matrix the frontend enforces in the UI (mirror this on the backend)

| Permission | `SUPER_ADMIN` | `ORG_ADMIN` | `CAMPAIGN_MANAGER` |
|------------|:---:|:---:|:---:|
| `dashboard:view` | ✅ | ✅ | ✅ |
| `campaign:view` | ✅ | ✅ | ✅ |
| `campaign:create` | ✅ | ✅ | ❌ |
| `campaign:approve` | ✅ | ✅ | ❌ |
| `donor:view` | ✅ | ✅ | ✅ |
| `donor:add` (add consented donors) | ✅ | ✅ | ✅ |
| `donor:manage` (full CRUD + import) | ✅ | ✅ | ❌ |
| `team:manage` | ✅ | ✅ | ❌ |
| `audit:view` | ✅ | ❌ | ❌ |
| `settings:platform` | ✅ | ❌ | ❌ |
| `settings:org` | ✅ | ✅ | ❌ |
| `payout:request` | ✅ | ✅ | ❌ |
| `reports:view` | ✅ | ✅ | ❌ |

**Backend rule of thumb:** a `CAMPAIGN_MANAGER` can CREATE/READ donors and create payment attempts, but can **never** update/delete donors, manage team, approve campaigns, change org settings, or do payouts. Enforce this server-side with `authorize(...)` middleware — never trust the UI/role alone.

---

## 4. Data models (types the API must use)

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

### `TeamMember` (user rows listing)

```ts
interface TeamMember {
  id: string;
  name: string;              // firstName + lastName
  email: string;
  role: 'admin' | 'manager' | 'viewer' | 'fundraiser'; // UI label — see mapping below
  status: 'active' | 'pending' | 'inactive';
  lastActive: string;
  avatar?: string;
}
```

> **Loose coupling note:** the team page currently uses UI labels `admin | manager | viewer | fundraiser`. Map from the API role: `ORG_ADMIN` → `admin`, `CAMPAIGN_MANAGER` → `manager`/`fundraiser`, `SUPER_ADMIN` → `admin`. Ideally also expose the canonical `ApiUser.role` field.

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
  type: 'donation' | 'campaign' | 'system' | 'team';
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

All auth endpoints except `/login` and `/register` require a valid JWT in the `Authorization` header. On success the backend returns `data.accessToken` and `data.user` (an `ApiUser`). The frontend stores both in `localStorage` (`changia_access_token`, `changia_user`).

> The frontend already calls these three endpoints in `api-client.ts` — **they must exist first** for the app to work at all.

### `POST /auth/register` — create organization + first admin

Public. Creates an organization and its first `ORG_ADMIN` (the "owner"), then returns a JWT so the user is logged in immediately.

**Request body:**

```json
{
  "firstName": "Neema",
  "lastName": "Msuya",
  "email": "neema@msuya.or.tz",
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
    "user": { "id": "1", "firstName": "Neema", "lastName": "Msuya", "email": "neema@msuya.or.tz", "phone": "+255755000111", "role": "ORG_ADMIN", "status": "ACTIVE", "avatarUrl": null, "organizationId": "2" },
    "organization": { "id": "2", "name": "Dr. Msuya Foundation", "slug": "dr-msuya-foundation" }
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN` (email already exists), `400` if `termsAccepted` is false.

### `POST /auth/login` — sign in

Public. **Required by the frontend login page.**

**Request body:**

```json
{ "email": "neema@msuya.or.tz", "password": "StrongPass@2026" }
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
## 7. Users / Team

Routes manage the org's team members (all have `role` in `SUPER_ADMIN | ORG_ADMIN | CAMPAIGN_MANAGER`). Creating a user returns a **temporary password** (or an invite link) the admin shares with them. Invitation emails are required later — **[TO BUILD]**.

### `GET /users` — list team members

Authenticated (all roles). Org-scoped.

**Query params:** `search` (name/email), `role` (`ORG_ADMIN` | `CAMPAIGN_MANAGER`), `status`, plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "users": [ { "id": "4", "firstName": "Peter", "lastName": "John", "name": "Peter John", "email": "peter@msuya.or.tz", "role": "CAMPAIGN_MANAGER", "status": "ACTIVE", "lastActive": "2026-01-03T10:00:00.000Z", "avatar": null } ],
    "pagination": { "page": 1, "limit": 25, "total": 3, "totalPages": 1 }
  }
}
```

### `POST /users` — invite a team member

Authenticated (SUPER_ADMIN, ORG_ADMIN). `CAMPAIGN_MANAGER` denied.

**Request body:**

```json
{ "firstName": "Peter", "lastName": "John", "email": "peter@msuya.or.tz", "phone": "+255755123999", "role": "CAMPAIGN_MANAGER" }
```

**Response — `201 Created`:** returns the new `ApiUser` plus `temporaryPassword` (shown once) or an `inviteUrl`.

```json
{ "success": true, "data": { "user": { "...": "ApiUser" }, "temporaryPassword": "Xk9!qW2z", "inviteUrl": "https://changia.co/accept-invite/TOKEN" } }
```

**Errors:** `409 EMAIL_TAKEN`, `400 VALIDATION_ERROR`.

### `PUT /users/:id` — update a team member

Authenticated (SUPER_ADMIN, ORG_ADMIN).

**Request body:** any of `firstName`, `lastName`, `phone`, `role`, `status`. Guard: an org must always keep at least one active `ORG_ADMIN`.

**Response — `200 OK`:** updated `ApiUser`.

### `DELETE /users/:id` — remove a team member

Authenticated (SUPER_ADMIN, ORG_ADMIN). Cannot self-delete or remove the last remaining or.'s last `ORG_ADMIN`.

**Response — `200 OK`:** `{ "success": true, "message": "User removed" }`

**Errors:** `400` (last admin), `409 RECORD_IN_USE`, `404 NOT_FOUND`.

---

## 8. Campaigns

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

### `GET /campaigns/:id` — campaign detail

Authenticated (all roles). Returns the campaign with `raised`, `donors`, `progressPercent`, and a `recentDonations` list (latest confirmed donations).

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": { "campaign": { "...": "Campaign", "progressPercent": 62, "recentDonations": [ { "...": "Donation" } ] } }
}
```

### `POST /campaigns` — create a campaign

Authenticated (SUPER_ADMIN, ORG_ADMIN, CAMPAIGN_MANAGER).

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

- Soft-delete or hard-delete the campaign row (recommended: soft-delete with a `deletedAt` mark so audit/team history is retained).
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

---
## 9. Donors (CRM)

A consent-aware donor pool. All roles can list and add donors; only `SUPER_ADMIN`/`ORG_ADMIN` can update/delete/import.

### `GET /donors` — list donors

Authenticated (all roles). Org-scoped. Managers see the org's consented donors they may target.

**Query params:** `search` (name/email/phone), `status`, `consentStatus`, `tag`, `channel`, plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "donors": [ { "...": "Donor" } ],
    "pagination": { "page": 1, "limit": 25, "total": 84, "totalPages": 4 }
  }
}
```

### `GET /donors/:id` — donor detail

Authenticated (all roles).

**Response — `200 OK`:** `{ "success": true, "data": { "donor": { "...": "Donor" } } }`

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

Donations are **only ever confirmed by a gateway callback** — never by the app body. The frontend won't double-count because of a unique `idempotencyKey` per payment attempt. Amounts are whole TZS integers. **The platform never stores or asks for a mobile-money PIN.**

### `GET /donations` — list confirmed donations

Authenticated (all roles). Org-scoped, newest first.

**Query params:** `campaignId`, `channel`, `status`, `from`/`to` (ISO dates), plus `page`/`limit`.

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

Read-only, immutable security trail. Only `SUPER_ADMIN` may view it in the UI (the `audit:view` permission).

### `GET /audit-logs` — list audit entries

Authenticated; **role-gated to `SUPER_ADMIN`** by default (mirror `audit:view`).

**Query params:** `action` (partial), `severity` (`INFO|WARNING|CRITICAL`), `search` (actor email / resource), plus `page`/`limit`.

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

### `GET /audit-logs/recent` — recent entries

Authenticated (`SUPER_ADMIN`). The latest ~10 entries for the activity feed. Same log shape, no pagination.

**Response — `200 OK`:** `{ "success": true, "data": [ { "...": "AuditLog" } ] }`

**Action values used by the UI feed:** `donation.confirmed`, `donor_added`, `donor_updated`, `campaign_created`, `import`, `note_added`, `campaign.approved`.

---

## 12. Payouts `[TO BUILD]`

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

### `GET/PUT /settings/platform` — platform config

Authenticated (`SUPER_ADMIN`, mirrors the `settings:platform` permission).

```json
{ "defaultServiceFeePercent": 5, "gateway": { "provider": "vodacom_mpesa", "sandbox": false }, "currency": "TZS" }
```

### `GET/PUT /settings/org` — organization preferences

Authenticated (SUPER_ADMIN, ORG_ADMIN). `CAMPAIGN_MANAGER` denied.

**Request/response example:**

```json
{
  "brandName": "Dr. Msuya Foundation",
  "logoUrl": "https://…/logo.png",
  "defaultChannel": "whatsapp",
  "notifyOnDonation": true
}
```

---

## 14. Public campaign page

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
## 15. Quick start / how to test

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
  -d '{"email":"admin@msuya.or.tz","password":"Changia@2026"}'
```

Then verify role gating with the demo accounts (password `Changia@2026`):

| Role | Email |
|------|-------|
| Super admin (system) | `admin@changia.co` |
| Org admin (admin) | `admin@msuya.or.tz` |
| Campaign manager (manager) | `manager@msuya.or.tz` |

---

## Status checklist — what the backend must build/confirm

| Module | Endpoint | Status |
|--------|----------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` | **Wired up now** — build/confirm first |
| Auth | `POST /auth/logout` | `[TO BUILD]` |
| Organizations | `GET /organizations`, `GET /organizations/stats`, `PUT /organizations` | `[TO BUILD]` |
| Team | `GET/POST /users`, `PUT/DELETE /users/:id` | `[TO BUILD]` |
| Campaigns | `GET/POST /campaigns`, `GET/PUT/DELETE /campaigns/:id`, submit/approve/status/managers routes (edit/delete only before publish; stop via status after publish) | `[TO BUILD]` |
| Donors | `GET/POST /donors`, `GET/PUT/DELETE /donors/:id`, `POST /donors/import` | `[TO BUILD]` |
| Donations | `GET /donations`, payment attempts, `simulate-callback` | `[TO BUILD]` |
| Audit | `GET /audit-logs`, `GET /audit-logs/recent` | `[TO BUILD]` |
| Payouts | payouts CRUD | `[TO BUILD]` |
| Settings | platform / org | `[TO BUILD]` |
| Public | `/public/campaigns/:slug` + public donate | `[TO BUILD]` |

---

*This document is the frontend's contract for the backend. Keep the field names, role strings, response envelope, and error codes in sync with `Frontend/src/lib/api-client.ts` and `Frontend/src/lib/dashboard/types.ts` — if a contract changes, update this file and the TypeScript types together.*