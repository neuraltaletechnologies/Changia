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
| Super admin | `admin@changia.co` |
| Org admin | `admin@msuya.or.tz` |
| Campaign  manager | `manager@msuya.or.tz` |

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
├── utils/              # ApiError, asyncHandler, token, phone helpers
└── modules/            # Each feature = MVC module (routes → controller → service)
    ├── auth/           # register, login, me, change-password
    ├── organization/   # org profile + dashboard stats
    ├── user/           # team management
    ├── Campaign /       # Campaigns + service fee + approval flow
    ├── donor/          # donor CRM + consents
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
| `donors` | Contact profile, phone-normalized + deduplicated per org |
| `consents` | Per-channel opt-in/opt-out |
| `Campaigns` | Goal, service fee %, **public target = goal + fee**, status flow |
| `message_batches` / `message_deliveries` | Bulk SMS/WhatsApp/email sends (Campaign 2) |
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

---

## API reference

> 📖 **Full endpoint documentation — request payloads, required vs. optional fields, response shapes, and error codes — is in [`API_REFERENCE.md`](API_REFERENCE.md).** The table below is just the quick overview.

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
| GET / POST | `/users` | List / invite team members (returns temp password) |
| PUT / DELETE | `/users/:id` | Update / remove team member (admin) |
| GET / POST | `/Campaigns` | List / create Campaigns (auto fee calc) |
| GET | `/Campaigns/:id` | Detail + progress + recent donations |
| PUT | `/Campaigns/:id` | Edit draft/pending |
| POST | `/Campaigns/:id/submit` → `/approve` | Approval flow |
| POST | `/Campaigns/:id/status` | Pause / complete / cancel |
| PUT | `/Campaigns/:id/managers` | Assign Campaign  managers |
| GET / POST | `/donors` | List / add donors (with consent) |
| GET / PUT / DELETE | `/donors/:id` | Donor detail / update / remove |
| GET | `/donations` | Confirmed donations |
| POST | `/donations/Campaigns/:Campaign Id/attempts` | Send a **push payment request** |
| GET | `/donations/Campaigns/:Campaign Id/attempts` | Payment request status |
| POST | `/donations/simulate-callback` | ⚠️ Simulated gateway callback (dev only) |
| GET | `/audit-logs` (+ `/recent`) | Immutable audit trail |

> In production, `simulate-callback` is replaced by a signature-verified webhook from the payment provider. The idempotency + confirmed-only rules are identical.

---

## Useful commands

```bash
npm run dev       # Start with auto-restart (node --watch)
npm start         # Start normally
mysql -u root -p < database.sql   # (Re)import the database anytime
```

## What's next (roadmap)
1. **Email/SMS providers** — invite emails, receipts, bulk Campaigns (Campaign 2)
2. **Real payment gateway** — replace `simulate-callback` with a signed webhook
3. **Payouts & settlements** — approve and reconcile withdrawals
4. **Public Campaign  pages** — shareable links with a donation flow
