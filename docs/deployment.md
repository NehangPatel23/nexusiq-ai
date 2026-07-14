# Deployment Guide

Deploy NexusIQ-AI to Vercel with **Supabase** (PostgreSQL + Storage) for hackathon judging and cloud demos.

## Architecture (B+C: Vercel + Supabase + VPS Worker)

Production document processing uses **three roles** — never run the pipeline inline on Vercel.

```text
Users → Vercel (Next.js UI + API)
          → Supabase Postgres (metadata, chunks, vectors, FTS)
          → Supabase Storage (uploaded files)
          → Public Ollama HTTPS (chat/agents on Vercel — slices 08+)

Worker VPS (or Mac during dev) → polls PENDING documents
          → downloads from Supabase Storage
          → Ollama on localhost:11434 (embed + classify + NER)
          → writes chunks → READY / FAILED
```

| Environment | `OLLAMA_BASE_URL` | Processing |
|-------------|-------------------|------------|
| Local dev (Mac) | `http://localhost:11434` | `ENABLE_INLINE_PROCESSING=true` (fire-and-forget after upload) **or** `pnpm worker:process` |
| Vercel prod | `https://ollama.yourdomain.com` + `OLLAMA_API_KEY` | Upload → `PENDING` only; worker on VPS processes |
| Worker VPS | `http://127.0.0.1:11434` | `pnpm worker:process` polls queue |

| Component | Provider | Role |
|-----------|----------|------|
| Web app | Vercel | UI, auth, uploads, API routes — **never** inline processing |
| Database | Supabase Postgres + pgvector + FTS | Document queue, chunks, entities |
| File storage | Supabase Storage | Document bytes |
| AI (Ollama) | Local / VPS / public HTTPS | Embeddings, classification, NER |
| Document worker | VPS or Mac (`scripts/processing-worker.ts`) | Poll `PENDING` → `PROCESSING` → pipeline |

**Health check:** `GET /api/health` reports `ollama: connected | unreachable | not_configured` (non-fatal — DB is primary).

**Smart search (slice 07):** Keyword mode works without Ollama (Postgres FTS). Semantic and hybrid modes require `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel) to embed the query; if Ollama is down, hybrid auto-falls back to keyword with a warning.

**Interactive chat (slice 08):** Unlike keyword search, chat generation always requires reachable Ollama. Vercel must use the public HTTPS Ollama endpoint and server-only `OLLAMA_API_KEY`; localhost development uses `http://localhost:11434`. An outage returns `503 OLLAMA_UNAVAILABLE`, while questions with no retrieved evidence return a persisted `INSUFFICIENT` answer without calling Ollama.

**Intelligence agents (slice 09):** Agent runs use the same Ollama endpoint as chat (`ollama.chat` with JSON output, not streaming). Vercel prod requires public HTTPS Ollama; localhost uses `http://localhost:11434`. Zero retrieved chunks complete with `INSUFFICIENT` confidence without calling Ollama; unreachable Ollama returns `503 OLLAMA_UNAVAILABLE`.

**Executive + consensus (slice 10):** Executive and consensus also run on Vercel/Next.js against the same Ollama endpoint. Executive uses Markdown chat (not JSON); consensus uses a single `format: "json"` call. Fewer than 3 completed specialist runs returns `400 CONSENSUS_PREREQUISITE` without calling Ollama. Full analysis is browser-orchestrated (5 specialists → consensus → executive) via a module-level runner that survives in-app navigation; not one long serverless request. Each agent/consensus `route.ts` exports `maxDuration = 300` (Vercel Hobby still caps at 60s — use Pro for reliable long Ollama runs, or set `OLLAMA_CHAT_TIMEOUT_MS=50000` on Hobby so timed-out runs fail cleanly). The runner always continues to consensus/executive once ≥3 specialists succeed, retries failed steps once, and passes specialist run IDs into consensus. Closing the browser tab still stops the chain until a server-side job worker exists.

**Reports & export (slice 11):** Report assembly and binary export (PDF / Markdown / XLSX / PPTX) run on Vercel/Next.js and **do not require Ollama** when intelligence already exists (latest AgentRuns + ConsensusRun + Findings). Narrative force-regenerate (`forceRegenerate`) and generating EXECUTIVE/BOARD/INVESTMENT_MEMO without an Executive AgentRun need `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel). Unreachable Ollama in those cases returns `503 OLLAMA_UNAVAILABLE`. Exports are CPU-heavy — generate/export routes use `maxDuration = 120` and persist binaries via `getStorage()` (local `STORAGE_PATH` or Supabase Storage), not ephemeral `/tmp` alone.

**Timeline + Graph (slice 12):** Viewing the timeline (`GET .../timeline`) and relationship graph (`GET .../graph`) runs on Vercel/Next.js and **does not require Ollama** — graph nodes/edges come from existing Slice 06 NER `Entity` / `EntityRelation` rows. AI extract (`POST .../timeline/extract`, `POST .../graph/extract`) needs `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel); unreachable Ollama returns `503 OLLAMA_UNAVAILABLE`. Zero retrieved chunks returns `200` with an empty result and message without calling Ollama. Extract routes use `maxDuration = 120`.

**Contradiction + Missing Info + Risks (slice 13):** Risks overview and missing-info checklist scan run on Vercel/Next.js **without Ollama** (Postgres findings / classifications / project-type checklists). Missing-info may optionally polish follow-up text via Ollama when configured; if Ollama is down, template `followUpText` is kept. Contradiction scan (`POST .../contradictions/scan`) **requires** `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel), rejects unmatched citations, emits CRITICAL notifications, and returns `503 OLLAMA_UNAVAILABLE` when unreachable; fewer than two READY documents returns `200` with `created: 0` without calling Ollama. Scan route uses `maxDuration = 120`. Status PATCH, bulk update, promote-to-finding, list/export endpoints never call Ollama. Risks summary includes `contradictionOpenCount` and `missingOpenCount`.

**Risk Simulator + Action Plan (slice 14):** Action Plan (Task CRUD / kanban / from-findings / suggest from executive `priorityActions`) runs on Vercel/Next.js **without Ollama**. Risk simulations (`POST .../simulations`) need `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel): load latest COMPLETED FINANCIAL + RISK AgentRuns as baseline, retrieve scenario-biased context, single `ollama.chat({ format: "json" })`, persist `SimulationRun` deltas only (never overwrite AgentRuns). Missing FINANCIAL/RISK baselines → `400 SIMULATION_PREREQUISITE` without calling Ollama; unreachable Ollama → `503 OLLAMA_UNAVAILABLE`. Simulate route uses `maxDuration = 120`. GET simulation list/detail never call Ollama. Deferred: public HTTPS Ollama for Vercel simulations if not already configured; OCI worker unchanged.

**History + Settings (slice 15):** Org audit log, project comparison, profile/security/notifications/appearance/shortcuts are **offline** (Postgres only — no Ollama). Appearance supports **dark and light** (`User.theme`; `:root` = light tokens, `.dark` = dark). AI Models settings configure chat/embed model + base URL via `SystemSetting`, with **env vars always winning when set** (production-safe on Vercel). `OLLAMA_API_KEY` stays server-only (never rendered; prefer Vercel env as source of truth). “Test connection” calls `healthCheck()` and returns connected/unreachable + **host only**. Localhost may use `http://localhost:11434` with no API key; Vercel uses HTTPS Ollama + API key. Deferred deletion: users/orgs are tombstoned for 24h (`deletedAt` + `purgeAfter`), recoverable until purge. Cron: `GET /api/cron/purge-deleted` (Bearer `CRON_SECRET`) **daily** at 04:00 UTC via `vercel.json` (Hobby-compatible; one cron/day), or `pnpm db:purge-deleted` locally.

**Admin (slice 16):** Owner-only `/dashboard/admin` + `/api/admin/*`. Health extends public `/api/health` with org-scoped storage sums, disk (`STORAGE_PATH` / `statfs` on localhost; “Serverless ephemeral — N/A” on Vercel), and **Postgres queue counts** (PENDING/PROCESSING/FAILED/READY) — not live OCI SSH. Ollama card reuses Slice 15 `getEffectiveOllamaConfig()` + `healthCheck()`; returns host + `apiKeyConfigured` + config sources (**never** `OLLAMA_API_KEY`). Reindex modes: `fts` rebuilds `search_vector` offline; `embeddings` / `all` require reachable Ollama (503 if down), batch inline with `maxDuration = 300`; on Vercel with large corpora, docs may be set PENDING for the worker instead of inline embed. Live OCI worker health remains deferred ([tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md)).

**Worker env (VPS):**

```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"  # Session pooler, NOT :6543
OLLAMA_BASE_URL="http://127.0.0.1:11434"
ENABLE_INLINE_PROCESSING="false"
WORKER_POLL_INTERVAL_MS="5000"
WORKER_CONCURRENCY="1"
SUPABASE_SERVICE_ROLE_KEY="..."  # if using Supabase Storage
```

Run worker: `pnpm worker:process`

Local development still uses Docker Compose (`docker compose up -d db`) and `./storage/` when Supabase is not configured.

---

## OCI Worker VPS (deferred)

**Status:** Blocked on Oracle Cloud instance provisioning. Track checklist in [tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md).

Until OCI is live, use **localhost**: `ENABLE_INLINE_PROCESSING=true` or `pnpm worker:process` with local Ollama. Vercel uploads stay `PENDING` without a worker.

**Mac interim setup (before OCI):** Full runbook for the Mac worker bridge + Cloudflare tunnel so Vercel can reach Ollama — [mac-bridge-tunnel.md](./mac-bridge-tunnel.md).

### Recommended shape (Always Free)

| Resource | Suggestion |
|----------|------------|
| Shape | `VM.Standard.A1.Flex` (Ampere) |
| OCPU / RAM | 4 OCPU, 24 GB (adjust down if quota tight) |
| OS | Ubuntu 22.04 or 24.04 |
| Region | Retry if “Out of host capacity” |

### Bootstrap (summary)

```bash
# On the OCI VM after SSH
sudo apt update && sudo apt install -y curl git tesseract-ocr libreoffice
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3 && ollama pull nomic-embed-text

# Node 20 + pnpm (fnm/nvm or nodesource — pick one)
git clone <repo> && cd nexusiq-ai && pnpm install
# Copy .env — see tasks/00-oci-worker-vps.md § 4
pnpm worker:process   # verify once, then systemd
```

### systemd example

```ini
# /etc/systemd/system/nexusiq-worker.service
[Unit]
Description=NexusIQ document processing worker
After=network-online.target ollama.service
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/nexusiq-ai
EnvironmentFile=/home/ubuntu/nexusiq-ai/.env
ExecStart=/usr/bin/pnpm worker:process
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable: `sudo systemctl enable --now nexusiq-worker`

### Public Ollama for Vercel (slices 08+)

The worker uses Ollama on `127.0.0.1`. **Chat and agents on Vercel** need a separate **HTTPS** endpoint:

- Reverse proxy (Caddy/nginx) + TLS certificate
- `OLLAMA_API_KEY` on proxy and Vercel
- Vercel: `OLLAMA_BASE_URL=https://ollama.yourdomain.com`

Details: [tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md) § 6.

---

## Architecture (Vercel + Supabase) — legacy summary

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

**Contradictions only** (does not wipe users/projects; upserts missing referenced documents + chunks for excerpts; requires the same `project_id` already on Supabase — run `pnpm db:sync-to-supabase` first if needed):

```bash
pnpm db:sync-contradictions -- --dry-run
pnpm db:sync-contradictions
pnpm db:sync-contradictions -- --project-id=<uuid>
```

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
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Public HTTPS Ollama endpoint (required for chat) |

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
8. **Sidebar** — open a project for Data Room, Intelligence, Chat, Search, Reports, Timeline, Graph, Risks, Contradictions, Missing, Simulator, Actions, History; open **Settings** from global nav
9. **Data Room** — upload, folders, preview (see Path B below)
10. **Pitch** — multi-tenant diligence platform with cited agents, audit history, deferred deletion, and local report export; Ollama local by design ($0 API cost)

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
| 7 | **Intelligence** → run specialist or full analysis (Ollama) | Scores, findings, consensus |
| 8 | **Timeline** → **Graph** → **Contradictions** → **Missing** → **Risks** → **Simulator** / **Actions** | Advanced diligence views; Simulator needs Ollama + baselines |
| 9 | **History** → filter audit events; **Compare projects** | Org/project activity with source labels |
| 10 | **Reports** → Risk Register / Board pack → PDF or ZIP | Local export; share link optional |
| 11 | **Settings** → Security / AI Models (optional) | Account delete tombstone; Ollama test connection |
| 12 | **Organizations** → members | RBAC, invites, roles |

**Script for judges:**

> “NexusIQ ingests a data room, runs five specialized agents in parallel with citations, flags contradictions and missing evidence, models what-if risk scenarios, tracks diligence action items, synthesizes an explainable consensus, keeps a full audit history with settings and deferred deletion, and exports board-ready PDF/Excel/PPTX packages. This deployment uses Supabase for database and document storage, and Vercel for the app. AI inference runs on Ollama by design—zero API cost and data stays private.”

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
- Projects (CRUD, types, tags, deal status, pin/duplicate/bulk delete, project shell tabs)
- **Data room** (folders, upload, preview, versions, tags, trash, share links, audit export, deep links)
- **Smart search** (keyword plus Ollama-backed hybrid/semantic modes)
- **Interactive chat** (project-scoped streaming, citations, confidence, and history; requires public Ollama)
- **Intelligence agents** (specialist scans + executive package + explainable consensus; requires public Ollama on Vercel)
- **Reports & export** (assemble from intelligence; PDF/MD/XLSX/PPTX/ZIP; share links + compare; narrative regenerate needs public Ollama)
- **Timeline + Graph** (view without Ollama; AI extract needs public Ollama)
- **Contradictions + Missing + Risks** (risks/missing without Ollama; contradiction scan needs public Ollama)
- **Risk Simulator + Action Plan** (Action Plan offline; simulations need public Ollama on Vercel)
- **History + Settings** (org/project audit + compare; settings shell; deferred deletion + purge cron; AI Models settings offline except test connection)
- **Admin** (owner-only health / usage / queue / members / FTS+embed maintenance; queue ≠ OCI until worker provisioned)

## Deferred

- **OCI worker VPS** — document processing on Vercel (Slice 06 prod path). Checklist: [tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md)
- **Public Ollama HTTPS** — chat/agents/contradiction scan/simulations/narrative regenerate on Vercel if not already configured (slices 08+)
- Contradiction scan on OCI worker for very large multi-batch rooms ([tasks/17-polish.md](../tasks/17-polish.md))
