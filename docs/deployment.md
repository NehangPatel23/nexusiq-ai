# Deployment Guide

Deploy NexusIQ-AI to Vercel with **Supabase** (PostgreSQL + Storage) for hackathon judging and cloud demos.

## Architecture (Vercel + Supabase)

```text
Judges → Vercel (Next.js) → Supabase Postgres (auth, orgs, metadata)
                         → Supabase Storage (sample files, avatars — when wired)
                         → Placeholder UI (intelligence, data room slices)
Ollama → local / external only (not on Vercel)
```

| Component | Provider | Hackathon demo |
|-----------|----------|----------------|
| Web app | Vercel | Required |
| Database | Supabase Postgres + pgvector | Required |
| File storage | Supabase Storage | Optional (sample files) |
| Auth | NextAuth (Credentials) | Keep as-is — **do not** use Supabase Auth |
| AI (Ollama) | Local / VPS | Simulated via placeholders + pitch |

Local development still uses Docker Compose (`docker compose up -d db`) and `./storage/`.

---

## One-time Supabase setup

### 1. Create project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to your Vercel deployment (e.g. US East if Vercel is `iad1`)
3. Save the database password

### 2. Enable pgvector

In **SQL Editor**, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Get connection strings

Supabase moved this out of Project Settings. Use either:

1. **Connect** button — top of your project page (green button, next to the project name) → opens the connection panel
2. **Database → Configuration** — left sidebar → Database → Configuration

In the Connect panel, pick **Primary database** (not Read replica) or the URI fields may be blank.

| Use case | Select in Connect panel | Notes |
|----------|-------------------------|-------|
| `pnpm db:migrate` (local CLI) | **Session pooler** | Port **5432** on `pooler.supabase.com` — use when Direct fails (IPv6) |
| `pnpm db:migrate` (if Direct works) | **Direct connection** | `db.[ref].supabase.co:5432` — only if your network supports IPv6 |
| Vercel `DATABASE_URL` | **Transaction pooler** | Port **6543** — add `?pgbouncer=true`; **do not** use for migrations |

Click **Reveal** / copy the URI, then replace `[YOUR-PASSWORD]` with the database password from project creation.

Example shapes (yours will differ):

```bash
# Migrations — Session pooler (use this if Direct gives P1001 "Can't reach database")
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

# Migrations — Direct (only if IPv6 works on your network)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# Vercel — Transaction pooler (serverless only — migrations will hang on this)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Optional: add `&connection_limit=1` on Vercel if you hit connection limits.

**Can't see a connection string?** In the Connect modal, change the source dropdown from **Read replica** to **Primary database**.

**Direct connection failed with P1001?** Supabase Direct is IPv6-only on free tier. Use **Session pooler** for migrations instead.

### 4. Run migrations

From your machine (use **Session pooler** if Direct fails with P1001):

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

Verify tables exist in **Supabase → Table Editor** (`users`, `organizations`, etc.).

### 4b. Sync local Docker data to Supabase (optional)

Copy users, orgs, invites, etc. from local dev into Supabase so Vercel has the same test data:

1. Add to `.env` (Session pooler, port **5432** — not the Vercel 6543 URL):

```bash
SUPABASE_DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
```

2. Preview counts without writing:

```bash
pnpm db:sync-to-supabase -- --dry-run
```

3. Run sync (truncates app tables on Supabase, then copies from Docker):

```bash
pnpm db:sync-to-supabase
```

Log in on Vercel with the same email/password as local. Does **not** sync automatically on every change — re-run when needed.

Test users (`*@test.com`, integration `org-*@example.com`) are **excluded** by default. E2e runs also auto-purge them from local Docker after each `pnpm test:e2e`.

**Clean up Supabase junk now:**

```bash
pnpm db:purge-test-users -- --remote
```

### 5. Create Storage buckets (sample data room)

**Storage → New bucket**

| Bucket | Public? | Purpose |
|--------|---------|---------|
| `avatars` | Yes | Profile images (when upload code is wired to Supabase) |
| `documents` | No | Sample diligence files for judge demo |

**Storage → Policies** — for hackathon sample files in `documents`, you can use a simple policy:

- Authenticated users can read objects in `documents` (tighten before production)

Or upload 2–3 sample PDFs via the Supabase dashboard and use **signed URLs** from server routes later.

**Suggested sample files to upload manually** (for demo narrative):

- `documents/sample/financial-summary.pdf`
- `documents/sample/vendor-contract.pdf`
- `documents/sample/compliance-checklist.pdf`

### 6. API keys for Storage

**Project Settings** (gear icon, bottom of left sidebar) → **API** (under Configuration)

Or open: `https://supabase.com/dashboard/project/<your-project-ref>/settings/api`

| Key | Env var | Where |
|-----|---------|-------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (signed URLs, public buckets) |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` | **Vercel server only** — never expose to browser |

---

## Vercel environment variables

**Project → Settings → Environment Variables** (Production + Preview):

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Transaction pooler — see exact format below |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://nexusiq-ai-steel.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | For Storage | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Storage | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | For Storage (server) | `eyJ...` |
| `SUPABASE_STORAGE_BUCKET_DOCUMENTS` | Optional | `documents` |
| `SUPABASE_STORAGE_BUCKET_AVATARS` | Optional | `avatars` |

Redeploy after saving env vars.

**Exact `DATABASE_URL` for Vercel** (Transaction pooler from Connect panel):

```text
postgresql://postgres.[ref]:[password]@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

- Port must be **6543** (not 5432)
- Include both `pgbouncer=true` and `connection_limit=1`
- Scope: **Production** (and Preview if you test preview deploys)
- After saving → **Deployments → Redeploy** (env changes do not apply to running deploys)

**Verify after redeploy:** open `https://your-app.vercel.app/api/health`

```json
{ "ok": true, "checks": { "databaseUrl": true, "authSecret": true, "appUrl": true }, "db": "connected" }
```

If `databaseUrl: false` → `DATABASE_URL` missing on Vercel. If `db: "error"` → wrong password, wrong port, or pooler URL typo.

---

## Local vs production

| Variable | Local dev | Vercel (hackathon) |
|----------|-----------|---------------------|
| `DATABASE_URL` | `localhost:5433` (Docker) | Supabase pooler URL |
| `AUTH_SECRET` | Dev secret | Strong random secret |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Your Vercel URL |
| `STORAGE_PATH` | `./storage` | Not used on Vercel (ephemeral) |
| `NEXT_PUBLIC_SUPABASE_*` | Optional | Set when using Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server uploads / signed URLs |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Unused until AI slices |

---

## Judge demo walkthrough (live on Vercel)

**URL:** [https://nexusiq-ai-steel.vercel.app](https://nexusiq-ai-steel.vercel.app)

### Path A — Minimum (works after DB + env only)

No Storage required. ~3 minutes.

1. **Landing** (`/`) — product vision, agent showcase
2. **Register** (`/register`) — create judge account
3. **Onboarding** — create org e.g. “Acme Due Diligence” (or skip)
4. **Dashboard** (`/dashboard`) — workspace shell, quick actions
5. **Organizations** — open org → **Settings** → invite a second email (optional)
6. **Sidebar** — **Agents**, **Projects**, **Chat** — placeholder pages (“Coming in slice N”)
7. **Pitch** — “Full pipeline uses local Ollama; cloud demo shows multi-tenant UX”

### Path B — Sample data room simulation (recommended narrative)

Uses Supabase **Postgres + Storage** for a believable story without running Ollama on Vercel.

**Before judging (one-time prep):**

1. Complete Supabase setup above (DB + Storage buckets)
2. Upload 2–3 sample PDFs to `documents` bucket (see paths above)
3. Warm the app: open Vercel URL and register once (avoids Supabase cold start delay)

**During judging (~5 minutes):**

| Step | Action | What judges see |
|------|--------|-----------------|
| 1 | Register / login | Live auth |
| 2 | Create org “Target Co DD” | Multi-tenant org |
| 3 | Dashboard → **Projects** placeholder | “Slice 04 — Projects” + planned capabilities |
| 4 | **Agents** placeholder | Five-agent story (Financial, Legal, Compliance, Risk, Fraud) |
| 5 | Describe data room | “Sample files live in Supabase Storage; full upload UI in slice 05” |
| 6 | Show Supabase dashboard (optional) | Storage bucket with sample PDFs — proves backend |
| 7 | **Organizations** → members | RBAC, invites, roles |

**Script for judges:**

> “NexusIQ ingests a data room, runs five specialized agents in parallel with citations, and produces an explainable consensus report. This deployment uses Supabase for database and document storage, and Vercel for the app. AI inference runs on Ollama locally by design—zero API cost and data stays private. The live demo shows authentication, organizations, and the product shell; sample diligence files are in Supabase Storage; agent and data-room UIs are on the roadmap shown in placeholder pages.”

### Path C — Two-browser invite demo (optional)

1. Browser A: owner registers, creates org, invites `judge2@example.com`
2. Browser B (incognito): register as `judge2@example.com` → onboarding shows **pending invitation** → accept → join org
3. Browser A: refresh members list — invitee appears

---

## Wiring Storage in code (post-hackathon)

Storage env vars are defined now; app code still uses `STORAGE_PATH` locally. To connect Supabase Storage:

1. Add `@supabase/supabase-js` (when implementing slice 05)
2. Server routes: upload with `SUPABASE_SERVICE_ROLE_KEY`
3. Store object path in Postgres (`documents.filePath` → `documents/sample/foo.pdf`)
4. Serve via signed URL or public bucket for avatars

Until then, judges can see files in the **Supabase Storage dashboard** during Path B.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Register/login 500 | Run `/api/health` — fix `DATABASE_URL` (6543 + `pgbouncer=true&connection_limit=1`), set `AUTH_SECRET`, redeploy |
| `prepared statement` errors with Prisma | Use pooler URL + `?pgbouncer=true` |
| Slow first request (~10s) | Supabase free tier scales to zero; warm app before judging |
| pgvector migration fails | Run `CREATE EXTENSION vector;` in SQL Editor |
| Direct connection P1001 | Your network is IPv4-only — use **Session pooler** (port 5432) for migrations |
| `pnpm db:migrate` hangs | You used **Transaction pooler** (6543) — switch to **Session pooler** (5432) |
| Connection string blank in UI | Connect panel → set source to **Primary database** |
| Invite links → localhost | Set `NEXT_PUBLIC_APP_URL` to Vercel URL |
| Avatars disappear on Vercel | Expected until Storage upload code is wired |
| Storage 403 | Check bucket policies and `SUPABASE_SERVICE_ROLE_KEY` on server only |

---

## Alternative: Neon (database only)

If you only need Postgres without Storage:

1. [neon.tech](https://neon.tech) → create project → enable pgvector
2. Set `DATABASE_URL` on Vercel
3. Skip all `SUPABASE_*` env vars

Neon does **not** include file storage—you would need a separate service for documents.

---

## What works on Vercel today

- Landing, auth, onboarding, dashboard
- Organizations (CRUD, members, invites, teams, notifications)
- Placeholder pages (Projects, Agents, Chat, Reports, etc.)

## Deferred

- Supabase Storage integration in upload/avatar code
- Ollama agent execution on cloud
- Full data room UI (slice 05+)
