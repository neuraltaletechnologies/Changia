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

- `/dashboard/pools` — donor pools by category (Family/School/Student/Office), donor CRUD, sort/filter
- `/dashboard/pools/[id]` — pool members, payment status, manual reminders, duplicate resolution
- `/dashboard/pools/anomalous` — unmatched-payment donors, re-attach to a known donor
- `/dashboard/reminders` — **Pending Resends**: auto-resend cycles waiting for your confirmation before anything sends
- `/dashboard/reminders/templates` — reusable SMS/WhatsApp/Email reminder templates
- `/dashboard/reminders/schedules` — configure automatic resend intervals per pool or campaign

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
