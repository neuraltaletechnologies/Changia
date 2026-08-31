    Changia — Digital Fundraising &  All money transfer Contribution Platform

A Tanzania-first, fast campaign money platform for simple, transparent, auditable fundraising. This frontend is built with **Next.js 15 (App Router), Tailwind CSS v4, Preline UI, React 19** and content collections for Campaigns, blog and insights (English + French).

The site currently presents the **campaigns** defined in the business proposal:

1. **Core Platform & Donor Pool** — secure interface, dashboards, donor CRM
2. **Campaign  Link Distribution** — create Campaigns, share via SMS/WhatsApp/email, collect via link
3. **Instant Push Donation** — manager sends a direct payment request; donor confirms with PIN

## Getting Started

1. Install dependencies
```bash
npm install
# or pnpm install
```
2. Run the development server
```bash
npm run dev
# or
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).

## Content

- `src/content/campaigns/` — the four Campaign pages (EN/FR)
- `src/content/blog/` — fundraising stories and guides (EN/FR)
- `src/content/insights/` — long-form articles (EN/FR)
- `src/data_files/` — features, FAQs, pricing and site configuration (EN/FR)

## Dashboard (donor pools & reminders)

The authenticated org dashboard lives under `src/app/dashboard` and talks to
the Backend API at `NEXT_PUBLIC_API_URL` (defaults to
`http://localhost:5000/api/v1` — set it in `.env.local` if the API runs
elsewhere). Donor pool / reminder pages:

- `/dashboard/pools` — donor pools by category (Family/School/Student/Office). Each pool card has a ⋯ menu (Edit details → right-side sheet / Delete pool). Donor section below shows **all donors** by default; picking a pool card narrows it to that pool and adds Add-Members / Resolve-Duplicates. Each donor row's ⋯ menu → View full profile (always) / Edit details (right-side sheet) / Remove from pool / Delete donor — Edit + Delete need the `donor:manage` permission (SUPER_ADMIN / ORG_ADMIN). Payment-status tracking, expected amounts and reminders live on the campaign page instead.
- `/dashboard/pools/[id]` — legacy redirect to `/dashboard/pools?pool=<id>`
- `/dashboard/pools/anomalous` — unmatched-payment donors, re-attach to a known donor
- Reminders have no standalone page — every campaign's **Reminders** tab
  (`/dashboard/campaigns/[id]` → Reminders) holds the one-off send, the
  **Pending Resends** queue (auto-resend cycles waiting for your confirmation
  before anything sends), the auto-resend schedules for that campaign, and the
  org-wide reusable SMS/WhatsApp/Email message templates. The Pending Resends
  queue is also surfaced on `/dashboard/approvals`.

Actually sending a reminder (manual or a confirmed auto-resend batch)
requires the backend's messaging credentials — see
`Backend/README.md` → **"Messaging providers setup"** for where to get an
Africa's Talking (SMS), Meta WhatsApp Business (WhatsApp) and SMTP (Email)
credential and which env var each goes into. Without those, reminders still
work end-to-end in `simulated` mode — they're just logged instead of
delivered, which is fine for local development.

## Commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run typecheck` — TypeScript check
- `npm run format:check` / `npm run format:fix` — Prettier

---

> Originally forked from the MIT-licensed [Changia ](https://themewagon.com/themes/Changia /) template by Emil Gulamov (distributed by ThemeWagon) and adapted for the Changia fundraising platform.
