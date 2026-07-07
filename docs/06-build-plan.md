# Solo Build Plan

Enterprise decision intelligence — one developer, zero cost, production quality.

---

## Phase 0: Foundation (Days 1–2)

- [ ] Next.js 14+ App Router, TypeScript strict, pnpm
- [ ] Tailwind + shadcn/ui dark theme + design tokens
- [ ] Prisma + PostgreSQL Docker + pgvector extension
- [ ] App shell: sidebar, topbar, command palette skeleton
- [ ] **Landing page** (`/`) — hero, features, CTA
- [ ] ESLint, Prettier, Vitest, Playwright, axe
- [ ] `.env.example`, `docker-compose.yml`
- [ ] Verify `pnpm build && pnpm dev`

## Phase 1: Platform Core (Week 1)

| Day | Slice | Deliverable |
|-----|-------|-------------|
| 1 | 01 Auth | Signup, login, forgot password, profile, middleware |
| 2 | 02 Organizations | Orgs, teams, roles, invites, notifications table |
| 3 | 03 Workspaces | Workspace CRUD |
| 4–5 | 04 Projects + Dashboard | Project types, dashboard widgets, onboarding |

## Phase 2: Data Room (Week 2)

| Day | Slice | Deliverable |
|-----|-------|-------------|
| 6 | 05 Data Room | Folders, bulk upload, versions, preview |
| 7–8 | 06 Processing | Classification, OCR, chunk, embed, NER, duplicates |

## Phase 3: Search & Chat (Week 3)

| Day | Slice | Deliverable |
|-----|-------|-------------|
| 9 | 07 Search | Hybrid search, saved searches |
| 10–11 | 08 Chat | Streaming cited Q&A, suggested questions |

## Phase 4: Intelligence Agents (Week 4–5)

| Day | Slice | Deliverable |
|-----|-------|-------------|
| 12–13 | 09 Agents | Financial, Legal, Compliance, Risk, Fraud |
| 14 | 10 Consensus | Executive agent + consensus engine UI |
| 15 | 11 Reports | PDF, board memo, Excel, PPTX export |

## Phase 5: Advanced Intelligence (Week 6)

| Day | Slice | Deliverable |
|-----|-------|-------------|
| 16 | 12 Timeline + Graph | Timeline view, force graph |
| 17 | 13 Contradictions | Cross-doc scan, missing info engine |
| 18 | 14 Simulator | Risk what-if, action plan kanban |

## Phase 6: Polish (Week 7)

| Day | Slice | Deliverable |
|-----|-------|-------------|
| 19 | 15 History + Settings | Audit, comparison, AI config |
| 20 | 16 Admin | Health, usage, reindex |
| 21–22 | QA | E2E flows, accessibility audit, bug fixes |

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
Full journey: Landing → Auth → Dashboard → Upload → Intelligence → Export works end-to-end.
