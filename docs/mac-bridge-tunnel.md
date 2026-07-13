# Mac Bridge & Mac Tunnel — Vercel → Ollama Runbook

> **Purpose:** Keep NexusIQ-AI on Vercel working with local Ollama on your Mac until the OCI worker VPS is provisioned.
>
> **Use this when:** uploads stay `PENDING`, search/chat show "Ollama not configured", or `/api/health` reports `ollama: unreachable`.

See also: [deployment.md](./deployment.md) (Vercel + Supabase), [tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md) (production worker).

---

## 1. What you're building

Vercel runs in the cloud and **cannot** reach `http://localhost:11434` on your Mac. You need two separate bridges:

| Name | What it does | Required for |
|------|----------------|--------------|
| **Mac Bridge** | Mac worker polls Supabase, processes docs with local Ollama | Data room uploads → `READY`, keyword search, chat RAG context |
| **Mac Tunnel** | Public HTTPS URL → your Mac's Ollama | Hybrid/semantic search + **chat streaming** from the live Vercel URL |

```text
┌─────────────────────────────────────────────────────────────┐
│  VERCEL (always on)                                         │
│  • Uploads → Supabase Storage + doc row PENDING             │
│  • Search/Chat API → Ollama via tunnel HTTPS URL            │
└───────────────────────────┬─────────────────────────────────┘
                            │ Supabase Postgres + Storage
┌───────────────────────────▼─────────────────────────────────┐
│  YOUR MAC (you start when demoing / developing)             │
│  Terminal 1: Ollama          → localhost:11434              │
│  Terminal 2: Worker          → polls Supabase PENDING docs  │
│  Terminal 3: Cloudflare tunnel → public HTTPS → Ollama      │
└─────────────────────────────────────────────────────────────┘
```

**Important:** The worker uses `localhost:11434` directly. The tunnel is **only** for Vercel's server-side API routes.

---

## 2. Prerequisites (one-time)

### On your Mac

```bash
# Ollama
ollama pull llama3
ollama pull nomic-embed-text

# Cloudflare Tunnel CLI
brew install cloudflared
cloudflared --version

# Repo + deps
cd ~/Desktop/nexusiq-ai
pnpm install
```

### In `.env` (local, never commit)

You should already have:

```bash
# Local dev DB
DATABASE_URL="postgresql://nexusiq:nexusiq@localhost:5433/nexusiq?schema=public"

# Supabase session pooler (:5432) — for worker + migrations ONLY
SUPABASE_DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"

# Ollama (local)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_CHAT_MODEL="llama3"
OLLAMA_EMBED_MODEL="nomic-embed-text"

# Supabase Storage (worker downloads Vercel uploads)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_STORAGE_BUCKET_DOCUMENTS="documents"
```

### On Vercel (Project → Settings → Environment Variables)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Transaction pooler **`:6543?pgbouncer=true&connection_limit=1`** |
| `AUTH_SECRET` | strong random secret |
| `NEXT_PUBLIC_APP_URL` | your Vercel URL (e.g. `https://nexusiq-ai-steel.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `SUPABASE_STORAGE_BUCKET_DOCUMENTS` | `documents` |
| `ENABLE_INLINE_PROCESSING` | **`false`** or unset |
| `OLLAMA_BASE_URL` | your tunnel URL (see §4) |
| `OLLAMA_CHAT_MODEL` | `llama3` |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` |

**Do not** set `OLLAMA_BASE_URL` to `localhost` on Vercel — that points at Vercel's own machine, not your Mac.

After any env change: **Deployments → Redeploy**.

---

## 3. Optional: `.env.worker` (recommended)

Create `.env.worker` (gitignored via `.env.*`) so you don't override vars manually each time:

```bash
# .env.worker — Mac bridge worker only (DO NOT COMMIT)

DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_CHAT_MODEL="llama3"
OLLAMA_EMBED_MODEL="nomic-embed-text"
ENABLE_INLINE_PROCESSING="false"
WORKER_POLL_INTERVAL_MS="5000"
WORKER_CONCURRENCY="1"

NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_STORAGE_BUCKET_DOCUMENTS="documents"
```

Run worker with:

```bash
pnpm tsx --env-file=.env.worker scripts/processing-worker.ts
```

---

## 4. Re-establish connection (every session)

Run these **in order**. Keep all terminals open during a demo.

### Terminal 1 — Ollama

```bash
# Option A: Ollama.app (menu bar)
# Option B:
ollama serve
```

Verify:

```bash
curl -s http://localhost:11434/api/tags | head -c 200
# → JSON with llama3, nomic-embed-text
```

---

### Terminal 2 — Mac Bridge (worker)

```bash
cd ~/Desktop/nexusiq-ai

# If SUPABASE_DATABASE_URL isn't exported in your shell:
set -a && source .env && set +a

DATABASE_URL="$SUPABASE_DATABASE_URL" \
ENABLE_INLINE_PROCESSING=false \
pnpm worker:process
```

Or with `.env.worker`:

```bash
pnpm tsx --env-file=.env.worker scripts/processing-worker.ts
```

Expected logs:

```text
[worker] starting (poll=5000ms, concurrency=1)
[worker] claimed 1 document(s): ...
[worker] READY ... (N chunks)
```

---

### Terminal 3 — Mac Tunnel (Cloudflare)

**Working command** (fixes QUIC failures on restricted networks and Ollama 403 from Host header mismatch):

```bash
cloudflared tunnel \
  --protocol http2 \
  --url http://localhost:11434 \
  --http-host-header localhost:11434
```

Wait until you see:

```text
Registered tunnel connection
```

Copy the `https://....trycloudflare.com` URL from the banner.

**Wait 30–60 seconds**, then test the **API endpoint** (not `/`):

```bash
curl -v https://YOUR-URL.trycloudflare.com/api/tags
# → HTTP/2 200 + JSON model list
```

Also open in Chrome:

```text
https://YOUR-URL.trycloudflare.com/api/tags
```

---

### Update Vercel (when tunnel URL changes)

Each time you restart `cloudflared`, you get a **new URL**.

1. Vercel → Settings → Environment Variables
2. Set `OLLAMA_BASE_URL` = `https://YOUR-NEW-URL.trycloudflare.com` (no trailing slash)
3. **Redeploy**

Verify:

```bash
curl -s https://your-app.vercel.app/api/health
```

Success:

```json
{
  "ok": true,
  "db": "connected",
  "ollama": "connected",
  "ollamaUrl": "your-url.trycloudflare.com"
}
```

---

## 5. What works with / without each bridge

| Feature on Vercel | Mac Bridge (worker) | Mac Tunnel |
|-------------------|---------------------|------------|
| Data room upload | ✓ (always) | not needed |
| Docs → `READY` | ✓ required | not needed |
| Keyword search | ✓ required | not needed |
| Hybrid / semantic search | ✓ (chunks in DB) | ✓ required |
| **Interactive chat (slice 08)** | ✓ (chunks in DB) | **✓ required** |
| Local `pnpm dev` | not needed | not needed |

Chat **always** calls Ollama for generation — unlike keyword search, there is no fallback.

---

## 6. Quick verification checklist

Run top to bottom when something breaks:

```bash
# 1. Ollama local
curl -s http://localhost:11434/api/tags
# → 200 JSON

# 2. Tunnel public
curl -v https://YOUR-URL.trycloudflare.com/api/tags
# → 200 JSON (not 403, not empty)

# 3. Vercel health
curl -s https://your-app.vercel.app/api/health
# → ollama: "connected"

# 4. Worker processing
# Upload a file on Vercel → should go PENDING → READY within ~5s
```

---

## 7. Troubleshooting

### Uploads stay `PENDING` forever

| Cause | Fix |
|-------|-----|
| Worker not running | Start Terminal 2 |
| Worker using local Docker DB | Must use `SUPABASE_DATABASE_URL` (`:5432`), not `localhost:5433` |
| Ollama not running | Start Terminal 1 |
| Missing models | `ollama pull llama3 && ollama pull nomic-embed-text` |

### Vercel `/api/health` → `ollama: not_configured`

`OLLAMA_BASE_URL` is unset on Vercel. Set it to your tunnel URL and redeploy.

### Vercel `/api/health` → `ollama: unreachable`

| Cause | Fix |
|-------|-----|
| Tunnel stopped | Restart Terminal 3 |
| Tunnel URL changed | Update Vercel env + redeploy |
| Ollama stopped | Restart Terminal 1 |
| Mac asleep | Wake Mac, restart all 3 terminals |

### Cloudflare Error 1033 ("tunnel not connected")

Tunnel never registered. Common on campus VPN / blocked UDP.

```bash
# Stop tunnel (Ctrl+C), retry with HTTP/2 forced:
cloudflared tunnel --protocol http2 --url http://localhost:11434 --http-host-header localhost:11434
```

Also try: disconnect VPN, use phone hotspot.

### Cloudflare returns HTTP 403 (empty body)

Two common causes:

1. **Testing wrong path** — use `/api/tags`, not `/`
2. **Ollama rejecting Host header** — add `--http-host-header localhost:11434`

```bash
cloudflared tunnel \
  --protocol http2 \
  --url http://localhost:11434 \
  --http-host-header localhost:11434
```

Watch the cloudflared terminal: when curl works, you should see incoming request logs.

### `DATABASE_URL="$SUPABASE_DATABASE_URL"` expands to empty

`.env` vars aren't in your shell. Fix:

```bash
set -a && source .env && set +a
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm worker:process
```

Or paste the full Supabase URL inline.

### Migrations hang or fail

Use **session pooler `:5432`**, never Vercel's `:6543`:

```bash
set -a && source .env && set +a
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm db:migrate
```

### ngrok blocked by antivirus

Norton and similar tools flag ngrok as tunneling software. Options:

- Restore + allow in AV, or
- Use Cloudflare Tunnel (this runbook), or
- Skip tunnel and use **keyword search only** on Vercel

### localtunnel 403

localtunnel requires browser unlock or a `Bypass-Tunnel-Reminder: true` header on requests. Cloudflare with `--http-host-header` is the preferred path for this project.

---

## 8. Demo-day minimum vs full setup

### Minimum (no tunnel)

```bash
# Terminal 1: ollama serve
# Terminal 2: worker against Supabase
```

Works on Vercel: uploads (if worker running), keyword search, data room.

Does **not** work: hybrid/semantic search, chat streaming.

### Full (recommended for slice 08 chat demo)

All 3 terminals + Vercel `OLLAMA_BASE_URL` set to current tunnel URL.

---

## 9. Security notes

- Quick Cloudflare tunnels (`trycloudflare.com`) are **public** — anyone with the URL can hit your Ollama.
- Stop the tunnel when done: `Ctrl+C` in Terminal 3.
- Do not commit `.env`, `.env.worker`, or tunnel URLs.
- Long-term production path: OCI VPS with reverse proxy + `OLLAMA_API_KEY` (see [tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md) § 6).

---

## 10. Migration to OCI (when ready)

| Today (Mac) | Later (OCI) |
|-------------|-------------|
| `pnpm worker:process` on Mac | Same command on OCI VM + systemd |
| `OLLAMA_BASE_URL=http://localhost:11434` (worker) | `http://127.0.0.1:11434` on VM |
| Cloudflare tunnel → Vercel | Caddy/nginx + TLS on `ollama.yourdomain.com` |
| Stop Mac worker + tunnel | OCI runs 24/7 |

Vercel env changes only for `OLLAMA_BASE_URL` (tunnel → permanent domain).

---

## 11. Command cheat sheet

```bash
# ── Start everything ──
ollama serve
DATABASE_URL="$SUPABASE_DATABASE_URL" ENABLE_INLINE_PROCESSING=false pnpm worker:process
cloudflared tunnel --protocol http2 --url http://localhost:11434 --http-host-header localhost:11434

# ── Verify ──
curl http://localhost:11434/api/tags
curl https://YOUR-URL.trycloudflare.com/api/tags
curl https://your-app.vercel.app/api/health

# ── Migrations (Supabase, one-time or after new slices) ──
set -a && source .env && set +a
DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm db:migrate
```

---

## Related docs

- [deployment.md](./deployment.md) — full Vercel + Supabase deployment
- [tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md) — production worker checklist
- [src/lib/ai/ollama-client.ts](../src/lib/ai/ollama-client.ts) — how the app calls Ollama (Bearer auth via `OLLAMA_API_KEY` when set)
