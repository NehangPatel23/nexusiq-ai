# Solo Build Plan

Enterprise decision intelligence — one developer, zero cost, production quality.

---

## Phase 0: Foundation (Days 1–2)

- [x] Next.js 14+ App Router, TypeScript strict, pnpm
- [x] Tailwind + shadcn/ui dark theme + design tokens
- [x] Prisma + PostgreSQL Docker + pgvector extension
- [x] App shell: sidebar, topbar, command palette skeleton
- [x] **Landing page** (`/`) — hero, features, CTA
- [x] ESLint, Prettier, Vitest, Playwright, axe
- [x] `.env.example`, `docker-compose.yml`
- [x] Verify `pnpm build && pnpm dev`

## Phase 1: Platform Core (Week 1)

| Day | Slice | Deliverable | Status |
|-----|-------|-------------|--------|
| 1 | 01 Auth | Signup, login, forgot password, profile, middleware | Done |
| 2 | 02 Organizations | Orgs, teams, roles, invites, notifications table | Done |
| 3 | 03 Workspaces | Workspace CRUD | Done |
| 4–5 | 04 Projects + Dashboard | Project types, dashboard widgets, onboarding | Done |

## Phase 2: Data Room (Week 2)

| Day | Slice | Deliverable | Status |
|-----|-------|-------------|--------|
| 6 | 05 Data Room | Folders, bulk upload, versions, preview | Done |
| 7–8 | 06 Processing | Classification, OCR, chunk, embed, NER, duplicates | Done (OCI worker prod deferred) |

## Phase 3: Search & Chat (Week 3)

| Day | Slice | Deliverable | Status |
|-----|-------|-------------|--------|
| 9 | 07 Search | Hybrid search, saved searches | Done |
| 10–11 | 08 Chat | Streaming cited Q&A, suggested questions | Done |

## Phase 4: Intelligence Agents (Week 4–5)

| Day | Slice | Deliverable | Status |
|-----|-------|-------------|--------|
| 12–13 | 09 Agents | Financial, Legal, Compliance, Risk, Fraud | Done |
| 14 | 10 Consensus | Executive agent + consensus engine UI | Done |
| 15 | 11 Reports | PDF, board memo, Excel, PPTX export | Done |

## Phase 5: Advanced Intelligence (Week 6)

| Day | Slice | Deliverable | Status |
|-----|-------|-------------|--------|
| 16 | 12 Timeline + Graph | Timeline view, force graph | Done |
| 17 | 13 Contradictions + Missing + Risks | Cross-doc scan, missing info, Risks overview | Done |
| 18 | 14 Simulator | Risk what-if, action plan kanban | Pending |

## Phase 6: Polish (Week 7)

| Day | Slice | Deliverable | Status |
|-----|-------|-------------|--------|
| 19 | 15 History + Settings | Audit, comparison, AI config | Pending |
| 20 | 16 Admin | Health, usage, reindex | Pending |
| 21–22 | QA | E2E flows, accessibility audit, bug fixes | Ongoing |

---

## Daily Rules

1. End every session with buildable, runnable app
2. One slice acceptance criteria before next slice
3. No paid dependencies
4. No placeholder pages in user journey
5. Update task file when slice complete

## Environment

```bash
docker compose up -d db
ollama pull llama3 && ollama pull nomic-embed-text
brew install tesseract libreoffice  # macOS
pnpm install && pnpm db:migrate && pnpm dev
```

## MVP Complete When

All 16 slices pass [08-acceptance-criteria.md](./08-acceptance-criteria.md).  
Full journey: Landing → Auth → Dashboard → Upload → Intelligence → Contradictions / Missing / Risks → Export works end-to-end.

**Slice 17 (Polish)** is a parallel backlog ([tasks/17-polish.md](../tasks/17-polish.md)) — optional UX improvements; not required for MVP complete.

**OCI worker VPS** is deferred until Oracle Cloud instance provisioning succeeds — develop on localhost until then ([tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md)).
