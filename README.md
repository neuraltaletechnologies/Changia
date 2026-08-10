# Changia
Digital Fundraising & Mobile Money Contribution Platform

Tanzania-first, mobile-money-first platform for simple, transparent, auditable fundraising.

## Repository layout

```
├── backend/     # Node.js + Express + MySQL API (plain JavaScript, MVC)
│   └── README.md  ← full setup instructions & API reference
└── Frontend/    # Next.js marketing site + org dashboard
    └── README.md  ← frontend setup instructions
```

## Quick start

**1. Create the database** — import `backend/database.sql` into your MySQL
(phpMyAdmin → Import, or `mysql -u root -p < database.sql`). It creates the
`changia` database, all tables, and demo data.

**2. Backend API** (see `backend/README.md`)

```bash
cd backend
npm install
npm run dev                  # http://localhost:5000
```

**3. Frontend** (see `Frontend/README.md`)

```bash
cd Frontend
npm install
npm run dev                  # http://localhost:3000
```

Visit `http://localhost:3000/login` and sign in with `admin@msuya.or.tz` / `Changia@2026`,
or create a new organization at `http://localhost:3000/register`.
