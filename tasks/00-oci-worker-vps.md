# Task 00: OCI Worker VPS (Deferred)

**Status:** DEFERRED | **Blocked on:** Oracle Cloud (OCI) instance provisioning | **Depends on:** [06-documents.md](./06-documents.md) (local pipeline complete)

## Goal

Production document processing: **Vercel** uploads → **Supabase** `PENDING` → **OCI worker** polls → `READY` / `FAILED`.

Until the OCI instance exists, develop and test every slice on **localhost** (one branch per slice; commits when ready).

## Local development (active now)

| Setting | Value |
|---------|--------|
| `DATABASE_URL` | Docker Postgres locally, or Supabase session pooler when testing cloud DB |
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| Processing | `ENABLE_INLINE_PROCESSING=true` **or** `pnpm worker:process` in a second terminal |
| Branches | `feat/slice-06-document-processing`, `feat/slice-07-search`, … |

**Vercel prod without OCI:** data room uploads work; documents stay `PENDING` until the worker runs.

---

## OCI checklist — implement when instance is available

Pick up any unchecked item during a slice session or as a dedicated infra pass. Full runbook: [docs/deployment.md](../docs/deployment.md) § OCI Worker VPS.

### 1. Provision compute

- [ ] OCI account, compartment, and Always Free quota confirmed
- [ ] **VM.Standard.A1.Flex** (Ampere) — e.g. 4 OCPU / 24 GB RAM (enough for Ollama + worker)
- [ ] Ubuntu 22.04 or 24.04 image
- [ ] SSH key pair; note public IP
- [ ] If **“Out of host capacity”**: retry later or try another region (common on Always Free)

### 2. Networking

- [ ] Security list / NSG: **egress** to HTTPS (443) and Supabase Postgres (5432)
- [ ] Worker-only setup needs **no inbound** ports
- [ ] (Later, slices 08+) Optional inbound 443 for **public Ollama HTTPS** behind reverse proxy + `OLLAMA_API_KEY`

### 3. System dependencies on the VM

- [ ] Node.js 20+, pnpm, git
- [ ] Ollama: `ollama pull llama3` and `ollama pull nomic-embed-text`
- [ ] Tesseract + LibreOffice (PDF OCR / Office extractors used by the pipeline)
- [ ] `ollama serve` enabled on boot (systemd)

### 4. Application + env

- [ ] Clone repo; `pnpm install`
- [ ] `.env` on the VM (never commit):

```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_CHAT_MODEL="llama3"
OLLAMA_EMBED_MODEL="nomic-embed-text"
ENABLE_INLINE_PROCESSING="false"
WORKER_POLL_INTERVAL_MS="5000"
WORKER_CONCURRENCY="1"
```

- [ ] **systemd** unit for `pnpm worker:process` (restart on failure, start on boot)
- [ ] Log location documented (`journalctl -u nexusiq-worker`)

### 5. Verification

- [ ] Worker logs: `claimed …` → `READY … (N chunks)`
- [ ] Upload on **Vercel** → doc moves `PENDING` → `READY` in Supabase
- [ ] Reprocess / failed retry works against prod DB
- [ ] Vercel `ENABLE_INLINE_PROCESSING=false` confirmed

### 6. Optional — public Ollama for Vercel (chat / agents, slices 08+)

- [ ] Reverse proxy (Caddy/nginx) + TLS on subdomain e.g. `ollama.yourdomain.com`
- [ ] Bearer auth via `OLLAMA_API_KEY`
- [ ] Vercel env: `OLLAMA_BASE_URL=https://ollama.yourdomain.com`, `OLLAMA_API_KEY=…`
- [ ] `GET /api/health` reports `ollama: connected` from Vercel

---

## Slice touchpoints

| Slice | OCI / VPS relevance |
|-------|---------------------|
| **06** | Worker script + pipeline done locally; prod path blocked until OCI |
| **07** | Search uses chunks in DB — works locally; prod needs processed docs on Supabase |
| **08+** | Chat/agents on Vercel need **public Ollama** (step 6) or stay localhost-only |
| **16** | Admin: processing queue, worker health, reindex — wire to OCI worker when live |

---

## Acceptance (when implemented)

- [ ] OCI worker runs 24/7 and processes Vercel uploads to `READY`
- [ ] No inline processing on Vercel (`ENABLE_INLINE_PROCESSING=false`)
- [ ] Runbook in `docs/deployment.md` matches actual OCI setup
- [ ] This file: check off checklist items; set **Status** to DONE

See [docs/08-acceptance-criteria.md](../docs/08-acceptance-criteria.md) — production processing is implied by slice 06 + deployment, not a separate slice number.
