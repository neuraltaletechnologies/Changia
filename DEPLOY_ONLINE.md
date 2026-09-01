# Putting Changia online (free) — `changia.neuraltale.com`

A live, shareable deployment on an all-free stack.

| Piece | Host | Public URL |
| --- | --- | --- |
| `Frontend/` (Next.js) | **Vercel** (Hobby, free) | `https://changia.neuraltale.com` |
| `Backend/` (Express API) | **Render** (free web service) | `https://api.changia.neuraltale.com` |
| MySQL 8 | **Aiven for MySQL** (free plan) — or TiDB Cloud Serverless | private connection string |

### Known free-tier trade-offs (accepted for the demo)
- **Render free sleeps after ~15 min idle** → the first request after a pause takes
  ~50 s to wake. Open `https://api.changia.neuraltale.com/api/v1/health` a minute
  before presenting to warm it.
- **Render free has no persistent disk** → photos uploaded through the dashboard
  (`Backend/uploads/`) are wiped on every backend redeploy. Re-upload after a deploy,
  or move uploads to Cloudflare R2 / Cloudinary later (a code change).
- The `node-cron` reminder scheduler only runs while the backend is awake.

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

## 2 — Backend (Render)

The repo already carries [`render.yaml`](render.yaml) (a Blueprint).

1. Push this branch to GitHub (see §5) so Render can see it.
2. <https://render.com> → sign up with GitHub → **New → Blueprint** → pick
   `neuraltaletechnologies/Changia` → select this branch → **Apply**.
   Render reads `render.yaml`, creates the `changia-api` web service, and generates
   `JWT_SECRET` automatically.
3. When prompted (or in **Environment** after), fill the DB values from step 1:

   | Var | Value |
   | --- | --- |
   | `DB_HOST` | Aiven host |
   | `DB_PORT` | Aiven port |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | Aiven password |
   | `DB_NAME` | `changia` |

   `DB_SSL=true`, `NODE_ENV=production`, `CORS_ORIGINS`, `APP_BASE_URL`,
   `API_PUBLIC_URL` are already set by the blueprint.
4. First deploy → check the logs for `✅ Connected to MySQL database`, then hit
   `https://changia-api.onrender.com/api/v1/health` → `{"success":true,...}`.
5. **Settings → Custom Domains → Add** `api.changia.neuraltale.com`. Render shows a
   CNAME target (`changia-api.onrender.com`). Add it in Cloudflare (step 4) and
   Render issues the TLS cert automatically.

---

## 3 — Frontend (Vercel)

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
   target (`cname.vercel-dns.com`). Add it in Cloudflare (step 4).
6. After DNS resolves, **redeploy** once so the production build picks up the final
   domain.

---

## 4 — DNS (Cloudflare, on `neuraltale.com`)

Cloudflare Dashboard → `neuraltale.com` → **DNS → Records → Add record**:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `changia` | `cname.vercel-dns.com` (value Vercel gave you) | **DNS only** (grey cloud) |
| CNAME | `api.changia` | `changia-api.onrender.com` (value Render gave you) | **DNS only** (grey cloud) |

Use **DNS only** (grey cloud) so Vercel and Render terminate TLS themselves — avoids
redirect loops. You can switch to proxied (orange) later with SSL mode **Full (strict)**.

TLS certs are issued by Vercel / Render within a few minutes of the CNAME resolving.

---

## 5 — Push the deploy config

```bash
git push origin Ntale
```

Point Render and Vercel at the `Ntale` branch during setup, **or** merge to `main`
first and deploy from there (then set both platforms to auto-deploy `main`).

---

## 6 — Smoke test

1. `GET https://api.changia.neuraltale.com/api/v1/health` → ok.
2. Open `https://changia.neuraltale.com` → marketing site loads.
3. Log in (navbar → Sign in) with an admin account from `database.sql`.
4. Dashboard loads, campaign list populates (confirms the browser → API → MySQL path
   and CORS).
5. Open a public campaign page → cover image renders (loads from
   `api.changia.neuraltale.com/uploads/...`; if blocked, check the browser console
   for a CSP `img-src` violation → `NEXT_PUBLIC_API_URL` was wrong at build time,
   fix it and redeploy).

---

## What changed in the code for this

- `Backend/db.js` / `Backend/config.js` — added `DB_SSL` / `DB_SSL_CA` so `mysql2`
  can connect to a TLS-only managed MySQL. Local dev is unchanged (`DB_SSL` unset).
- `render.yaml` — Render Blueprint for the backend.
- `Backend/.env.example` — documents the new vars.
