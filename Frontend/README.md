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

## Commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run typecheck` — TypeScript check
- `npm run format:check` / `npm run format:fix` — Prettier

---

> Originally forked from the MIT-licensed [Changia ](https://themewagon.com/themes/Changia /) template by Emil Gulamov (distributed by ThemeWagon) and adapted for the Changia fundraising platform.
