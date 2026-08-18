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
- [Roles & permissions matrix](#roles--permissions-matrix)

---

## Authentication

All endpoints except `/auth/register` and `/auth/login` require a JWT in the header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained from `POST /auth/register` or `POST /auth/login` (`data.accessToken`). Default expiry: **7 days** (`JWT_EXPIRES_IN`).

The middleware reloads the user from the database on every request, so role/status changes take effect immediately. An inactive account (`status !== "ACTIVE"`) is rejected with `403 ACCOUNT_INACTIVE`.

### Roles

| Role | Meaning |
|------|---------|
| `SUPER_ADMIN` | Platform-wide administrator (no organization) |
| `ORG_ADMIN` | Administrator of one organization |
| `CAMPAIGN_MANAGER` | Field fundraiser: can push payment requests, manage donors |

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

### `POST /users` — `SUPER_ADMIN` or `ORG_ADMIN`

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

### `PUT /users/:id` — `SUPER_ADMIN` or `ORG_ADMIN`

**All fields optional:** `firstName`, `lastName`, `phone`, `role` (`ORG_ADMIN` | `CAMPAIGN_MANAGER`), `status` (`ACTIVE` | `PENDING` | `INACTIVE`).

**Response — `200 OK`:** the updated user object (same shape as above, without `temporaryPassword`).

### `DELETE /users/:id` — `SUPER_ADMIN` or `ORG_ADMIN`

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

### `PUT /campaigns/:id` — `SUPER_ADMIN` or `ORG_ADMIN`

**All fields optional** — same fields as `POST /campaigns`. Changing `goalAmount` or `serviceFeePercent` recomputes `serviceFeeAmount` and `publicTarget`.

> ⚠️ Only campaigns in `DRAFT` or `PENDING` can be edited — otherwise `400 CAMPAIGN_LOCKED`.

**Response — `200 OK`:** the updated campaign object.

### `POST /campaigns/:id/submit` — `SUPER_ADMIN` or `ORG_ADMIN`

Moves the campaign `DRAFT → PENDING` (ready for approval). **No body.**

**Response — `200 OK`:** the campaign object (status `PENDING`).
**Errors:** `400` if not currently `DRAFT`.

### `POST /campaigns/:id/approve` — `SUPER_ADMIN` or `ORG_ADMIN`

Moves the campaign `PENDING → ACTIVE` and sets `isPublic = true`. **No body.**

**Response — `200 OK`:** the campaign object (status `ACTIVE`, `isPublic: true`, `approvedBy`/`approvedAt` set).
**Errors:** `400` if not currently `PENDING`.

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

#### `POST /campaigns/:id/completion-report/review` — `SUPER_ADMIN` or `ORG_ADMIN`

**Required body:**

```json
{ "approved": true, "notes": "Confirmed with the receipts attached." }
```

**Response — `200 OK`:** the report object with `status: "APPROVED"` or `"REJECTED"`.
**Errors:** `404` (no report submitted yet), `400 REPORT_NOT_PENDING` (already reviewed).

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

One-off bulk reminder (manual send, not a scheduled resend).

| Field | Type | Rules |
|-------|------|-------|
| `campaignId` | number | required |
| `donorIds` | number[] | required, 1–500 |
| `channel` | string | `SMS` \| `WHATSAPP` \| `EMAIL` |
| `subject` | string | optional (Email only) |
| `message` | string | required, max 5000 |

**Response — `201 Created`:** `{ batch: {...}, deliveries: [{ donorId, recipient, status, providerRef, sentAt }] }`. Actual delivery depends on `MESSAGE_PROVIDER` — see `Backend/README.md` → "Messaging providers setup".

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

Routes: `/audit-logs` — all authenticated, org-scoped. The trail is **immutable** (write-only) — every meaningful action records an entry.

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

## Roles & permissions matrix

| Endpoint | `SUPER_ADMIN` | `ORG_ADMIN` | `CAMPAIGN_MANAGER` |
|----------|:---:|:---:|:---:|
| POST `/auth/register`, `/auth/login` | ✅ public | ✅ public | ✅ public |
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
| GET `/audit-logs` (+ `/recent`) | ✅ | ✅ | ✅ |

\* `CAMPAIGN_MANAGER` can update their own assigned campaigns and change status, but not `/managers` or `/featured`. A `CAMPAIGN_MANAGER` is also blocked from **creating** any new campaign (`409 CAMPAIGN_PROOF_REQUIRED`) while a campaign assigned to them is `COMPLETED` without an `APPROVED` completion report.

---

*Generated from the live route definitions in `backend/modules/*/routes.js`. Setup & configuration: see [`README.md`](README.md). Database: [`database.sql`](database.sql).*
