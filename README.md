# Changia

**Digital Fundraising &  All money transfer Contribution Platform**

Tanzania-first. fast campaign money. Built for everyday donors.

> Business Proposal, Campaign Specification and Implementation Plan
> Prepared for: Dr. Msuya / Initial Launch Partner
> Prepared by: Changia Development Team
> Proposal date: 30 July 2026
> Status: Confidential — for review and approval

---

## Overview

Changia is a digital fundraising platform that helps people and organizations collect contributions with less friction. It launches with Dr. Msuya as the first organization, with the data model designed so additional organizations can be added in a future multi-tenant module.

The platform combines two complementary donation methods:

- **Campaign  Link Distribution** — shareable links sent via SMS, WhatsApp, email, QR codes and social media; donors open the link and pay.
- **Instant Push Donation** — a Campaign  manager who has already secured a donor's verbal agreement sends a direct payment request; the donor just confirms with their mobile-money PIN.

**Important payment rule:** Changia never stores, sees, or asks a donor for a mobile-money PIN. The PIN is entered only in the operator- or gateway-controlled approval prompt.

## Campaign Campaigns

The Campaign is split into three independent, payable modules.

| Campaign | Primary outcome | Development fee (TZS) |
|---|---|---|
| 1. Core Platform & Donor Pool | Secure interface, user management, dashboards, donor CRM | 200,000 |
| 2. Campaign  Link Distribution | Create Campaigns, distribute via SMS/WhatsApp/email, collect via link | 200,000 |
| 3. Instant Push Donation | Manager sends a direct payment request; donor confirms with PIN | 200,000 |
| **Total Campaign** | **All three approved modules** | **600,000** |

### Campaign 1 — Core Platform & Donor Pool
Public pages (landing, About, Contact, FAQ, Privacy, Terms), authentication, dashboards, user/role management, and a consent-aware Donor Pool (CRM) with import, dedupe, tagging, and channel opt-out support.

### Campaign 2 — Campaign  Link Distribution
Campaign  creation and approval, a mobile-first public Campaign  page, unique short links and QR codes, bulk SMS/WhatsApp/email sends to consented donors, delivery tracking, and post-payment receipts/progress updates.

### Campaign 3 — Instant Push Donation
Manager workspace for assigned Campaigns, donor search/capture, a push-request form, request status tracking, receipts, manager-level reporting, and full audit logging. Depends on the selected payment gateway supporting a compliant push/authorization flow.

## User Roles

| Role | Scope |
|---|---|
| Super Administrator | Platform config, fee settings, org setup, gateway settings, support/audit access |
| Organization Administrator (Dr. Msuya) | Creates/approves Campaigns, manages org users and donor pool, views reports, requests payouts |
| Campaign  Manager | Works only on assigned Campaigns; adds consented donors; sends approved push requests; no withdrawal access |
| Donor | Receives messages, opens links, donates, receives receipts |

## Revenue Model

Changia does not deduct a fee from individual donations. Instead, a configurable service fee is added on top of the Campaign 's requested amount at creation, so every contribution counts at full face value toward the Campaign  owner's goal.

**Example (5% fee):**

| Item | Amount (TZS) |
|---|---|
| Campaign  purpose amount | 10,000,000 |
| Changia service fee (5%) | 500,000 |
| Public collection target | 10,500,000 |
| Owner allocation at full target | 10,000,000 |
| Changia allocation at full target | 500,000 |

Only verified gateway callbacks create confirmed donations; idempotency keys prevent double-counting.

## Technical Architecture

Responsive web application (web-first, so donors don't need to install anything). A native mobile app is a proposed future module.

```
Public donor web  ─┐
Admin/manager web ─┼─► Secure backend API ─► PostgreSQL + object storage
                    │                     ─► Gateway + SMS/WhatsApp/email providers
```

**Core data entities:** organizations · users/roles/memberships · donors & consents · Campaigns & Campaign _managers · message_batches & deliveries · payment_attempts & gateway_events · donations/fees/payouts/settlements · receipts & audit_logs

## Security, Privacy & Compliance

- HTTPS/TLS everywhere; secrets in a managed store
- No PIN capture; gateway callbacks validated by signature/reference/status
- Role-based access, org boundaries, manager-to-Campaign  assignment, audit logs
- Data minimization, consent tracking, retention/deletion policy
- Requires qualified Tanzanian legal, tax, privacy and payment advice before accepting public funds (this proposal is not legal/tax/regulatory advice)

## Commercial Terms

### Milestone payments

| Milestone | Trigger | Fee (TZS) |
|---|---|---|
| 1. Campaign 1 acceptance | Core interface, roles, donor pool, dashboard demo approved | 200,000 |
| 2. Campaign 2 acceptance | Link distribution, messaging integration, payment callback demo approved | 200,000 |
| 3. Campaign 3 acceptance | Push request test, verified callback, manager controls approved | 200,000 |
| **Total** | **All modules delivered & handed over** | **600,000** |

### Indicative schedule

| Phase | Duration |
|---|---|
| Discovery, gateway/provider selection, design | 1–2 weeks |
| Campaign 1 | 2–3 weeks |
| Campaign 2 | 2–3 weeks |
| Campaign 3 | 2–3 weeks |
| UAT, deployment, training | 1 week |

### Costs excluded from the development fee

- VPS/cloud hosting (~TZS 130,000/yr), domain/DNS (~TZS 25,000/yr), email delivery (~TZS 72,000/yr)
- SMS API / bulk SMS (per message, provider-specific)
- Payment gateway merchant onboarding (gateway-specific)
- Legal, accounting, tax, compliance, insurance
- Paid advertising / Campaign  media production

## Roadmap (Future Campaigns)

| Campaign | Scope | Fee (TZS) |
|---|---|---|
| Multi-user / multi-organization platform | Isolated data, branding, membership, approval, fee settings per org | 350,000 |
| Mobile application | Native app for admins, managers and donors | 500,000 |

Also planned: feature-phone SMS/USSD donation menus, recurring donations, Campaign  approval workflow, withdrawal controls, verified-org badges, donor segmentation, Swahili/English language support, and exportable financial reports.

## Delivery & Ownership

- A donation is only confirmed after a verified gateway callback; no double-counting.
- Managers can never withdraw funds or change platform settings.
- 30-day defect warranty within approved scope (excludes third-party/gateway outages).
- Dr. Msuya owns his organization's data, Campaigns, brand/content and reports. The development team retains reusable Changia source code and generic components unless full ownership/exclusivity is separately purchased.

---

*This README summarizes the full proposal document, `Changia_Fundraising_Platform_Proposal_Updated.docx`, which contains complete details including navigation flows, functional/non-functional requirements, data model, and appendices.*
Digital Fundraising &  All money transfer Contribution Platform

Tanzania-first, fast campaign money platform for simple, transparent, auditable fundraising.

## Repository layout

```
├── backend/     # Node.js + Express + MySQL API (plain JavaScript, MVC)
│   └── README.md  ← full setup instructions & API reference
└── Frontend/    # Next.js marketing site + org dashboard
    └── README.md  ← frontend setup instructions
```

## Quick start

The repo is a **pnpm + Turborepo** monorepo: one install and one command boots both
the backend API and the frontend at the same time.

**1. Install dependencies** (from the repo root)

```bash
pnpm install
```

**2. Create the database** — import `backend/database.sql` into your MySQL
(phpMyAdmin → Import, or `mysql -u root -p < database.sql`). It creates the
`changia` database, all tables, and demo data.

**3. Copy the env examples** (only needed the first time)

```bash
cp Backend/.env.example  Backend/.env
cp Frontend/.env.example Frontend/.env
```

**4. Run everything (backend + frontend together)**

```bash
pnpm dev        # backend → http://localhost:5000,  frontend → http://localhost:3000
```

Turbo runs each package's `dev` script in parallel (`next dev` for the frontend,
`node --watch server.js` for the API). Other useful commands:

```bash
pnpm build      # build both (currently the frontend)
pnpm lint       # lint all packages that define it
pnpm turbo run dev --filter=changia      # run only the frontend
pnpm turbo run dev --filter=changia-api  # run only the backend
```

Visit `http://localhost:3000/login` and sign in with `admin@changia.org.tz` / `Changia@2026`,
or create a new organization at `http://localhost:3000/register`.
