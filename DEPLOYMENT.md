# Deploying Changia to shared hosting

Target setup: **two Node apps on separate subdomains, one MySQL database.**

| Piece | Runs | Example host |
| --- | --- | --- |
| `Backend/` (`changia-api`) | `node server.js` (Express) | `https://api.changia.co.tz` |
| `Frontend/` (`changia`) | `next start` (Next.js) | `https://changia.co.tz` |
| MySQL 8 | shared DB server | `localhost:3306` on the host |

Photos (campaign cover, supporting gallery, completion-proof) are stored on the
API host's **local disk** at `Backend/uploads/` and served from
`https://api.changia.co.tz/uploads/...`. The web app loads them cross-origin;
the CSP and CORP settings below make that work.

---

## 1. Database

```bash
mysql -u <db_user> -p <db_name> < Backend/database.sql
```

`database.sql` creates the schema **and** seeds demo data (orgs, users,
campaigns). For a clean production DB, import it then delete the demo rows, or
strip the seed `INSERT`s from a copy first. Change the demo passwords regardless.

## 2. Backend (`api.changia.co.tz`)

**Node:** >= 18.

**Install** (no build step — plain JS):

```bash
cd Backend
npm ci --omit=dev
```

**Environment** — copy `Backend/.env.example` to `.env` and set:

| Var | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | whatever the host assigns (or `5000`) |
| `CORS_ORIGINS` | `https://changia.co.tz` (comma-separated if more; **no `*`**) |
| `JWT_SECRET` | 48+ random bytes — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `APP_BASE_URL` | `https://changia.co.tz` (used in donor emails) |
| `API_PUBLIC_URL` | `https://api.changia.co.tz` — **must be exact**; every photo URL is built from it |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | from the host's MySQL panel |
| `MESSAGE_PROVIDER` | `simulated` until SMS/email/WhatsApp creds are filled in |

**Start:** point the host's "Setup Node.js App" (Passenger) / PM2 / systemd at
`server.js` with `npm start`.

**Health check:** `curl https://api.changia.co.tz/api/v1/health` → `{"success":true,...}`.

### Uploads directory — persistence

`Backend/uploads/` **must survive restarts and redeploys.**

- If the host keeps the app directory between deploys (most cPanel/Passenger
  setups): nothing to do — just make sure the process can write to it
  (`chmod u+rw`, it's created on first upload).
- If deploys re-clone / wipe the directory: move the folder outside the deploy
  path and symlink it back, e.g.

  ```bash
  mkdir -p ~/persistent/changia-uploads
  ln -s ~/persistent/changia-uploads Backend/uploads
  ```

Uploads are **not** in the database, so `mysqldump` does not back them up — see
§5.

### Request body size

Photos are up to 5 MB each (multer's limit, `Backend/middlewares/upload.js`).
The web server in front of Node usually caps request bodies lower:

- **Apache / Passenger:** `LimitRequestBody 12582912` (12 MB) for the vhost.
- **nginx:** `client_max_body_size 12m;`.

Without this, photo uploads fail with `413 Payload Too Large`. `express.json`'s
1 MB limit is irrelevant — uploads are `multipart/form-data`, handled by multer.

## 3. Frontend (`changia.co.tz`)

**Environment** — `Frontend/.env`:

```
NEXT_PUBLIC_API_URL=https://api.changia.co.tz/api/v1
```

(Include the `/api/v1` suffix.) `next.config.mjs` reads this at build time and
adds `https://api.changia.co.tz` to the CSP `connect-src` and `img-src`, so the
value must be set **before `npm run build`.**

**Build & start:**

```bash
cd Frontend
npm ci
npm run build
npm run start   # next start, on the host-assigned port
```

Security headers (CSP, HSTS, `X-Frame-Options`, …) are emitted by
`next.config.mjs` `headers()` in production — there is no `vercel.json`. If you
add an external font/script/image host later, widen the allowlist there.

## 4. DNS & TLS

- `changia.co.tz` → the frontend app; `api.changia.co.tz` → the backend app.
- Both subdomains need HTTPS certificates (cPanel AutoSSL / Let's Encrypt).
  `API_PUBLIC_URL` and `NEXT_PUBLIC_API_URL` must both be `https://` — the CSP
  sends `upgrade-insecure-requests` and mixed content is blocked.

## 5. Backups

- **Database:** cron `mysqldump -u <user> -p<pass> <db> | gzip > changia-$(date +\%F).sql.gz`.
- **Uploads:** cron `tar czf changia-uploads-$(date +\%F).tar.gz -C ~/persistent changia-uploads`
  (or wherever `Backend/uploads/` resolves to).

## 6. Post-deploy smoke test

1. `GET https://api.changia.co.tz/api/v1/health` → ok.
2. Log in to `https://changia.co.tz/login` with an admin account.
3. Create a campaign with a cover photo + 1–2 supporting photos → save.
4. Open the public page `https://changia.co.tz/campaigns/<slug>` in a fresh
   browser tab → the cover **and** the gallery photos render (they load from
   `api.changia.co.tz/uploads/...`). If they 404 or are blocked, check:
   - browser console for a CSP `img-src` violation → `NEXT_PUBLIC_API_URL` was
     wrong or unset at build time; rebuild.
   - the photo URL opens directly but not in `<img>` → `Cross-Origin-Resource-Policy`
     header missing on `/uploads` (should be `cross-origin`, set in `Backend/app.js`).
5. Complete the campaign, submit a completion report with a photo as the manager,
   approve it as an admin → the "Proof of impact" block appears on the public
   campaign page and under `/blog/campaign/<slug>`.
