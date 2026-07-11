# Deployment Guide

Deploy NexusIQ-AI to Vercel with **Supabase** (PostgreSQL + Storage) for hackathon judging and cloud demos.

## Architecture (Vercel + Supabase)

```text
Judges → Vercel (Next.js) → Supabase Postgres (auth, orgs, projects, documents metadata)
                         → Supabase Storage (document uploads, avatars when configured)
                         → Placeholder UI (intelligence, chat, reports slices)
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

Copy users, orgs, workspaces, projects, invites, etc. from local dev into Supabase so Vercel has the same test data:

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
3. **Onboarding** — 3 steps: org → workspace → optional project (skip allowed at each step)
4. **Dashboard** (`/dashboard`) — stats, risk overview, activity feed, quick actions
5. **Projects** (`/dashboard/projects`) — create project, grid/list, filters, project shell tabs
6. **Workspaces** — org → Workspaces; create workspace; **View projects** filters by workspace
7. **Organizations** — Settings → invite a second email (optional); tap **ⓘ** for role permissions
8. **Sidebar** — Intelligence, Chat, Reports tabs are placeholders inside a project shell
9. **Data Room** — upload, folders, preview (see Path B below)
10. **Pitch** — data room + multi-tenant UX live; Ollama runs locally by design ($0 API cost)

### Path B — Data room demo (recommended narrative)

Uses Supabase **Postgres + Storage** for upload, preview, and folder structure — no Ollama required on Vercel.

**Before judging (one-time prep):**

1. Complete Supabase setup above (DB + Storage buckets)
2. Run migrations (includes `folders`, `documents`, audit/shares tables)
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and bucket env vars on Vercel
4. Warm the app: open Vercel URL and register once (avoids Supabase cold start delay)

**During judging (~5 minutes):**

| Step | Action | What judges see |
|------|--------|-----------------|
| 1 | Register / login | Live auth |
| 2 | Create org → workspace → **M&A project** | Multi-tenant flow |
| 3 | Open project → **Data Room** tab | Folder tree, file table, preview panel |
| 4 | **Upload** — drag `demo/data-room` folder or sample PDFs | Per-file progress; files in Supabase Storage when configured |
| 5 | Select file → **preview**; try classification filter | PDF/text/Office inline preview |
| 6 | **Share** (admin) → copy link → incognito | Read-only external data room |
| 7 | **Organizations** → members | RBAC, invites, roles |

**Script for judges:**

> “NexusIQ ingests a data room, runs five specialized agents in parallel with citations, and produces an explainable consensus report. This deployment uses Supabase for database and document storage, and Vercel for the app. The live demo shows authentication, organizations, workspaces, projects, and a full data room — upload, folders, preview, and share links. AI inference runs on Ollama locally by design—zero API cost and data stays private. Intelligence agents and document processing are the next slices.”

### Path C — Two-browser invite demo (optional)

1. Browser A: owner registers, creates org, invites `judge2@example.com`
2. Browser B (incognito): register as `judge2@example.com` → onboarding shows **pending invitation** → accept → join org
3. Browser A: refresh members list — invitee appears

---

## Wiring Storage in code

Slice 05 uses `src/lib/storage/`:

1. **Local:** `STORAGE_PATH` (default `./storage`) via filesystem adapter
2. **Production:** When `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, uploads go to Supabase Storage bucket `SUPABASE_STORAGE_BUCKET_DOCUMENTS` (default `documents`)
3. Object keys: `organizations/{orgId}/projects/{projectId}/documents/{documentId}/v{n}/{fileName}`
4. Downloads/previews use signed URLs on Supabase, or stream from disk locally

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
| Avatars disappear on Vercel | Set Supabase Storage bucket + `SUPABASE_SERVICE_ROLE_KEY`; avatars use same storage adapter |
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

- Landing, auth, 3-step onboarding, dashboard
- Organizations (CRUD, members, invites, teams, notifications)
- Workspaces (CRUD, soft delete, restore, workspace cards with project counts)
- Projects (CRUD, types, tags, deal status, pin/duplicate/bulk delete, 13-tab project shell)
- **Data room** (folders, upload, preview, versions, tags, trash, share links, audit export)
- Placeholder tabs: Intelligence, Chat, Reports, Timeline, Graph, etc.

## Deferred

- Ollama document processing pipeline (Slice 06 — PENDING → READY worker)
- Ollama agent execution on cloud
- Full-text search across document content (Slice 07)
