# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Changia is a Tanzania-first digital fundraising platform. Organizations create campaigns, build a consented donor pool, and collect donations via shareable links or "instant push" mobile-money requests. **Changia never stores or asks for a donor's mobile-money PIN** — the PIN is only entered in the gateway's own approval prompt, and a donation is only confirmed after a verified gateway callback (idempotent by `payment_attempt_id`).

The repo is a **pnpm + Turborepo monorepo** with two workspace packages (`pnpm-workspace.yaml`): `Backend` (Express API, package name `changia-api`) and `Frontend` (Next.js app, package name `changia`).

## Commands

Run from the repo root unless noted:

```bash
pnpm install                              # install everything once
pnpm dev                                  # backend :5000 + frontend :3000 in parallel (turbo)
pnpm build                                # build all packages
pnpm lint                                 # lint all packages that define a lint script
pnpm format:check / pnpm format:fix       # prettier, all packages

pnpm turbo run dev --filter=changia       # frontend only
pnpm turbo run dev --filter=changia-api   # backend only
```

Backend-only (from `Backend/`):
```bash
npm run dev     # node --watch server.js -> http://localhost:5000
npm start       # no watch
mysql -u root -p < database.sql   # (re)import schema + demo data into MySQL
```
There is no backend test suite or automated lint script — verify changes by hitting `GET /api/v1/health` and the relevant endpoint (see `Backend/API_REFERENCE.md`).

Frontend-only (from `Frontend/`):
```bash
npm run dev          # next dev
npm run build
npm run typecheck    # tsc --noEmit
npm run format:check / format:fix
```
No frontend test suite exists either — `typecheck` + `lint` are the main safety nets.

Demo login (freshly-imported `database.sql`): `admin@changia.org.tz` / `Changia@2026` (SUPER_ADMIN), `admin@msuya-foundation.org.tz` / `Changia@2026` (ORG_ADMIN), `manager@msuya-foundation.org.tz` / `Changia@2026` (CAMPAIGN_MANAGER). Register a fresh org at `/register`. Note: an existing local MySQL database may have been seeded from an older copy of `database.sql` with different demo emails — if these don't work, check what's actually in the `users` table rather than assuming the DB matches this file.

## Backend architecture (`Backend/`)

Plain **Node.js + Express 5, JavaScript (no TypeScript), MySQL** via `mysql2` — no ORM, no Docker. Entry point `server.js` → `app.js` (`createApp()` assembles middleware + routes) → `db.js` (connection pool + `db.query`).

Every feature is a **module** under `modules/<name>/` with a strict MVC trio, wired together in `app.js`:
- `routes.js` — URL mapping, `authenticate`/`authorize(...roles)` from `middlewares/auth.js`, and `validate({ body, query, params })` (Zod schemas) from `middlewares/validate.js`. Wildcard/general routes come first, more specific ones layer `authorize` per-route rather than per-router.
- `controller.js` — thin request/response glue, wrapped in `utils/asyncHandler.js`.
- `service.js` — the actual business logic and hand-written SQL (thick). Row objects are mapped from `snake_case` DB columns to `camelCase` API shapes here (see `mapCampaign` in `modules/campaign/service.js`).
- `validation.js` — Zod schemas used by `routes.js`.

Modules: `auth`, `organization`, `user`, `campaign`, `donor`, `donor-pool`, `donation`, `audit`. Errors are thrown as `ApiError` (`utils/ApiError.js`) and caught centrally by `middlewares/errorHandler.js`; unknown routes hit `notFoundHandler`. Auth is stateless JWT (`utils/token.js`) — `authenticate` re-fetches the user from MySQL on every request so role/status changes apply immediately (no session invalidation needed).

Key domain rules enforced in the service layer (see `Backend/README.md` for the full data model):
- Money is integer TZS (`DECIMAL(14,0)`), never floats.
- Campaign `publicTarget = goalAmount + serviceFeeAmount`; the fee is added on top of the goal, not deducted from donations.
- Only a verified gateway callback (`POST /donations/simulate-callback` in dev) creates a confirmed `donations` row; `payment_attempts` carries a unique idempotency key so a callback is never double-counted.
- Three roles: `SUPER_ADMIN` (platform-wide), `ORG_ADMIN` (owns one org), `CAMPAIGN_MANAGER` (works only assigned campaigns, no payout access) — org-scoped by `organization_id` on almost every query.

Config comes from `config.js` (env vars, see `.env.example`); no `.env` file is strictly required since `config.js` has dev defaults, but **change `JWT_SECRET`** before anything resembling production. `Backend/API_REFERENCE.md` and `Backend/FRONTEND_API_REQUIREMENTS.md` are the source of truth for endpoint shapes when wiring up frontend calls — check them before guessing a payload/response shape.

## Frontend architecture (`Frontend/`)

**Next.js 15 App Router, TypeScript, Tailwind v4, React 19.** The live app lives under `Frontend/src/app`; `Frontend/next.config.mjs` sets `outputFileTracingRoot` to anchor Next.js at the monorepo root.

Route groups:
- `src/app/(marketing)/` — public marketing site (home, campaigns, blog, insights, products, services, contact). Swahili is served as a **parallel literal path tree** under `(marketing)/sw/...` (not a Next.js i18n routing feature) — a new marketing page generally needs a companion under `sw/`.
- `src/app/dashboard/` — the authenticated org dashboard (campaigns, donors, donor pools, team, audit-log, settings). Has its own `layout.tsx`/`globals.css`/`error.tsx` distinct from the marketing shell.
- `src/app/login`, `src/app/register` — auth entry points outside both groups.

Content collections (blog/insights/products) are **not** Astro — `src/lib/content.ts` reimplements a `getCollection()` reader over `.md`/`.mdx` files under `src/content/<dir>` using `gray-matter`, keyed by `lang/slug` id. Note the `campaigns` collection is backed by the on-disk `src/content/products/` directory (kept for historical reasons — don't be thrown by the mismatch). Docs under `src/content/docs/` are still MDX with many locale subfolders left over from a prior Starlight setup.

**⚠️ `Frontend/AI_GUIDE.md` describes an older Astro version of this project** (Astro pages/content.config.ts, `@component`-style path aliases) and does not match the current Next.js App Router code — don't follow it; this section supersedes it.

**⚠️ `Frontend/dashboard/` is a separate, standalone Next.js app** (its own `package.json`/lockfile/`app/` dir, originally bootstrapped via v0.app) with a parallel implementation of the same dashboard pages (campaigns, donors, team, settings, audit-log) plus its own copies of the public pages (about, contact, faq, privacy, terms). It is **not** listed in `pnpm-workspace.yaml` and is not run by `pnpm dev`. Treat it as a reference/legacy source — when a feature is being ported or compared, cross-check both `Frontend/dashboard/app/(dashboard)/...` and `Frontend/src/app/dashboard/...`, but make real changes in `Frontend/src/app`. Mirrored/soon-to-migrate files include `Frontend/dashboard/lib/mock-data.ts` vs. the new `Frontend/src/lib/dashboard/*-store.ts` files — the latter are the ones backed by the real API.

Dashboard-specific logic lives in `src/lib/dashboard/`:
- `permissions.ts` — the single source of truth for RBAC: `Role`, `Permission`, `ROLE_PERMISSIONS`, and `ROUTE_ACCESS` (longest-prefix-match route guard). Sidebar, mobile nav, and page guards all read from here — extend this file rather than hardcoding role checks elsewhere.
- `api.ts`, `*-store.ts` (campaign/donor/transaction/user) — typed wrappers over the backend API.
- `types.ts`, `utils.ts`.

`src/lib/api-client.ts` is the one fetch client for the whole app (`'use client'`): reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api/v1`), stores the JWT + user in `localStorage` (`changia_access_token` / `changia_user`), attaches `Authorization: Bearer`, and auto-redirects to `/login?redirect=...` on a 401. `src/hooks/use-role.ts` hydrates role/permissions from the stored session for client components (`useRole()` → `hasPermission`, `canAccessRoute`, `isSuperAdmin`, etc.).

Path aliases (`tsconfig.json`): `@/*` → `src/*`. Images referenced via `src/lib/images.ts` (`resolveImage`/`resolveImageRequired`).

`Frontend/vercel.json` sets a strict CSP/security header set for deployment — keep new external resources (fonts, images, scripts) consistent with the existing `connect-src`/`img-src`/`script-src` allowlist or update it deliberately.
