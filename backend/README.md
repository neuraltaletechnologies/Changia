# Changia API

The backend for the Changia fundraising platform — plain **Node.js + Express** in **JavaScript** (no TypeScript, no Docker), using **MySQL** with an importable `database.sql` file.

It powers the frontend's login, registration, dashboards, Campaigns, donor CRM, payments, and audit trail.

---

## Quick start (what YOU need to do)

### 1. Create the database (import the file)

Open **`database.sql`** and import it into your MySQL. It creates the `changia` database, all tables, and demo data.

**Option A — phpMyAdmin / hosting control panel (easiest):**
1. Open phpMyAdmin (e.g. `http://localhost/phpmyadmin`)
2. Click the **Import** tab
3. Choose the `database.sql` file and click **Go**

**Option B — command line (XAMPP/LAMP/MySQL installed):**
```bash
cd backend
mysql -u root -p < database.sql
```

**Option C — XAMPP on Windows:**
```bash
C:\xampp\mysql\bin\mysql -u root -p < database.sql
```

### 2. Configure and run the API

```bash
cd backend
npm install          # install dependencies once

# Edit the database credentials in config.js (or create a .env file):
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

npm run dev          # start with auto-restart → http://localhost:5000
```

Check it's alive: **http://localhost:5000/api/v1/health**

### 3. Start the frontend

```bash
cd ../Frontend
npm install
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000/login** and sign in, or create a new organization at **http://localhost:3000/register**.

---

## Demo accounts (imported with database.sql)

All use the password **`Changia@2026`**:

| Role | Email |
|------|-------|
| Super admin | `admin@changia.org.tz` |
| Org admin | `admin@msuya-foundation.org.tz` |
| Campaign  manager | `manager@msuya-foundation.org.tz` |

> ⚠️ Change the `JWT_SECRET` in `config.js`/`.env` before any production use.

---

## Configuration (config.js)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | API port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed browser origins (comma-separated) |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | *(empty)* | MySQL password |
| `DB_NAME` | `changia` | Database name |
| `JWT_SECRET` | dev default | **Change this** — signs access tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `DEFAULT_SERVICE_FEE_PERCENT` | `5` | Campaign  service fee (added on top of the goal) |
| `MESSAGE_PROVIDER` | `simulated` | `simulated` (no credentials needed, just logs sends) or `live` (see [Messaging providers setup](#messaging-providers-setup)) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | *(empty)* | Email reminders (Nodemailer/SMTP) |
| `AT_USERNAME` / `AT_API_KEY` / `AT_SENDER_ID` | *(empty)* | SMS reminders (Africa's Talking) |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` | *(empty)* | WhatsApp reminders (Meta Cloud API) |
| `REMINDER_SCHEDULER_INTERVAL_MINUTES` | `60` | How often the auto-resend scheduler checks for due donor-pool/campaign reminder cycles |

You can set these as environment variables or edit `config.js` directly — no .env file is required.

---

## Project structure

```
backend/
├── database.sql        # ★ Import this file into MySQL (schema + demo data)
├── server.js           # Entry point
├── app.js              # Express app assembly
├── config.js           # Environment + DB configuration
├── db.js               # MySQL connection pool + helpers
├── middlewares/
│   ├── auth.js         # JWT verify + role authorization
│   ├── validate.js     # Zod request validation
│   ├── rateLimiter.js  # Brute-force protection
│   └── errorHandler.js # Centralized errors
├── utils/              # ApiError, asyncHandler, token, phone, messaging helpers
├── jobs/
│   └── reminderScheduler.js  # node-cron tick → queues due auto-resend batches
└── modules/            # Each feature = MVC module (routes → controller → service)
    ├── auth/           # register, login, me, change-password
    ├── organization/   # org profile + dashboard stats
    ├── user/           # user management
    ├── Campaign /       # Campaigns + service fee + approval flow
    ├── donor/          # donor CRM + consents + payment methods
    ├── donor-pool/     # named donor pools, anomalous/unmatched pool, reminders
    ├── reminder-template/  # reusable SMS/WhatsApp/Email message templates
    ├── reminder-schedule/  # auto-resend schedules + pending-approval queue
    ├── donation/       # payment attempts + confirmed donations
    └── audit/          # immutable audit trail
```

Each module is a classic MVC trio:
- **`routes.js`** — URL mapping + middleware (auth, roles, validation)
- **`controller.js`** — request/response handling (thin)
- **`service.js`** — business logic + SQL (thick)

---

## Database design

Entities mirror the business proposal's core data entities:

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant boundary (multi-organization ready) |
| `users` | Identities + roles (`SUPER_ADMIN`, `ORG_ADMIN`, `CAMPAIGN_MANAGER`) |
| `Campaign _assignments` | Manager → Campaign  assignments |
| `donors` | Contact profile, phone-normalized + deduplicated per org (`gender`, `position`, `preferred_channel`, `is_anomalous`) |
| `consents` | Per-channel opt-in/opt-out |
| `donor_pools` | Named pools (`FAMILY`/`SCHOOL`/`STUDENT`/`OFFICE`); `is_system=1` marks a manager's own anomalous/unmatched pool |
| `donor_pool_members` | Donor ↔ pool membership + per-pool expected pledge |
| `donor_payment_methods` | A donor's registered mobile-money/bank/cash methods |
| `campaign_donor_targets` | Donors tracked on a campaign (imported from a pool or added directly) + expected pledge |
| `Campaigns` | Goal, service fee %, **public target = goal + fee**, status flow |
| `message_templates` | Reusable per-channel SMS/WhatsApp/Email reminder templates |
| `reminder_schedules` | Auto-resend config (pool or campaign scope, interval, channels, templates) |
| `reminder_pending_batches` | Due auto-resend cycles awaiting manager confirmation — nothing sends until confirmed |
| `message_batches` / `message_deliveries` | Every SMS/WhatsApp/Email send (manual or confirmed auto-resend) + per-donor delivery status |
| `payment_attempts` | Every push/link request with **unique idempotency key** |
| `gateway_events` | Raw provider callbacks |
| `donations` | **Confirmed donations only** — receipt numbers `CHG-YYYY-NNNNNN` |
| `receipts` | Receipt delivery state |
| `payouts` | Settlement/payout requests |
| `audit_logs` | Immutable security-relevant events |

### Money rules enforced by the API
- Amounts are **integer TZS** (`DECIMAL(14,0)`) — no float precision issues.
- **Only a verified gateway callback creates a confirmed donation.**
- The unique `payment_attempt_id` idempotency guard means the same gateway event is **never counted twice**.
- Campaign  progress uses **confirmed donations only**; the public target blocks new payment initiations.
- The platform **never stores or asks for a mobile-money PIN**.

### Donor pool & reminder rules enforced by the API
- A donor pool is visible to the `CAMPAIGN_MANAGER` who created it and to `ORG_ADMIN`/`SUPER_ADMIN` — one manager can never list or open another manager's pool.
- **Each manager gets their own anomalous ("unmatched payment") pool**, resolved from the campaign's assigned manager (`campaign_assignments`) at the moment an unrecognized payment lands. A campaign with no assigned manager falls back to one shared org-wide "Unassigned" pool. Admins can view any manager's anomalous pool.
- Payment status per donor (`UNPAID` / `PARTIAL` / `PAID_FULL`) is always **derived** from confirmed donations vs. the expected pledge — never stored.
- Automatic resend (`reminder_schedules`) can **never** target a pool's system/anomalous bucket — creating a schedule against one is rejected.
- An auto-resend schedule never sends by itself: each due cycle only creates a `reminder_pending_batches` row. A manager must open **Reminders → Pending Resends** and click **Confirm & Send** before any SMS/WhatsApp/Email goes out. Each donor is then messaged on their own `preferred_channel` (falling back to the schedule's first enabled channel).

---

## Messaging providers setup

Reminders (manual sends and confirmed auto-resend batches) go through `utils/messaging.js`. By default `MESSAGE_PROVIDER=simulated` — every send is logged to the console and recorded in `message_deliveries` with a synthetic reference, so the whole reminder workflow (templates, schedules, pending-approval queue) works end-to-end **with zero credentials**. Set `MESSAGE_PROVIDER=live` once you've filled in the credentials for the channel(s) you use below; a channel with missing credentials fails loudly (`status: FAILED` + an `error` message on the delivery row) instead of silently pretending to send.

### Email — SMTP (Nodemailer)
Works with any SMTP account.
1. Easiest for testing: a Gmail account with an **App Password** (Google Account → Security → 2-Step Verification → App passwords).
2. For production, use a transactional provider's SMTP credentials instead (SendGrid, Mailgun, Zoho Mail, Amazon SES, etc.) — better deliverability than a personal inbox.
3. Set in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-address@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-address@gmail.com
   SMTP_FROM_NAME=Changia
   ```

### SMS — Africa's Talking
Tanzania-first SMS delivery.
1. Sign up at [africastalking.com](https://africastalking.com) and create an app.
2. Start with the free **Sandbox** app to get an immediate `username`/`apiKey` for testing (sandbox SMS only deliver to phone numbers you've registered as test numbers in the dashboard).
3. For production, apply for a dedicated Sender ID / shortcode under a **Live** app (requires business verification — can take a few days).
4. Set in `.env`:
   ```
   AT_USERNAME=sandbox        # or your live app username
   AT_API_KEY=your-api-key
   AT_SENDER_ID=your-sender-id   # optional, live apps only
   ```

### WhatsApp — Meta WhatsApp Business Cloud API
1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com) (type: Business) and add the **WhatsApp** product.
2. In WhatsApp → API Setup you get a **test phone number** and a **temporary access token** (24h) immediately — enough to try it end-to-end.
3. For a token that doesn't expire, create a **System User** (Meta Business Settings → Users → System Users), assign it the WhatsApp app with `whatsapp_business_messaging` permission, and generate a permanent token from there.
4. Copy the **Phone Number ID** (not the phone number itself) from API Setup.
5. Set in `.env`:
   ```
   WHATSAPP_TOKEN=your-permanent-or-temporary-token
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
   ```
6. **Production note:** outside Meta's test mode, WhatsApp only allows *business-initiated* messages (like a payment reminder) using a template pre-approved by Meta. Reminder templates created in **Reminders → Templates** are plain text here for simplicity — for a production WhatsApp rollout, mirror their wording as an approved [message template](https://developers.facebook.com/docs/whatsapp/message-templates) in Meta Business Manager first.

### Reminder auto-resend scheduler
No credentials needed — it's a `node-cron` job inside the API process (`jobs/reminderScheduler.js`), started automatically by `server.js`. `REMINDER_SCHEDULER_INTERVAL_MINUTES` (default `60`) controls how often it checks for due schedules.

---

## API reference

> 📖 **Full endpoint documentation — request payloads, required vs. optional fields, response shapes, and error codes — is in [`API_REFERENCE.md`](API_REFERENCE.md).** The table below is just the quick overview.
>
> 🧩 **Frontend contract — everything the dashboard (`http://localhost:3000/dashboard/...`) needs, including the Donor Pool filters, donor transactions, and user add/invite flows, with full detail, is in [`FRONTEND_API_REQUIREMENTS.md`](FRONTEND_API_REQUIREMENTS.md).**

Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create organization + first admin (returns JWT) |
| POST | `/auth/login` | Sign in (returns JWT) |
| GET | `/auth/me` | Current user + organization |
| POST | `/auth/change-password` | Change own password |

### Organizations · Users · Campaigns · Donors · Donations · Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / PUT | `/organizations` | Org profile (admin for PUT) |
| GET | `/organizations/stats` | Dashboard summary numbers |
| GET / POST | `/users` | List / invite user members (returns temp password) |
| PUT / DELETE | `/users/:id` | Update / remove user member (admin) |
| GET / POST | `/Campaigns` | List / create Campaigns (auto fee calc) |
| GET | `/Campaigns/:id` | Detail + progress + recent donations |
| PUT | `/Campaigns/:id` | Edit draft/pending |
| POST | `/Campaigns/:id/submit` → `/approve` | Approval flow |
| POST | `/Campaigns/:id/status` | Pause / complete / cancel |
| PUT | `/Campaigns/:id/managers` | Assign Campaign  managers |
| GET / POST | `/donors` | List (with search/status/consent/tag/channel filters + counts) / add donors (with consent) |
| GET / PUT / DELETE | `/donors/:id` | Donor detail (+ donation history) / update / remove |
| GET | `/donations` | Confirmed donations (filter by `campaignId`/`donorId`) |
| POST | `/donations` | Record a manual/offline donation (bumps campaign progress atomically) |
| POST | `/donations/Campaigns/:Campaign Id/attempts` | Send a **push payment request** |
| GET | `/donations/Campaigns/:Campaign Id/attempts` | Payment request status |
| POST | `/donations/simulate-callback` | ⚠️ Simulated gateway callback (dev only) |
| GET | `/audit-logs` (+ `/recent`, `/export`) | Immutable audit trail |

### Donor pools · Reminder templates · Auto-resend schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/donor-pools` | List (own pools; admin sees all / filters by manager) / create a pool |
| GET / PUT / DELETE | `/donor-pools/:id` | Pool detail (+ member payment status) / update / delete |
| POST | `/donor-pools/:id/members` | Add existing or newly-created donors to a pool |
| PUT / DELETE | `/donor-pools/:id/members/:donorId` | Set a member's expected pledge / remove from pool |
| GET | `/donor-pools/duplicates` | Donors who appear in more than one pool |
| POST | `/donor-pools/duplicates/resolve` | Choose which pool each duplicate donor stays in |
| GET | `/donor-pools/anomalous` (+ `?managerId=`) | A manager's own anomalous pool, or (admin) any manager's / the unassigned fallback |
| POST | `/donor-pools/anomalous/:donorId/merge` | Re-attach an unmatched donor to a known one |
| POST | `/donor-pools/reminders/send` | One-off bulk SMS/WhatsApp/Email reminder to selected donors |
| GET / POST | `/reminder-templates` | List / create a reusable per-channel template |
| PUT / DELETE | `/reminder-templates/:id` | Update / delete a template |
| GET / POST | `/reminder-schedules` | List / create an auto-resend schedule (pool or campaign scope) |
| PUT / DELETE | `/reminder-schedules/:id` | Update / delete a schedule |
| GET | `/reminder-schedules/pending` | Due cycles awaiting confirmation |
| POST | `/reminder-schedules/pending/:id/confirm` \| `/skip` | Send a queued cycle now, or skip it |

> In production, `simulate-callback` is replaced by a signature-verified webhook from the payment provider. The idempotency + confirmed-only rules are identical.

---

## Useful commands

```bash
npm run dev       # Start with auto-restart (node --watch)
npm start         # Start normally
mysql -u root -p < database.sql   # (Re)import the database anytime
```

## What's next (roadmap)
1. ~~**Email/SMS/WhatsApp providers**~~ — done: see [Messaging providers setup](#messaging-providers-setup) (still needs real credentials in production; falls back to `simulated` without them)
2. **Real payment gateway** — replace `simulate-callback` with a signed webhook
3. **Payouts & settlements** — approve and reconcile withdrawals
4. **Public Campaign  pages** — shareable links with a donation flow
5. **WhatsApp template approval** — mirror reminder templates as Meta-approved message templates for production business-initiated sends
