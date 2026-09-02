# Changia API Reference

Every endpoint of the Changia backend: **what you must send** (auth, roles, body, query) and **what comes back** (response shape, error codes).

- Base URL: `http://localhost:5000/api/v1`
- Format: JSON only (`Content-Type: application/json`)
- Amounts are **whole TZS integers** (no decimals)

---

## Table of contents

- [Authentication](#authentication)
- [Response envelope & errors](#response-envelope--errors)
- [Auth](#auth-module)
- [Organizations](#organizations-module)
- [Users (user)](#users-user-module)
- [Campaigns](#campaigns-module)
- [Public campaign browsing](#public-campaign-browsing-module)
- [Donors (CRM)](#donors-crm-module)
- [Donor pools](#donor-pools-module)
- [Reminder templates](#reminder-templates-module)
- [Reminder schedules (auto-resend)](#reminder-schedules-auto-resend-module)
- [Donations & payments](#donations--payments-module)
- [Audit logs](#audit-logs-module)
- [Data transfer (CSV / XLSX)](#data-transfer-module--bulk-csv--xlsx-export--import)
- [Roles & permissions matrix](#roles--permissions-matrix)

---

## Authentication

All endpoints except `/auth/register`, `/auth/login`, `/auth/forgot-password` and `/auth/reset-password` require a JWT in the header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained from `POST /auth/register` or `POST /auth/login` (`data.accessToken`). Default expiry: **7 days** (`JWT_EXPIRES_IN`).

The middleware reloads the user from the database on every request, so role/status changes take effect immediately. An inactive account (`status !== "ACTIVE"`) is rejected with `403 ACCOUNT_INACTIVE`.

### Roles

| Role | Meaning |
|------|---------|
| `SUPER_ADMIN` | Platform-wide administrator (no organization). Sole user/role manager. Can fill either campaign-approval stage. |
| `ORG_ADMIN` | Administrator of one organization. Creates campaigns; gives the **final** (stage-2) approval. |
| `REVIEWER` | Org-scoped gatekeeper: gives campaigns their **first** (stage-1) approval and reviews closure requests, completion reports and fee proposals. Creates nothing. |
| `CAMPAIGN_MANAGER` | Field fundraiser: can push payment requests, manage donors, run assigned campaigns |

---

## Response envelope & errors

### Success

```json
{ "success": true, "data": { } }
```

Some endpoints return a plain message instead of `data`:

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

### HTTP status codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad request — validation failed or a rule was violated |
| `401` | Missing/invalid token (`UNAUTHORIZED`), wrong credentials (`INVALID_CREDENTIALS`) |
| `403` | Authenticated but not allowed (`INSUFFICIENT_ROLE`, `ACCOUNT_INACTIVE`) |
| `404` | Resource not found (`NOT_FOUND`), route not found |
| `409` | Conflict — duplicate record, already processed, already resolved |
| `500` | Internal error (`INTERNAL_ERROR`) |

### Common error codes

| Code | When |
|------|------|
| `VALIDATION_ERROR` | Request body/query failed Zod validation (details list the fields) |
| `EMAIL_TAKEN` | Registering with an email that already exists |
| `INVALID_CREDENTIALS` | Wrong email or password on login |
| `INVALID_PASSWORD` | Wrong current password on change-password |
| `ACCOUNT_INACTIVE` | Account status is not `ACTIVE` |
| `INSUFFICIENT_ROLE` | User's role is not allowed on this route |
| `INVALID_TOKEN` | Token missing, malformed, or expired |
| `NOT_FOUND` | `campaign`/`donor`/`user`/`payment attempt` not found in your org |
| `DUPLICATE_RECORD` | A record with that unique value already exists (MySQL duplicate key) |
| `INVALID_REFERENCE` | A referenced record does not exist (foreign key) |
| `RECORD_IN_USE` | Record is referenced elsewhere and cannot be deleted |
| `CAMPAIGN_LOCKED` | Editing a campaign that is no longer DRAFT/PENDING |
| `CAMPAIGN_NOT_ACTIVE` | Payment/donation on a non-ACTIVE campaign |
| `CAMPAIGN_FULL` | Campaign already reached its public target |
| `EXCEEDS_REMAINING` | Push amount > remaining target |
| `BELOW_MINIMUM` | Push amount < TZS 1,000 minimum |
| `RATE_LIMITED` | A push request to the same phone in the last 5 minutes |
| `ALREADY_RESOLVED` / `ALREADY_PROCESSED` | Payment attempt already resolved / donation already recorded |
| `DONOR_EXISTS` | Creating a donor with a phone already in the org |
| `INTERNAL_ERROR` | Unexpected server error |

### Validation errors

Zod validation failures return `400` with `details` describing the problem:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "phone", "message": "Enter a valid Tanzanian phone number" }
    ]
  }
}
```

### Phone numbers

Tanzanian phone format required wherever a phone is used:

```
^(\+?255|0)?[67][0-9]{8}$
```

Valid: `0712345678`, `255712345678`, `+255712345678`.

### Pagination (list endpoints)

Every list endpoint accepts the same query params:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int ≥ 1 | `1` | Page number |
| `limit` | int 1–100 | `25` | Items per page |

Response `pagination` shape (all lists):

```json
"pagination": { "page": 1, "limit": 25, "total": 42, "totalPages": 2 }
```

---

## Auth module

Routes: `/auth`

### `POST /auth/register` — public, rate-limited

Creates an organization + its first admin in **one transaction**. Returns a JWT so the user is logged in immediately.

**Required fields:**

| Field | Type | Rules |
|-------|------|-------|
| `firstName` | string | min 2, max 100 |
| `email` | string | valid email (lowercased) |
| `phone` | string | Tanzanian format |
| `password` | string | min 8, max 128 |
| `confirmPassword` | string | must equal `password` |
| `organizationName` | string | min 2, max 150 |
| `termsAccepted` | boolean | must be `true` |

**Optional fields:** `lastName` (string, max 100), `organizationEmail` (string, valid email).

**Request example:**

```json
{
  "firstName": "Zawadi",
  "lastName": "Kileo",
  "email": "zawadi@changia.org.tz",
  "phone": "0755987654",
  "password": "Password123",
  "confirmPassword": "Password123",
  "organizationName": "Msuya Charitable Trust",
  "termsAccepted": true
}
```

**Response — `201 Created`:**

```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "id": 2,
      "firstName": "Zawadi",
      "lastName": "Kileo",
      "email": "zawadi@changia.org.tz",
      "phone": "+255755987654",
      "role": "ORG_ADMIN",
      "status": "ACTIVE",
      "avatarUrl": null,
      "organizationId": 2
    },
    "organization": {
      "id": 2,
      "name": "Msuya Charitable Trust",
      "slug": "msuya-charitable-trust-xxxxx"
    }
  }
}
```

**Errors:** `409 EMAIL_TAKEN`, `400 VALIDATION_ERROR`.

---

### `POST /auth/login` — public, rate-limited

**Required fields:** `email`, `password`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "id": 2,
      "firstName": "Zawadi",
      "lastName": "Kileo",
      "email": "zawadi@changia.org.tz",
      "phone": "+255755987654",
      "role": "ORG_ADMIN",
      "status": "ACTIVE",
      "avatarUrl": null,
      "organizationId": 2
    }
  }
}
```

**Errors:** `401 INVALID_CREDENTIALS` (same message for unknown email and wrong password — no user enumeration), `403 ACCOUNT_INACTIVE`.

---

### `GET /auth/me` — authenticated

Returns the current user + their organization.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "firstName": "Zawadi",
      "lastName": "Kileo",
      "email": "zawadi@changia.org.tz",
      "phone": "+255755987654",
      "role": "ORG_ADMIN",
      "status": "ACTIVE",
      "avatarUrl": null,
      "organizationId": 2
    },
    "organization": {
      "id": 2,
      "name": "Msuya Charitable Trust",
      "slug": "msuya-charitable-trust-xxxxx",
      "email": "zawadi@changia.org.tz",
      "phone": "+255755987654"
    }
  }
}
```

---

### `POST /auth/change-password` — authenticated

**Required fields:** `currentPassword`, `newPassword` (min 8, max 128), `confirmPassword` (must match `newPassword`).

**Response — `200 OK`:**

```json
{ "success": true, "message": "Password updated successfully" }
```

**Errors:** `401 INVALID_PASSWORD` (wrong current password), `400 VALIDATION_ERROR`.

---

### `POST /auth/forgot-password` — public, rate-limited

Starts the password-reset flow. **Required fields:** `email`.

Always responds `200 OK` with the same body regardless of whether the email is
registered (no account enumeration). If a matching **ACTIVE** user exists, any
earlier unused reset tokens are dropped, a fresh single-use token (valid 60 min)
is stored hashed, and a reset link is emailed:
`${APP_BASE_URL}/reset-password?token=<raw-token>`. With no SMTP configured the
link is logged to the server console instead.

```json
{ "success": true, "message": "If that email is registered, a reset link is on its way." }
```

---

### `POST /auth/reset-password` — public, rate-limited

Completes the flow. **Required fields:** `token` (from the emailed link),
`password` (min 8, max 128), `confirmPassword` (must match `password`).

On success the password is updated, the token is burned (and any other
outstanding tokens for that user are dropped), and `must_change_password` is
cleared.

**Response — `200 OK`:**

```json
{ "success": true, "message": "Your password has been reset. You can now sign in." }
```

**Errors:** `400 INVALID_RESET_TOKEN` (unknown / already-used / expired token),
`400 VALIDATION_ERROR`.

---

## Organizations module

Routes: `/organizations` — all authenticated.

### `GET /organizations`

Returns the caller's organization profile + counts.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Msuya Charitable Trust",
    "slug": "msuya-charitable-trust-xxxxx",
    "email": "zawadi@changia.org.tz",
    "phone": "+255755987654",
    "address": null,
    "description": null,
    "logoUrl": null,
    "currency": "TZS",
    "defaultServiceFeePercent": 5,
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "_count": { "users": 3, "campaigns": 2, "donors": 45 }
  }
}
```

`defaultServiceFeePercent` is the org's default campaign service fee (%), added on top of a campaign's goal when its creator doesn't pass their own `serviceFeePercent` (see `POST /campaigns`). Defaults to `DEFAULT_SERVICE_FEE_PERCENT` (5) until an ORG_ADMIN/SUPER_ADMIN changes it.

### `PUT /organizations` — `SUPER_ADMIN` or `ORG_ADMIN`

**All fields optional** (only the ones you include are updated):

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | min 2, max 150 |
| `email` | string | valid email |
| `phone` | string | Tanzanian format |
| `address` | string | max 250 |
| `description` | string | max 2000 |
| `logoUrl` | string | valid URL or `""` |
| `defaultServiceFeePercent` | number | 0–100. Only `SUPER_ADMIN`/`ORG_ADMIN` may set it — a `CAMPAIGN_MANAGER` setting a campaign's own `serviceFeePercent` is rejected with `FEE_PERCENT_NOT_ALLOWED`. |

**Response — `200 OK`:** the updated organization object (same shape as GET, including `_count`).

### `GET /organizations/stats`

Dashboard summary numbers for the caller's org.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "totalRaised": 2750000,
    "totalDonations": 32,
    "activeCampaigns": 2,
    "userSize": 3,
    "donorCount": 45,
    "campaignCount": 6
  }
}
```

> `totalRaised`/`totalDonations` count **confirmed donations only**.

---

## Users (user) module

Routes: `/users` — all authenticated, org-scoped (you only ever see your own org's user).

> **User & role management is `SUPER_ADMIN`-only.** `POST/PUT/DELETE /users` and
> `POST /users/:id/resend-invite` reject anyone else with `403 INSUFFICIENT_ROLE`
> — an `ORG_ADMIN` can no longer add or re-role teammates. `GET /users` and a
> user editing **their own** profile (`PUT /users/:id` for `:id === self`) stay
> open to any authenticated member (the former powers the campaign
> "assign managers" picker).

### `GET /users`

Lists user members.

**Query params:** `search` (matches name/email, max 100), `role` (`ORG_ADMIN` | `CAMPAIGN_MANAGER`), `status` (`ACTIVE` | `PENDING` | `INACTIVE`), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 4,
        "firstName": "Peter",
        "lastName": "John",
        "email": "peter@changia.org.tz",
        "phone": "+255755987654",
        "role": "CAMPAIGN_MANAGER",
        "status": "ACTIVE",
        "avatarUrl": null,
        "lastLoginAt": null,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "organizationId": 2
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 3, "totalPages": 1 }
  }
}
```

### `POST /users` — `SUPER_ADMIN` only

Invites a user member. The system generates a **temporary password** (returned once in the response — share it securely).

**Required fields:** `firstName` (min 2, max 100), `email`, `role` (`ORG_ADMIN` | `CAMPAIGN_MANAGER`).
**Optional fields:** `lastName` (max 100), `phone` (Tanzanian format).

**Request example:**

```json
{
  "firstName": "Peter",
  "lastName": "John",
  "email": "peter@changia.org.tz",
  "phone": "0755123999",
  "role": "CAMPAIGN_MANAGER"
}
```

**Response — `201 Created`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 4,
      "firstName": "Peter",
      "lastName": "John",
      "email": "peter@changia.org.tz",
      "phone": "+255755123999",
      "role": "CAMPAIGN_MANAGER",
      "status": "ACTIVE",
      "avatarUrl": null,
      "lastLoginAt": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "organizationId": 2
    },
    "temporaryPassword": "Changia-abc123XYZ"
  }
}
```

**Errors:** `409` (email already exists), `403 INSUFFICIENT_ROLE`.

### `PUT /users/:id` — `SUPER_ADMIN` (or the user editing their own profile)

**All fields optional:** `firstName`, `lastName`, `phone`, `role` (`ORG_ADMIN` | `CAMPAIGN_MANAGER`), `status` (`ACTIVE` | `PENDING` | `INACTIVE`).

**Response — `200 OK`:** the updated user object (same shape as above, without `temporaryPassword`).

### `DELETE /users/:id` — `SUPER_ADMIN` only

**Response — `200 OK`:**

```json
{ "success": true, "message": "User member removed" }
```

**Errors:** `400` ("You cannot remove your own account"), `400` ("The organization must keep at least one active administrator"), `404` (not in your org).

---

## Campaigns module

Routes: `/campaigns` — all authenticated, org-scoped.

> **Fee model:** the service fee is added **on top of** the goal. `publicTarget = goalAmount + serviceFeeAmount`. Donations count at full face value toward the target.

### `GET /campaigns`

**Query params:** `status` (`DRAFT` | `PENDING` | `ACTIVE` | `PAUSED` | `COMPLETED` | `CANCELLED`), `search` (name/slug), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": 1,
        "name": "School Water Well",
        "slug": "school-water-well",
        "story": "Help us build a clean water well…",
        "imageUrl": null,
        "category": "Water",
        "goalAmount": 10000000,
        "serviceFeePercent": 5,
        "serviceFeeAmount": 500000,
        "publicTarget": 10500000,
        "minimumAmount": 1000,
        "startDate": null,
        "endDate": null,
        "status": "ACTIVE",
        "isPublic": true,
        "contactPhone": "+255755987654",
        "raisedAmount": 2750000,
        "availableForPayout": 2750000,
        "donorCount": 32,
        "approvedBy": 2,
        "approvedAt": "2026-01-02T00:00:00.000Z",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-02T00:00:00.000Z",
        "assignments": [
          { "user": { "id": 4, "firstName": "Peter", "lastName": "John", "email": "peter@changia.org.tz" } }
        ]
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 2, "totalPages": 1 }
  }
}
```

### `GET /campaigns/:id`

Detail view: campaign + its assigned managers + the **10 most recent confirmed donations** + progress math.

**Response — `200 OK`:** the campaign object above, plus:
EAAYIOlgCrzYBSb6BJZCp6n7iWZB0fZAek6VOQf4XN2lWCJdBhGxF3q9c4WEkZCxYs57rSyKe0RtTGEZAR8ul7920X7rYJCkwinIz72a1UqPfR4uZBrFPZC8QgCDjzYF4ISJojI7uMqiguVxsZCv5CuobsJ4ZCNO5lx6zlaTJkQRokDq90G7BoMj4ejUgadHTrYBYDlzBAZB1s7lQgwEYgtFFZAp9Y78Fv1uSmFzRFNhxLpMMU5Q4Gc18KTkYRBHiHVRvyP7bycbIFU3bzUZBHPrcazlZAZAdKeVAZDZD
```json
{
  "success": true,
  "data": {
    "...campaign fields as above...",
    "assignments": [],
    "donations": [
      {
        "id": 31,
        "amount": 20000,
        "donorName": "Peter John",
        "isAnonymous": false,
        "method": "PUSH",
        "receiptNumber": "CHG-2026-000031",
        "confirmedAt": "2026-01-03T10:00:00.000Z",
        "createdAt": "2026-01-03T10:00:00.000Z"
      }
    ],
    "remaining": 7750000,
    "progressPercent": 26
  }
}
```

### `POST /campaigns` — `ORG_ADMIN` or `CAMPAIGN_MANAGER`

> ⚠️ `SUPER_ADMIN` **cannot** create a campaign (or a donor pool — see below). Platform-wide, `SUPER_ADMIN` only manages/edits what an organization already created; creation stays with the org itself. `PUT /campaigns/:id` and every other management action remain open to `SUPER_ADMIN`.

**Required fields:**

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | min 3, max 150 |
| `goalAmount` | number | > 0, max 1,000,000,000,000 |

**Optional fields:**

| Field | Type | Rules |
|-------|------|-------|
| `story` | string | max 20,000 |
| `imageUrl` | string | valid URL or `""` |
| `category` | string | max 100 |
| `serviceFeePercent` | number | 0–100 (default: `DEFAULT_SERVICE_FEE_PERCENT` = 5) |
| `minimumAmount` | number | > 0 (default 1000) |
| `startDate` / `endDate` | string | ISO datetime (`2026-01-01T00:00:00.000Z`) |
| `contactPhone` | string | Tanzanian format |
| `managerIds` | array | ids (string|number), max 50 |

**Request example:**

```json
{
  "name": "School Water Well",
  "story": "Help us build a clean water well for 300 students.",
  "category": "Water",
  "goalAmount": 10000000,
  "serviceFeePercent": 5,
  "contactPhone": "0755987654",
  "managerIds": [4]
}
```

**Response — `201 Created`:** the full campaign object (status will be `DRAFT`, fee already computed — e.g. 10,000,000 goal → 500,000 fee → 10,500,000 public target).

### `PUT /campaigns/:id` — `SUPER_ADMIN`, the campaign's **creator**, or an assigned `CAMPAIGN_MANAGER`

**All fields optional** — same fields as `POST /campaigns`.

- An `ORG_ADMIN` may only edit a campaign **they created themselves** → `403 NOT_CAMPAIGN_EDITOR` otherwise. Editing a campaign built by a manager is not an admin action — send it back with `POST /campaigns/:id/request-changes` and the manager makes the change. (`SUPER_ADMIN` keeps blanket edit access.) The same rule applies to `PUT /campaigns/:id/translations` and `POST|DELETE /campaigns/:id/images`.
- `COMPLETED` / `CANCELLED` campaigns can't be edited → `400 CAMPAIGN_LOCKED`.
- Goal/fee can't change once a campaign has taken a donation → `400 GOAL_LOCKED`.
- Editing a **material** field (`name`, `story`, `goalAmount`, `serviceFeePercent`, `category`, `startDate`, `endDate`, `minimumAmount`, `contactPhone`) of a **live** (`ACTIVE`/`PAUSED`) campaign does NOT apply immediately — it is parked as a **change request** (`hasPendingChanges: true`, `changeRequest` populated) that must clear the two-stage chain (see below). The live campaign keeps its last-approved values until then. Swahili translations still apply immediately.
- **Photos on a live campaign are also parked.** `POST /campaigns/:id/images` (cover *or* gallery) and `DELETE /campaigns/:id/images/:imageId` on an `ACTIVE`/`PAUSED` campaign open/refresh the same `changeRequest` instead of applying. Each gallery image carries `pendingChange: "NONE" | "ADD" | "REMOVE"` — an `"ADD"` is uploaded but hidden from the public campaign until approved; a `"REMOVE"` keeps showing publicly until approved. On the change request's final approval, staged adds go live and staged removals (and their files) are dropped; on `reject`, staged adds (and files) are discarded and staged removals revert. On a not-yet-live campaign every photo change still applies immediately.
- Editing a not-yet-live campaign applies inline; a `REVIEWED` campaign drops back to `PENDING` (its first approval is cleared) so a review always covers the latest content.

**Response — `200 OK`:** the updated campaign object.

### `GET /campaigns/:id/history` — any member with access to the campaign

The full chronological review trail from the audit log — who submitted / first-reviewed / approved / sent it back, and why. Powers the **History** tab on the campaign detail page so a reviewer picking a campaign back up can see the admin's reason and what the manager changed since.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 51,
      "action": "campaign.first_approved",
      "label": "Passed first review",
      "severity": "INFO",
      "notes": null,
      "fields": null,
      "actor": { "id": 6, "name": "Aisha Reviewer", "email": "reviewer@changia.org.tz", "role": "REVIEWER" },
      "createdAt": "2026-08-20T09:00:00.000Z"
    },
    {
      "id": 52,
      "action": "campaign.changes_requested",
      "label": "Sent back for changes",
      "severity": "INFO",
      "notes": "The goal looks too high for a two-week campaign — please revise.",
      "fields": null,
      "actor": { "id": 2, "name": "Zawadi Kileo", "email": "zawadi@changia.org.tz", "role": "ORG_ADMIN" },
      "createdAt": "2026-08-20T14:00:00.000Z"
    },
    {
      "id": 53,
      "action": "campaign.resubmitted",
      "label": "Edited & re-submitted for review",
      "severity": "INFO",
      "notes": null,
      "fields": ["goalAmount", "story"],
      "actor": { "id": 4, "name": "Peter John", "email": "peter@changia.org.tz", "role": "CAMPAIGN_MANAGER" },
      "createdAt": "2026-08-21T08:00:00.000Z"
    }
  ]
}
```

Entries are chronological (oldest first). `notes` carries the reviewer/admin reason where the step has one; `fields` lists which fields an edit touched. The trail covers **every** campaign request type — the two-stage approval chain, parked edits (`campaign.change_request.*`), suspend/resume asks, custom service-fee proposals (`campaign.fee_proposal.*`), closure requests and completion reports — each with the reason a reviewer/admin gave.

Payouts have the same trail at **`GET /payouts/:id/history`** (same response shape, `fields` always `null`) — requested → first-reviewed → approved → released (by the manager) → transfer completed / rejected (with reason). Visible to anyone who can see the payout.

### `POST /campaigns/:id/submit` — `SUPER_ADMIN`, `ORG_ADMIN` or assigned `CAMPAIGN_MANAGER`

Moves the campaign `DRAFT → PENDING`. **No body.** `400` if not currently `DRAFT`.

### Two-stage campaign approval

Every campaign (whoever creates it) clears a strict ordered chain, and **neither stage may be the campaign's creator**:

```
PENDING  --stage 1 (a REVIEWER or SUPER_ADMIN)-->  REVIEWED
REVIEWED --stage 2 (an ORG_ADMIN or SUPER_ADMIN, ≠ stage-1 person)-->  ACTIVE (isPublic=true, donor link emails sent)
```

#### `POST /campaigns/:id/approve` — `SUPER_ADMIN`, `ORG_ADMIN` or `REVIEWER`

Advances one stage (call it again for the next). **No body.**
**Errors:** `403 NEEDS_REVIEWER` (a non-reviewer tried stage 1), `403 NEEDS_ORG_ADMIN` (a non-admin tried stage 2), `400 SAME_AS_CREATOR`, `400 SAME_APPROVER` (stage-2 by the stage-1 person), `400 INVALID_APPROVAL_STATE`.

#### `POST /campaigns/:id/reject` — `SUPER_ADMIN`, `ORG_ADMIN` or `REVIEWER`

Terminal. `PENDING`/`REVIEWED` → `CANCELLED`. **Required body** `{ "notes": "reason ≥ 10 chars" }` — stored on `campaign.reviewNotes` and shown to the manager.

#### `POST /campaigns/:id/request-changes` — `SUPER_ADMIN`, `ORG_ADMIN` or `REVIEWER`

Non-terminal — sends the campaign back to the manager. `PENDING`/`REVIEWED` → `PENDING` with `reviewState: "CHANGES_REQUESTED"`, `firstApprovedBy` cleared. **Required body** `{ "notes": "≥ 10 chars" }`.

### Campaign change requests (parked material edits to a live campaign)

#### `GET /campaigns/:id/change-requests` — any authenticated org member

Returns the full history (`ChangeRequest[]`). The open one is also embedded on the campaign as `changeRequest`.

#### `POST /campaigns/:id/change-requests/:requestId/decide` — `SUPER_ADMIN`, `ORG_ADMIN` or `REVIEWER`

**Required body** `{ "action": "approve" | "request_changes" | "reject", "notes": "…" }` (`notes` ≥ 10 chars required for the two negative actions). `approve` advances the change request through the same two-stage chain (`PENDING → REVIEWED → APPLIED`); on the final approval the payload (and any staged cover image / gallery photo adds & removals) is written onto the campaign.

### `POST /campaigns/:id/status` — `SUPER_ADMIN` or `ORG_ADMIN`

Manually pause/complete/cancel a campaign.

**Required body:**

```json
{ "status": "PAUSED" }
```

`status` must be one of `PAUSED`, `COMPLETED`, `CANCELLED`. Setting any of these also sets `isPublic = false`.

**Response — `200 OK`:** the campaign object with the new status.

### `PUT /campaigns/:id/managers` — `SUPER_ADMIN` or `ORG_ADMIN`

Replaces the campaign's assigned managers.

**Required body:**

```json
{ "userIds": [4, 5] }
```

All ids must belong to your organization (else `400`). Empty array removes all managers.

**Response — `200 OK`:** the campaign object with the new `assignments`.

### Completion reports — mandatory proof of fund usage

Once a campaign is `COMPLETED`, the **assigned `CAMPAIGN_MANAGER` must submit** a written narrative + at least one photo proving how the funds were used. An `ORG_ADMIN`/`SUPER_ADMIN` then reviews it — **approval is what unblocks that manager from creating a new campaign** and what makes the story eligible to appear on the public blog (see [Public campaign browsing](#public-campaign-browsing-module) below).

Every `GET /campaigns` / `GET /campaigns/:id` response includes a lightweight `completionReport: { status, submittedAt, reviewedAt } | null` field for `COMPLETED` campaigns — use it to show proof status without an extra request. The full narrative/images live behind the endpoints below.

#### `GET /campaigns/:id/completion-report`

Any org member with access to the campaign. **Response — `200 OK`:** the report object, or `data: null` if nothing has been submitted yet:

```json
{
  "success": true,
  "data": {
    "id": 7,
    "campaignId": 12,
    "summary": "We purchased and installed the water pump, piping and a storage tank...",
    "amountUtilized": 10250000,
    "status": "PENDING_REVIEW",
    "submittedBy": { "id": 4, "firstName": "Peter", "lastName": "John" },
    "submittedAt": "2026-08-10T09:00:00.000Z",
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewNotes": null,
    "images": [
      { "id": 21, "url": "http://localhost:5000/uploads/completion-reports/12/1723...-a1b2.jpg" }
    ]
  }
}
```

#### `POST /campaigns/:id/completion-report` — assigned `CAMPAIGN_MANAGER` only

`multipart/form-data`, **not** JSON.

| Field | Type | Rules |
|-------|------|-------|
| `summary` | text | required, min 20 chars, max 10,000 |
| `amountUtilized` | text (number) | optional, whole TZS, ≥ 0 |
| `images` | file[] | **required, at least 1**, up to 8, JPEG/PNG/WEBP, 5 MB each — field name must be `images` |

Resubmitting (after a `REJECTED` review, or before any review) **replaces** the previous summary/amount/images and resets status to `PENDING_REVIEW`. An already-`APPROVED` report is locked.

**Response — `201 Created`:** the report object (as above).
**Errors:** `400 CAMPAIGN_NOT_COMPLETED` (campaign isn't `COMPLETED` yet), `400 PROOF_IMAGES_REQUIRED` (no images attached), `400 INVALID_IMAGE_TYPE`, `409 REPORT_ALREADY_APPROVED`, `404` (not the assigned manager, or campaign not found).

#### `POST /campaigns/:id/completion-report/review` — `SUPER_ADMIN`, `ORG_ADMIN` or `REVIEWER`

**Required body:** `{ "action": "approve" | "request_changes" | "reject", "notes": "…" }` — `notes` (≥ 10 chars) is required for `request_changes` and `reject`. (`{ "approved": true|false }` is still accepted for backwards compatibility.)

Two-stage chain, same as payouts / closure requests: `approve` on a `PENDING_REVIEW` report (a `REVIEWER`/`SUPER_ADMIN`, not the submitter) moves it to `REVIEWED` (first review); `approve` on a `REVIEWED` report (an `ORG_ADMIN`/`SUPER_ADMIN`, a different person, not the submitter) moves it to `APPROVED`. `reject` / `request_changes` at either stage → `REJECTED` (the manager resubmits). The report object carries `firstReviewedBy` / `firstReviewedAt`, and the summary embedded on campaign list/detail adds `firstReviewedBy`.

**Response — `200 OK`:** the report object with `status: "REVIEWED"`, `"APPROVED"` or `"REJECTED"`.
**Errors:** `404` (no report submitted yet), `400 REPORT_NOT_PENDING`, `400 REASON_REQUIRED`, `403 NEEDS_REVIEWER` / `403 NEEDS_ORG_ADMIN`, `400 SAME_AS_CREATOR` / `400 SAME_APPROVER`.

### Service-fee proposals & closure requests

Both use the same three-outcome decision body — `{ "action": "approve" | "request_changes" | "reject", "notes": "…" }`, `notes` (≥ 10) required for the negatives:

- `POST /campaigns/:id/fee/review` — `SUPER_ADMIN`, `ORG_ADMIN` or `REVIEWER`. Decides a manager's pending custom `serviceFeePercent`. `approve` recomputes the fee/target; `reject` discards it; `request_changes` keeps it pending with a note.
- `POST /campaigns/:id/closure-requests/:requestId/decide` — same two-stage chain as payouts / campaign change requests. `approve` on a `PENDING` request (a `REVIEWER`/`SUPER_ADMIN`, not the requester) moves it to `REVIEWED` (first review); `approve` on a `REVIEWED` request (an `ORG_ADMIN`/`SUPER_ADMIN`, a different person, not the requester) moves it to `APPROVED` and the campaign to `COMPLETED`. `reject` / `request_changes` at either stage → `REJECTED` (the manager may file a new request). The closure request object carries `firstApprovedBy` / `firstApprovedAt`. Errors: `403 NEEDS_REVIEWER` / `403 NEEDS_ORG_ADMIN`, `400 SAME_AS_CREATOR` / `400 SAME_APPROVER`, `400 CLOSURE_REQUEST_NOT_PENDING`, `409 CLOSURE_REQUEST_PENDING` (on request while one is already `PENDING`/`REVIEWED`).

### Payout proof-of-use photos

Every payout record carries `proofImages: [{ id, url }]` — optional photos (invoices, receipts, delivery/site photos) the requesting `CAMPAIGN_MANAGER` attaches so the reviewer and org admin can see why the money is needed.

- `POST /payouts/:id/proof` — `CAMPAIGN_MANAGER` (the requester only). `multipart/form-data`, up to 5 files under the `proof` field (JPEG/PNG/WEBP, ≤ 5 MB each). Allowed only while the request is `REQUESTED` or `REVIEWED`. Returns the updated payout. Errors: `404` (not the requester), `409 PAYOUT_PROOF_LOCKED`, `400 TOO_MANY_IMAGES`, `400 NO_IMAGES`, `400 INVALID_IMAGE_TYPE`.
- `DELETE /payouts/:id/proof/:imageId` — same role/state rules. Returns the updated payout.

### Payout lifecycle, destination & release

Payout lifecycle: `REQUESTED` → `REVIEWED` (reviewer's first approval) → `APPROVED` (org admin's final approval — the funds are now **on hold**) → `PAID` (the requesting `CAMPAIGN_MANAGER` confirms the release, which atomically fires the ClickPesa mobile-money transfer). `reject` (`REQUESTED`/`REVIEWED` only) → `REJECTED`.

The mobile-money destination is captured **with the request** (no separate checkout step). `POST /payouts` body: `{ amount (int TZS), campaignId, reason, provider, phone (Tanzanian number), accountName, notes? }`. Only one payout per campaign may be in flight (not `PAID`/`REJECTED`) — a duplicate is `409 PAYOUT_REQUEST_PENDING`. `amount` may not exceed the campaign's `availableForPayout` (raised − already paid out) — over that is `400 PAYOUT_EXCEEDS_AVAILABLE`.

Every payout record carries `disbursement` — `{ method: "MOBILE_MONEY", provider, accountName, phone, submittedAt, submittedBy }` — plus `confirmedBy` / `confirmedAt` once released.

- `POST /payouts/:id/confirm` — `CAMPAIGN_MANAGER` (the requester only). Allowed only while the payout is `APPROVED`. Body: `{ notes? }`. Atomically executes the ClickPesa mobile-money payout to the stored `phone` and moves the row to `PAID` (dev mode records a mock `gateway_ref`); a gateway failure rolls back and the row stays `APPROVED` for a retry. Errors: `404` (not the requester), `409 PAYOUT_NOT_AWAITING_CONFIRMATION`, `409 PAYOUT_ALREADY_CONFIRMED`, `400 PAYOUT_NO_DESTINATION`, `400 CLICKPESA_PAYOUT_FAILED`.

### In-kind gifts & payment breakdown

- `GET /campaigns/payments/breakdown` — any authenticated member. Per-campaign payment split (TZS) for the caller's campaigns (a `CAMPAIGN_MANAGER` sees only assigned campaigns). Each row: `{ campaignId, name, goal, raised, paid, unpaid, promisedPaid, promisedUnpaid, giftValue }` where `paid` = confirmed money not tied to a pledge, `unpaid` = goal not covered by a pledge, `promisedPaid` / `promisedUnpaid` = money received / still owed against donor pledges, `giftValue` = summed `estimatedValue` of in-kind gifts whose `status` is `RECEIVED` (pledged / scheduled gifts don't count until handed over). A row sums to `goal + giftValue`.
- `GET /campaigns/:id/gifts` — any member with campaign access. `Gift[]`, ordered `PLEDGED` → `SCHEDULED` → `RECEIVED` → `CANCELLED` then newest first: `{ id, campaignId, donorId, donorName, description, estimatedValue, receivedAt, createdAt, source ("STAFF"|"PUBLIC"), status ("PLEDGED"|"SCHEDULED"|"RECEIVED"|"CANCELLED"), deliveryMethod ("PICKUP"|"DROP_OFF"|null), donorPhone, donorEmail, pickupAddress, preferredDate, note }`. Staff-recorded gifts are `source:"STAFF"`, `status:"RECEIVED"`; public pledges (see below) are `source:"PUBLIC"`, `status:"PLEDGED"` and carry the donor's contact + handover details.
- `POST /campaigns/:id/gifts` — `SUPER_ADMIN`, `ORG_ADMIN` or assigned `CAMPAIGN_MANAGER`. Body `{ description (1–300, required), estimatedValue? (int TZS ≥ 0, default 0), donorId?, receivedAt? (YYYY-MM-DD) }`. Returns the updated `Gift[]`.
- `PATCH /campaigns/:id/gifts/:giftId/status` — same roles. Body `{ status: "PLEDGED"|"SCHEDULED"|"RECEIVED"|"CANCELLED" }`. Advances a gift pledge along its handover lifecycle. **Stages only move forward** (`PLEDGED → SCHEDULED → RECEIVED`); a gift may be `CANCELLED` while still `PLEDGED` or `SCHEDULED`, but `RECEIVED` and `CANCELLED` are terminal — any backward move is rejected `400 GIFT_STAGE_BACKWARD`. Moving to `RECEIVED` back-fills `receivedAt` if unset and makes the gift count toward `giftValue`. Returns the updated `Gift[]`.
- `DELETE /campaigns/:id/gifts/:giftId` — same roles. Returns the updated `Gift[]`.
- `POST /public/campaigns/:id/gift-pledges` — **unauthenticated**. A visitor on the public campaign page pledges an in-kind gift instead of money (`:id` = campaign id or slug; campaign must be public + `ACTIVE`). Body `{ description (1–300, required), estimatedValue? (int TZS ≥ 0), deliveryMethod ("PICKUP"|"DROP_OFF", required), donorName (required), donorPhone (TZ number, required), donorEmail?, pickupAddress? (required when deliveryMethod = "PICKUP"), preferredDate? (YYYY-MM-DD), note? }`. Creates a `source:"PUBLIC"`, `status:"PLEDGED"` gift row (visible immediately in the dashboard list) and notifies the assigned manager. Returns `{ id, status: "PLEDGED", deliveryMethod, message }`. Errors: `404` (no matching public campaign), `409 RATE_LIMITED` (same phone pledged to this campaign in the last 5 min).

### Notifications module — `/notifications` (authenticated, per-user)

- `GET /notifications?unreadOnly=&page=&limit=` → `{ notifications: Notification[], unreadCount, pagination }`
- `GET /notifications/unread-count` → `{ unreadCount }`
- `POST /notifications/:id/read` — marks one read
- `POST /notifications/read-all` — marks all read

`Notification`: `{ id, type, title, body, link, resource, resourceId, read, readAt, createdAt }`. Written server-side (fire-and-forget) on every approval-chain event — see `modules/notification`.

---

## Public campaign browsing module

Routes: `/public/campaigns` — **unauthenticated**, rate-limited. Powers the marketing site.

### `GET /public/campaigns` (+ `?featured=true`, `?limit=`, `?locale=`)

Up to 3 homepage-featured `ACTIVE` campaigns (`featured=true`), or up to 5 non-featured `ACTIVE` campaigns otherwise. `locale` (`en`|`sw`) picks the translated name/story/category where available.

### `GET /public/campaigns/:id` (+ `?locale=`)

A single `ACTIVE` or `COMPLETED` campaign by slug or numeric id, with its 10 most recent (non-anonymous) donations.

### `GET /public/campaigns/completed` — impact stories (+ `?locale=`, `?page=`, `?limit=`)

**This is the public blog listing.** A campaign appears here only once it's `COMPLETED` **and** its completion report has been `APPROVED` — that approval is literally what "posts" the story. Ordered newest-approved-first.

```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": 12,
        "slug": "school-water-well",
        "title": "School Water Well",
        "excerpt": "We purchased and installed the water pump, piping and a storage tank…",
        "image": "http://localhost:5000/uploads/completion-reports/12/1723...-a1b2.jpg",
        "organizationName": "Msuya Foundation",
        "goalAmount": 10000000,
        "raisedAmount": 10250000,
        "donorCount": 64,
        "publishedAt": "2026-08-12T14:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 }
  }
}
```

### `GET /public/campaigns/completed/:id` — impact story detail (+ `?locale=`)

By slug or numeric id. **Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "slug": "school-water-well",
    "title": "School Water Well",
    "campaignStory": "Help us build a clean water well for 300 students.",
    "category": "Water",
    "image": null,
    "organizationName": "Msuya Foundation",
    "goalAmount": 10000000,
    "raisedAmount": 10250000,
    "progressPercent": 98,
    "donorCount": 64,
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-08-01T00:00:00.000Z",
    "completionSummary": "We purchased and installed the water pump, piping and a storage tank...",
    "amountUtilized": 10250000,
    "proofImages": ["http://localhost:5000/uploads/completion-reports/12/1723...-a1b2.jpg"],
    "publishedAt": "2026-08-12T14:00:00.000Z"
  }
}
```

**Errors:** `404` if no `COMPLETED` campaign with an `APPROVED` report matches.

---

## Donors (CRM) module

Routes: `/donors` — all authenticated, org-scoped. Donors are deduplicated **by phone per organization**.

### `GET /donors`

**Query params:** `search` (name/email/phone), `status` (`ACTIVE` | `PROSPECT` | `LAPSED` | `INACTIVE`), `consent` (`CONSENTED` | `PENDING` | `WITHDRAWN`), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "donors": [
      {
        "id": 12,
        "firstName": "Peter",
        "lastName": "John",
        "email": "peter.john@gmail.com",
        "phone": "+255755123999",
        "location": "Dar es Salaam",
        "status": "ACTIVE",
        "consentStatus": "CONSENTED",
        "preferredChannel": "SMS",
        "tags": ["regular", "water-project"],
        "notes": null,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z",
        "donationCount": 4
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 45, "totalPages": 2 }
  }
}
```

### `GET /donors/:id`

Detail view: donor + consent history + up to 20 donations.

**Response — `200 OK`:** the donor object above, plus:

```json
{
  "consents": [
    {
      "id": 3,
      "channel": "SMS",
      "status": "CONSENTED",
      "source": "manual",
      "grantedAt": "2026-01-01T00:00:00.000Z",
      "revokedAt": null
    }
  ],
  "donations": [
    {
      "id": 31,
      "amount": 20000,
      "status": "CONFIRMED",
      "method": "PUSH",
      "receiptNumber": "CHG-2026-000031",
      "createdAt": "2026-01-03T10:00:00.000Z",
      "campaign": { "name": "School Water Well" }
    }
  ]
}
```

### `POST /donors` — `SUPER_ADMIN`, `ORG_ADMIN`, or `CAMPAIGN_MANAGER`

**Required fields:**

| Field | Type | Rules |
|-------|------|-------|
| `phone` | string | Tanzanian format |

**Optional fields:**

| Field | Type | Rules |
|-------|------|-------|
| `firstName` / `lastName` | string | max 100 |
| `email` | string | valid email or `""` |
| `location` | string | max 200 |
| `status` | string | `ACTIVE` | `PROSPECT` | `LAPSED` | `INACTIVE` (default `PROSPECT`) |
| `consentStatus` | string | `CONSENTED` | `PENDING` | `WITHDRAWN` (default `PENDING`) |
| `preferredChannel` | string | `SMS` | `WHATSAPP` | `EMAIL` | `PHONE` (default `SMS`) |
| `tags` | array | strings, max 50 each, max 20 tags |
| `notes` | string | max 5000 |

**Request example:**

```json
{
  "firstName": "Peter",
  "lastName": "John",
  "email": "peter.john@gmail.com",
  "phone": "0755123999",
  "location": "Dar es Salaam",
  "status": "ACTIVE",
  "consentStatus": "CONSENTED",
  "preferredChannel": "SMS",
  "tags": ["regular"]
}
```

**Response — `201 Created`:** the full donor detail object (with `consents` and `donations`).
**Errors:** `409 DONOR_EXISTS` (phone already in org).

### `PUT /donors/:id` — `SUPER_ADMIN` or `ORG_ADMIN`

**All fields optional** — same fields as `POST /donors`. Setting `consentStatus: "CONSENTED"` creates/updates a consent record for the preferred channel; `"WITHDRAWN"` revokes all consents.

**Response — `200 OK`:** the updated donor detail object.

### `DELETE /donors/:id` — `SUPER_ADMIN` or `ORG_ADMIN`

**Response — `200 OK`:**

```json
{ "success": true, "message": "Donor removed" }
```

---

## Donor pools module

Routes: `/donor-pools` — all authenticated, org-scoped. A pool is visible to
its `CAMPAIGN_MANAGER` creator and to `SUPER_ADMIN`/`ORG_ADMIN` only — one
manager can never list, open or modify another manager's pool. Each manager
also has their own system ("anomalous") pool for donations that arrived
without a matching donor profile — it never appears in normal pool listings
and cannot be scheduled for auto-resend.

### `GET /donor-pools`

**Query params:** `category` (`FAMILY`|`SCHOOL`|`STUDENT`|`OFFICE`), `search`, `status` (`ACTIVE`|`ARCHIVED`), `createdBy` (admin only — filter by manager id), `sortBy` (`name`|`created`|`members`), `sortDir`, `page`, `limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "id": 4,
        "name": "Msuya Family",
        "description": "Extended family pledges",
        "category": "FAMILY",
        "isSystem": false,
        "status": "ACTIVE",
        "createdBy": { "id": 3, "firstName": "Grace", "lastName": "Manager", "email": "manager@changia.org.tz" },
        "memberCount": 12,
        "expectedTotal": 2400000,
        "paidTotal": 1100000,
        "createdAt": "2026-08-01T00:00:00.000Z",
        "updatedAt": "2026-08-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 3, "totalPages": 1 }
  }
}
```

### `POST /donor-pools` — `ORG_ADMIN` or `CAMPAIGN_MANAGER`

> ⚠️ `SUPER_ADMIN` **cannot** create a donor pool — same rule as campaign creation, above. `SUPER_ADMIN` keeps full edit/manage access to pools that already exist.

**Required fields:** `name` (string, min 2). **Optional:** `description`, `category` (default `FAMILY`), `createdBy` (admin only — create on behalf of a manager).
**Response — `201 Created`:** the pool object.

### `GET /donor-pools/:id` (+ `?campaignId=`)

Pool detail with members. Pass `campaignId` to compare each member's pledge/paid against that specific campaign (status becomes `UNPAID`/`PARTIAL`/`PAID_FULL`); without it, status reflects lifetime totals against the pool-level expected amount.

### `PUT /donor-pools/:id` / `DELETE /donor-pools/:id` — owner or admin

Same fields as create (all optional on `PUT`). The system pool cannot be deleted (`400 SYSTEM_POOL`).

### `POST /donor-pools/:id/members` — owner or admin

Body: `donorIds` (existing donors) and/or `donors` (new donor objects — same shape as `POST /donors` plus `gender`/`position`), plus optional `expectedAmounts: { "<donorId>": number }`.

### `PUT /donor-pools/:id/members/:donorId` / `DELETE /donor-pools/:id/members/:donorId`

Set (`{ "expectedAmount": number|null }`) or remove a member's pledge.

### `GET /donor-pools/duplicates` (+ `?poolIds=1,2,3`)

Donors who appear in more than one pool you can see. **Response:** `{ groups: [{ donor, pools: [{id,name,category,isSystem}] }] }`.

### `POST /donor-pools/duplicates/resolve`

Body: `{ "choices": [{ "donorId": 12, "keepPoolId": 4 }] }` — removes the donor from every other pool, keeping only the chosen one.

### `GET /donor-pools/anomalous` (+ `?managerId=`)

A `CAMPAIGN_MANAGER` always gets their own anomalous pool. An admin can pass `managerId` to view a specific manager's, or omit it for the shared "Unassigned" fallback (unmatched payments on campaigns with no assigned manager).

### `POST /donor-pools/anomalous/:anomalousDonorId/merge`

Body: `{ "targetDonorId": number, "paymentMethod"?: { "method": "MOMO"|…, "accountRef"?: string, "details"?: object } }`. Moves the anomalous donor's donations, campaign targets and pool memberships onto the target donor (in one transaction), optionally registering the previously-unrecognized payment method, then deletes the anomalous placeholder.

### `POST /donor-pools/reminders/send` — `SUPER_ADMIN`, `ORG_ADMIN`, or `CAMPAIGN_MANAGER`

One-off bulk reminder (manual send, not a scheduled resend). Two modes:

**Single-channel mode** — every donor messaged on one channel with one free-text body:

| Field | Type | Rules |
|-------|------|-------|
| `campaignId` | number | required |
| `donorIds` | number[] | required, 1–500 |
| `channel` | string | `SMS` \| `WHATSAPP` \| `EMAIL` |
| `subject` | string | optional (Email only) |
| `message` | string | required, max 5000 |

**Preferred-channel mode** — each donor messaged on their own `preferredChannel`, rendered from a per-channel saved template:

| Field | Type | Rules |
|-------|------|-------|
| `campaignId` | number | required |
| `donorIds` | number[] | required, 1–500 |
| `usePreferredChannel` | boolean | `true` |
| `fallbackChannel` | string | `SMS` \| `WHATSAPP` \| `EMAIL` — used for donors whose `preferredChannel` is `PHONE`/unset/unreachable |
| `templates` | object | `{ SMS?, WHATSAPP?, EMAIL? }` → template id; a template is required for every channel the recipients resolve to |

**Response — `201 Created`:** `{ batch: {...}, deliveries: [{ donorId, channel?, recipient, status, providerRef, sentAt }] }` — preferred-channel mode sends one `message_batch` per channel and returns `batch.channel: "PREFERRED"` with `batch.channels: [...]`. Actual delivery depends on `MESSAGE_PROVIDER` — see `Backend/README.md` → "Messaging providers setup".

---

## Reminder templates module

Routes: `/reminder-templates` — all authenticated, org-scoped. Non-admins only see/manage their own templates. Body/subject support `{{donorName}}`, `{{amountDue}}`, `{{campaignName}}`, `{{orgName}}` placeholders, rendered when a reminder is actually sent.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reminder-templates` (+ `channel`, `search`, `page`, `limit`) | List templates |
| POST | `/reminder-templates` | Create — `{ name, channel: "SMS"\|"WHATSAPP"\|"EMAIL", subject?, body }` |
| PUT | `/reminder-templates/:id` | Update (owner or admin) |
| DELETE | `/reminder-templates/:id` | Delete (owner or admin) |

---

## Reminder schedules (auto-resend) module

Routes: `/reminder-schedules` — all authenticated, org-scoped. **A schedule never sends by itself** — a background job (`jobs/reminderScheduler.js`) only queues a `PENDING_APPROVAL` batch each time a cycle is due; a manager must confirm it.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reminder-schedules` (+ `scope`, `page`, `limit`) | List schedules |
| POST | `/reminder-schedules` | Create — see fields below |
| PUT | `/reminder-schedules/:id` | Update `name`/`intervalDays`/`channels`/`templateId*`/`isActive` (scope/target are fixed after creation) |
| DELETE | `/reminder-schedules/:id` | Delete (owner or admin) |
| GET | `/reminder-schedules/pending` | Batches awaiting confirmation (own schedules; admin sees all) |
| POST | `/reminder-schedules/pending/:id/confirm` | **Sends now** — renders each donor's template on their own `preferredChannel` and dispatches |
| POST | `/reminder-schedules/pending/:id/skip` | Skip this cycle — nothing sent |

**`POST /reminder-schedules` fields:**

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | required |
| `scope` | string | `POOL` \| `CAMPAIGN` |
| `poolId` | number | required if `scope=POOL`; must be a non-system pool you own (or admin) |
| `campaignId` | number | required if `scope=CAMPAIGN` |
| `intervalDays` | number | 1–365, default 7 |
| `channels` | string[] | subset of `SMS`/`WHATSAPP`/`EMAIL`, min 1 |
| `templateIdSms` / `templateIdWhatsapp` / `templateIdEmail` | number | optional — falls back to a generic reminder if omitted |
| `isActive` | boolean | default `true` |

**Errors:** `400 SYSTEM_POOL_NOT_ALLOWED` (tried to schedule the anomalous pool), `403 POOL_ACCESS_DENIED`, `409 ALREADY_RESOLVED` (confirming/skipping an already-resolved batch).

---

## Donations & payments module

Routes: `/donations` — all authenticated, org-scoped.

> **The money rule:** money is only ever counted when a payment attempt resolves to `SUCCESS`. The unique `payment_attempt_id` on donations makes resolution **idempotent** — the same attempt can never create two donations.

### `GET /donations`

Lists confirmed donations.

**Query params:** `campaignId` (filter by campaign), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "donations": [
      {
        "id": 31,
        "organizationId": 2,
        "campaignId": 1,
        "donorId": 12,
        "paymentAttemptId": 7,
        "amount": 20000,
        "method": "PUSH",
        "status": "CONFIRMED",
        "donorName": "Peter John",
        "donorPhone": "+255755123999",
        "isAnonymous": false,
        "receiptNumber": "CHG-2026-000031",
        "gatewayRef": "GW-889900",
        "confirmedAt": "2026-01-03T10:00:00.000Z",
        "createdAt": "2026-01-03T10:00:00.000Z",
        "updatedAt": "2026-01-03T10:00:00.000Z",
        "campaign": { "id": 1, "name": "School Water Well", "slug": "school-water-well" }
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 32, "totalPages": 2 }
  }
}
```

### `POST /donations/campaigns/:campaignId/attempts` — `SUPER_ADMIN`, `ORG_ADMIN`, or `CAMPAIGN_MANAGER`

Sends a **push payment request** to a donor's phone. **No money moves here** — the donor still has to confirm with their PIN at the operator prompt. The attempt expires after 15 minutes (`expires_at`).

**Body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `amount` | int | ✅ | whole TZS, ≥ 1,000, must fit within the remaining target |
| `donorId` | int | ⭘ | existing donor in your org |
| `donorPhone` | string | ⭘ | Tanzanian format — used to find/create the donor |
| `donorName` | string | ⭘ | max 150 — display name on the request |

Provide `donorId` **or** `donorPhone` (at least one) so the request can reach the right phone.

**Request example:**

```json
{
  "donorPhone": "0755123999",
  "donorName": "Peter John",
  "amount": 20000
}
```

**Response — `201 Created`:**

```json
{
  "success": true,
  "data": {
    "id": 7,
    "campaign_id": 1,
    "donor_id": 12,
    "organization_id": 2,
    "initiated_by_id": 4,
    "method": "PUSH",
    "amount": 20000,
    "status": "PENDING",
    "idempotency_key": "3f2c9b1e-…",
    "gateway_ref": null,
    "donor_phone": "+255755123999",
    "donor_name": "Peter John",
    "error": null,
    "expires_at": "2026-01-03T10:15:00.000Z",
    "created_at": "2026-01-03T10:00:00.000Z",
    "updated_at": "2026-01-03T10:00:00.000Z",
    "message": "Payment request sent. The donor must confirm with their PIN at the operator prompt."
  }
}
```

**Errors:** `404 NOT_FOUND` (campaign), `400 CAMPAIGN_NOT_ACTIVE`, `400 CAMPAIGN_FULL`, `400 EXCEEDS_REMAINING`, `400 BELOW_MINIMUM`, `409 RATE_LIMITED` (a pending request to that phone within the last 5 minutes).

### `GET /donations/campaigns/:campaignId/attempts`

Lists payment attempts for a campaign (max 100), newest first. Each row includes the linked donation's receipt/status if one exists.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "campaign_id": 1,
      "donor_id": 12,
      "organization_id": 2,
      "initiated_by_id": 4,
      "method": "PUSH",
      "amount": 20000,
      "status": "SUCCESS",
      "idempotency_key": "3f2c9b1e-…",
      "gateway_ref": "GW-889900",
      "donor_phone": "+255755123999",
      "donor_name": "Peter John",
      "error": null,
      "expires_at": "2026-01-03T10:15:00.000Z",
      "created_at": "2026-01-03T10:00:00.000Z",
      "updated_at": "2026-01-03T10:00:00.000Z",
      "donation_receipt": "CHG-2026-000031",
      "donation_status": "CONFIRMED"
    }
  ]
}
```

### `POST /donations/simulate-callback` — `SUPER_ADMIN` or `ORG_ADMIN`

⚠️ **Development-only.** Simulates the payment gateway's callback for local testing. In production this is replaced by a signature-verified webhook from the provider — the idempotency and confirmed-only rules are identical.

**Required body:**

| Field | Type | Notes |
|-------|------|-------|
| `attemptId` | int | the attempt to resolve |
| `result.status` | string | `SUCCESS` \| `FAILED` \| `EXPIRED` \| `CANCELLED` |
| `result.gatewayRef` | string | optional provider reference |

**Request example:**

```json
{
  "attemptId": 7,
  "result": { "status": "SUCCESS", "gatewayRef": "GW-889900" }
}
```

**Response — `200 OK` (on `SUCCESS`):**

```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": 7,
      "campaign_id": 1,
      "status": "SUCCESS",
      "gateway_ref": "GW-889900",
      "...other attempt fields..."
    },
    "donation": {
      "id": 31,
      "organizationId": 2,
      "campaignId": 1,
      "donorId": 12,
      "paymentAttemptId": 7,
      "amount": 20000,
      "method": "PUSH",
      "status": "CONFIRMED",
      "donorName": "Peter John",
      "donorPhone": "+255755123999",
      "isAnonymous": false,
      "receiptNumber": "CHG-2026-000031",
      "gatewayRef": "GW-889900",
      "confirmedAt": "2026-01-03T10:00:00.000Z"
    }
  }
}
```

The campaign's `raisedAmount` and `donorCount` are updated in the **same transaction** as the donation insert.

**Response — `200 OK` (on `FAILED`/`EXPIRED`/`CANCELLED`):** `donation` is `null`, attempt status is set to the result status. No money recorded.

**Errors:** `404` (attempt not found), `409 ALREADY_RESOLVED` (attempt was already resolved), `409 ALREADY_PROCESSED` (donation for this attempt already exists).

---

## Audit logs module

Routes: `/audit-logs` — **`SUPER_ADMIN` only** (platform-level). The trail is **immutable** (write-only) — every meaningful action records an entry.

### `GET /audit-logs`

**Query params:** `action` (partial match, e.g. `campaign`), `severity` (`INFO` | `WARNING` | `CRITICAL`), `search` (actor email / resource), plus `page`/`limit`.

**Response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 44,
        "action": "donation.confirmed",
        "resource": "donation",
        "resourceId": "31",
        "actorEmail": "peter@changia.org.tz",
        "actor": { "id": 4, "firstName": "Peter", "lastName": "John", "email": "peter@changia.org.tz" },
        "severity": "INFO",
        "details": null,
        "createdAt": "2026-01-03T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 120, "totalPages": 5 }
  }
}
```

Common `action` values: `organization.registered`, `user.login`, `user.invited`, `user.updated`, `user.removed`, `user.password_changed`, `campaign.created`, `campaign.updated`, `campaign.submitted`, `campaign.approved`, `campaign.paused|completed|cancelled`, `donor.created`, `donor.updated`, `donor.deleted`, `payment.requested`, `donation.confirmed`.

### `GET /audit-logs/recent`

The 10 most recent entries (same log shape, no pagination):

```json
{ "success": true, "data": [ { "…same log object…" } ] }
```

---

## Data transfer module — bulk CSV / XLSX export & import

Routes: `/data/:dataset/...` (authenticated). One dispatcher over the existing
feature services (`backend/modules/data-transfer/`). Every export is scoped by
the caller's role exactly like the underlying list endpoint; per-dataset role
gates live in `datasets.js`.

| Endpoint | Purpose |
|----------|---------|
| `GET /data/:dataset/export?format=csv\|xlsx&<filters>` | Stream the dataset's current filtered view as a file (`format` defaults to `csv`). Forwards the same query filters the list endpoint accepts. |
| `GET /data/:dataset/import-template?format=csv\|xlsx` | Header-only starter file; the `.xlsx` variant adds an **Instructions** sheet. Import-only datasets. |
| `POST /data/:dataset/import` (multipart, field `file`) | Parse + per-row Zod-validate a `.csv`/`.xlsx`, insert valid rows via the feature service. Responds `{ imported, duplicates, skipped, errors: [{ row, message }] }` and writes one `data.imported.<dataset>` audit entry. Max 5 MB, one file. |

**Datasets**

| `:dataset` | Export roles | Import roles | Notes |
|------------|--------------|--------------|-------|
| `donors` | all | `SUPER_ADMIN` | Import → `donorService.createDonor` per row; `DONOR_EXISTS` rows counted as `duplicates`. |
| `donor-pools` | `SUPER_ADMIN`, `CAMPAIGN_MANAGER` | — | |
| `pool-members` | `SUPER_ADMIN`, `CAMPAIGN_MANAGER` | `SUPER_ADMIN`, `CAMPAIGN_MANAGER` | Requires `?poolId=`. Import columns: `donor_phone` (required), `expected_amount`. |
| `donations` / `transactions` | all | `SUPER_ADMIN`, `ORG_ADMIN`, `CAMPAIGN_MANAGER` | Import records **confirmed** offline contributions (`recordManualDonation`) — updates campaign totals. Org is taken from the campaign row; a `CAMPAIGN_MANAGER` is limited to assigned campaigns in their own org. Columns: `campaign_id`, `amount` (required), `donor_phone`, `donor_name`, `is_anonymous`. |
| `payouts` | `SUPER_ADMIN`, `ORG_ADMIN`, `REVIEWER`, `CAMPAIGN_MANAGER` | — | |
| `campaigns` | all | `ORG_ADMIN`, `CAMPAIGN_MANAGER` | Import creates each row as a `DRAFT` (`createCampaign` with `asDraft`). Columns: `name`, `goal_amount` (required), `category`, `story`, `minimum_amount`, `start_date`, `end_date`, `contact_phone`. |
| `audit-logs` | `SUPER_ADMIN` | — | |
| `approvals` | `SUPER_ADMIN`, `ORG_ADMIN`, `REVIEWER` | — | The caller's own review decisions; accepts `?type=`. |

The legacy `GET /audit-logs/export` and JSON `POST /donors/import` still work; the
audit export now also honours `?format=xlsx`.

---

## Roles & permissions matrix

| Endpoint | `SUPER_ADMIN` | `ORG_ADMIN` | `CAMPAIGN_MANAGER` |
|----------|:---:|:---:|:---:|
| POST `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` | ✅ public | ✅ public | ✅ public |
| GET `/auth/me`, POST `/auth/change-password` | ✅ | ✅ | ✅ |
| GET `/organizations`, GET `/organizations/stats` | ✅ | ✅ | ✅ |
| PUT `/organizations` | ✅ | ✅ | ❌ |
| GET `/users`, GET `/donors` | ✅ | ✅ | ✅ |
| POST `/users`, PUT/DELETE `/users/:id` | ✅ | ✅ | ❌ |
| GET `/campaigns`, GET `/campaigns/:id` | ✅ | ✅ | ✅ |
| **POST** `/campaigns` (create) | ❌ | ✅ | ✅ |
| PUT `/campaigns/:id`, status/submit/approve/managers/featured | ✅ | ✅ | partial* |
| GET `/campaigns/:id/completion-report` | ✅ | ✅ | ✅ (own) |
| **POST** `/campaigns/:id/completion-report` (submit proof) | ❌ | ❌ | ✅ (assigned) |
| POST `/campaigns/:id/completion-report/review` | ✅ | ✅ | ❌ |
| GET `/public/campaigns`, `/public/campaigns/completed*` | ✅ public | ✅ public | ✅ public |
| GET `/donor-pools` | ✅ | ✅ | ✅ |
| **POST** `/donor-pools` (create) | ❌ | ✅ | ✅ |
| PUT/DELETE `/donor-pools/:id` | ✅ | ✅ | owner only |
| POST `/donors` | ✅ | ✅ | ✅ |
| PUT/DELETE `/donors/:id` | ✅ | ✅ | ❌ |
| GET `/donations`, GET attempts | ✅ | ✅ | ✅ |
| POST `/donations/campaigns/:id/attempts` | ✅ | ✅ | ✅ |
| POST `/donations/simulate-callback` | ✅ | ✅ | ❌ |
| GET `/audit-logs` (+ `/recent`, `/export`) | ✅ | ❌ | ❌ |
| GET `/data/:dataset/export` | ✅ (all datasets) | ✅ (campaigns, donations, payouts, approvals) | ✅ (donors, donor-pools, pool-members, donations, payouts, campaigns) |
| POST `/data/:dataset/import` | ✅ (donors) | ✅ (donations, campaigns) | ✅ (pool-members, donations, campaigns) |

\* `CAMPAIGN_MANAGER` can update their own assigned campaigns and change status, but not `/managers` or `/featured`. A `CAMPAIGN_MANAGER` is also blocked from **creating** any new campaign (`409 CAMPAIGN_PROOF_REQUIRED`) while a campaign assigned to them is `COMPLETED` without an `APPROVED` completion report.

---

*Generated from the live route definitions in `backend/modules/*/routes.js`. Setup & configuration: see [`README.md`](README.md). Database: [`database.sql`](database.sql).*
