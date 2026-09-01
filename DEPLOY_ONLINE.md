# Putting Changia online (free) — `changia.neuraltale.com`

A live, shareable deployment on an all-free stack.

| Piece | Host | Public URL |
| --- | --- | --- |
| `Frontend/` (Next.js) | **Vercel** (Hobby, free) | `https://changia.neuraltale.com` |
| `Backend/` (Express API) | **Render** (free web service) | `https://api.changia.neuraltale.com` |
| MySQL 8 | **Aiven for MySQL** (free plan) — or TiDB Cloud Serverless | private connection string |
| Uploaded photos | **Cloudflare R2** (free tier: 10 GB storage, no egress fee) | streamed via the API |

### Known free-tier trade-offs (accepted for the demo)
- **Render free sleeps after ~15 min idle** → the first request after a pause takes
  ~50 s to wake. Open `https://api.changia.neuraltale.com/api/v1/health` a minute
  before presenting to warm it.
- The `node-cron` reminder scheduler only runs while the backend is awake.
- Photos are safe across redeploys — they live in R2, not on Render's disk (step 2).

---

## 1 — MySQL (Aiven, free)

1. Sign up at <https://aiven.io> → **Create service** → **MySQL** → plan **Free** →
   pick a region close to Tanzania (e.g. `google-europe-west1` / `aws-eu-central-1`).
   No credit card required.
2. Wait for the service to reach **Running**, then open the **Overview** tab and note:
   `Host`, `Port`, `User` (`avnadmin`), `Password`, and the default DB name `defaultdb`.
3. Import the schema + demo data from your machine (needs the `mysql` client):

   ```bash
   mysql --host <HOST> --port <PORT> --user avnadmin -p \
         --ssl-mode=REQUIRED defaultdb < Backend/database.sql
   ```

   `database.sql` runs `CREATE DATABASE IF NOT EXISTS changia; USE changia;` — Aiven
   allows this, so afterwards the data lives in a **`changia`** database on the server.
4. **Change the demo passwords** — log in later via the app and reset, or run an
   `UPDATE users SET password_hash = ...` now.

> **Alternative — TiDB Cloud Serverless** (<https://tidbcloud.com>, also free, MySQL 8
> compatible): create a cluster, use its `Connect` panel for host/port/user/password,
> import `Backend/database.sql` the same way (it accepts `?ssl-mode=REQUIRED`).

---

## 2 — Photo storage (Cloudflare R2)

Render's disk is wiped on every redeploy, so uploads go to R2 instead. The backend
detects the `R2_*` env vars and stores every photo there, then streams it back
through `https://api.changia.neuraltale.com/uploads/...` (same URL as before — no
frontend change).

1. Cloudflare Dashboard → **R2** → **Create bucket** → name it `changia-uploads`
   (Standard, automatic location). R2 needs a card on file but the free tier
   (10 GB storage, Class-A/B ops quota, **zero egress fees**) covers this easily.
2. **R2 → Manage R2 API Tokens → Create API token** → permissions **Object Read & Write**,
   scoped to the `changia-uploads` bucket. Copy:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - The **Account ID** (shown on the R2 overview page) → `R2_ACCOUNT_ID`
3. Keep the bucket **private** (no public access / custom domain needed — the API
   is the only reader).

---

## 3 — Backend (Render)

The repo already carries [`render.yaml`](render.yaml) (a Blueprint).

1. Push this branch to GitHub (see §6) so Render can see it.
2. <https://render.com> → sign up with GitHub → **New → Blueprint** → pick
   `neuraltaletechnologies/Changia` → select the `Ntale` branch → **Apply**.
   Render reads `render.yaml`, creates the `changia-api` web service, and generates
   `JWT_SECRET` automatically.
3. When prompted (or in **Environment** after), fill the values marked `sync: false`:

   | Var | Value |
   | --- | --- |
   | `DB_HOST` / `DB_PORT` | Aiven host / port |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | Aiven password |
   | `DB_NAME` | `changia` |
   | `R2_ACCOUNT_ID` | Cloudflare account ID |
   | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | from the R2 API token |
   | `R2_BUCKET` | `changia-uploads` |

   `DB_SSL=true`, `NODE_ENV=production`, `CORS_ORIGINS`, `APP_BASE_URL`,
   `API_PUBLIC_URL` are already set by the blueprint.
4. First deploy → check the logs for `✅ Connected to MySQL database`, then hit
   `https://changia-api.onrender.com/api/v1/health` → `{"success":true,...}`.
5. **Settings → Custom Domains → Add** `api.changia.neuraltale.com`. Render shows a
   CNAME target (`changia-api.onrender.com`). Add it in Cloudflare (step 5) and
   Render issues the TLS cert automatically.

---

## 4 — Frontend (Vercel)

1. <https://vercel.com> → sign up with GitHub → **Add New → Project** → import
   `neuraltaletechnologies/Changia`.
2. Configure:
   - **Root Directory:** `Frontend`
   - **Framework Preset:** Next.js (auto)
   - **Build Command / Install Command:** leave default (Vercel detects the pnpm
     workspace). If install fails, set Install Command to
     `pnpm install --filter changia...`.
3. **Environment Variables** (Production) — set **before the first build**, the value
   is baked into the page CSP:

   | Var | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://api.changia.neuraltale.com/api/v1` |

4. **Deploy.** You get `https://changia-xxxx.vercel.app` — verify it loads.
5. **Settings → Domains → Add** `changia.neuraltale.com`. Vercel shows a CNAME
   target (`cname.vercel-dns.com`). Add it in Cloudflare (step 5).
6. After DNS resolves, **redeploy** once so the production build picks up the final
   domain.

---

## 5 — DNS (Cloudflare, on `neuraltale.com`)

Cloudflare Dashboard → `neuraltale.com` → **DNS → Records → Add record**:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `changia` | `cname.vercel-dns.com` (value Vercel gave you) | **DNS only** (grey cloud) |
| CNAME | `api.changia` | `changia-api.onrender.com` (value Render gave you) | **DNS only** (grey cloud) |

Use **DNS only** (grey cloud) so Vercel and Render terminate TLS themselves — avoids
redirect loops. You can switch to proxied (orange) later with SSL mode **Full (strict)**.

TLS certs are issued by Vercel / Render within a few minutes of the CNAME resolving.

---

## 6 — Push the deploy config

Already pushed to the `Ntale` branch. Point Render and Vercel at `Ntale` during
setup. Future pushes to `Ntale` auto-deploy both.

---

## 7 — Smoke test

1. `GET https://api.changia.neuraltale.com/api/v1/health` → ok.
2. Open `https://changia.neuraltale.com` → marketing site loads.
3. Log in (navbar → Sign in) with an admin account from `database.sql`.
4. Dashboard loads, campaign list populates (confirms the browser → API → MySQL path
   and CORS).
5. Log in as a CAMPAIGN_MANAGER, create a campaign with a cover photo, submit it.
   Open its public page → the cover renders (it's served from R2 via
   `api.changia.neuraltale.com/uploads/campaigns/...`). Trigger a backend redeploy
   on Render, reload → **the photo is still there** (that's the R2 win).
   If an image is blocked, check the browser console for a CSP `img-src` violation
   → `NEXT_PUBLIC_API_URL` was wrong at build time; fix it and redeploy Vercel.

---

## What changed in the code for this

- `Backend/db.js` / `Backend/config.js` — `DB_SSL` / `DB_SSL_CA` so `mysql2`
  connects to a TLS-only managed MySQL. Local dev unchanged (`DB_SSL` unset).
- `Backend/utils/objectStore.js` (new) — Cloudflare R2 client (`aws4fetch`).
- `Backend/middlewares/upload.js` — a multer storage engine that streams uploads
  to R2 when `R2_*` is set; `deleteUploadedFiles` routes deletes to the right store.
- `Backend/app.js` — `/uploads/...` streams from R2 when configured, else disk.
- `render.yaml` — Render Blueprint for the backend.
- `Backend/.env.example` — documents the new vars.

With no `R2_*` / `DB_SSL` vars set, everything behaves exactly as before (local
disk + local MySQL) — the local dev workflow is untouched.
