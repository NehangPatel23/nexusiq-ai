# NexusIQ-AI — Master PRD Index

**Version:** 2.0.0 (Solo Zero-Cost Enterprise MVP)  
**Status:** Canonical  
**Framework:** AI-EOS v1.0  
**Product:** AI Enterprise Decision Intelligence Platform  
**Builder:** One solo developer  
**Budget:** $0 — free, open-source, local/self-hosted only

---

## Canonical Build Constraints

| Constraint | Rule |
|------------|------|
| Team | Solo developer — no team handoffs |
| Cost | Zero paid APIs, zero commercial SaaS, zero licensed infra |
| Architecture | One Next.js app, one PostgreSQL database, one Ollama runtime |
| AI | Local Ollama only — no OpenAI, Anthropic, or hosted inference |
| Storage | Local filesystem — no S3/Azure/GCS required |
| Queues | No Redis/BullMQ — in-process background jobs only |
| Backend | Next.js Route Handlers + Server Actions — no NestJS |
| Graph DB | PostgreSQL only — no Neo4j |
| Search | PostgreSQL FTS + pgvector — no Algolia/OpenSearch |
| UX quality | Production commercial SaaS (Linear/Stripe/Notion bar) |

> **Override rule:** Any content implying paid services, microservices, NestJS, Redis, BullMQ, Neo4j, OpenSearch, or cloud-hosted AI is **superseded** by this index and `docs/` + `.cursor/rules/`.

**Golden rule:** If it costs money to start, it is not part of the solo MVP.

---

## Documentation Map

### Root
| File | Purpose |
|------|---------|
| [AGENTS.md](./AGENTS.md) | AI operating instructions |
| [README.md](./README.md) | Project overview and quick start |
| [PRD.md](./PRD.md) | This file — master index |

### Cursor Rules
| File | Purpose |
|------|---------|
| [.cursor/rules/00-global-constitution.md](./.cursor/rules/00-global-constitution.md) | One app, one DB, modular monolith |
| [.cursor/rules/01-stack-and-constraints.md](./.cursor/rules/01-stack-and-constraints.md) | Approved stack, exclusions |
| [.cursor/rules/02-ui-ux.md](./.cursor/rules/02-ui-ux.md) | Premium dark UI, states, a11y |
| [.cursor/rules/03-data-and-schema.md](./.cursor/rules/03-data-and-schema.md) | Tenancy, Prisma conventions |
| [.cursor/rules/04-ai-and-prompts.md](./.cursor/rules/04-ai-and-prompts.md) | Multi-agent AI, consensus, citations |
| [.cursor/rules/05-testing-and-quality.md](./.cursor/rules/05-testing-and-quality.md) | Tests, definition of done |
| [.cursor/rules/06-zero-cost-solo-build.md](./.cursor/rules/06-zero-cost-solo-build.md) | No paid APIs, solo assumptions |

### Product & Architecture Docs
| File | Purpose |
|------|---------|
| [docs/00-product-prd.md](./docs/00-product-prd.md) | Full enterprise product requirements |
| [docs/09-page-specifications.md](./docs/09-page-specifications.md) | Every page, widget, interaction |
| [docs/01-architecture.md](./docs/01-architecture.md) | System architecture and ADRs |
| [docs/02-data-model.md](./docs/02-data-model.md) | Database and entity model |
| [docs/03-api-contracts.md](./docs/03-api-contracts.md) | API contracts |
| [docs/04-design-system.md](./docs/04-design-system.md) | Premium UI/UX design system |
| [docs/05-ai-architecture.md](./docs/05-ai-architecture.md) | Multi-agent AI + consensus engine |
| [docs/06-build-plan.md](./docs/06-build-plan.md) | Solo build sequence |
| [docs/07-feature-slices.md](./docs/07-feature-slices.md) | Vertical slice definitions |
| [docs/08-acceptance-criteria.md](./docs/08-acceptance-criteria.md) | Definition of done |
| [docs/CURSOR_MASTER_PROMPT.md](./docs/CURSOR_MASTER_PROMPT.md) | Master prompt for autonomous builds |

### Implementation Artifacts
| Directory | Purpose |
|-----------|---------|
| [tasks/](./tasks/) | Per-feature implementation tasks (01–16) |
| [prompts/](./prompts/) | Per-feature and per-agent prompt templates |
| [agents/](./agents/) | Specialized agent roles (planner, db, ui, ai, testing) |

---

## Product Summary

**NexusIQ-AI** is an autonomous enterprise decision intelligence platform. Users upload an entire company data room and AI performs due diligence, multi-agent analysis (Financial, Legal, Compliance, Risk, Fraud), explainable consensus, contradiction detection, missing document analysis, risk simulation, and executive reporting — all with mandatory citations, locally via Ollama.

**Experience target:** Palantir + Bloomberg + cited AI + Deloitte diligence + Notion + Stripe polish — at zero API cost.

### User Journey

```
Landing → Auth → Dashboard → Project → Data Room Upload → AI Processing
→ Intelligence Dashboard → Chat → Agents → Consensus → Reports
→ Timeline → Graph → Contradictions → Missing Info → Simulator → Export → History
```

### Tenancy

```
User → Organization (teams, roles) → Workspace → Project (data room)
```

### Core Features (MVP — all functional, no placeholders)

| Area | Features |
|------|----------|
| **Auth** | Signup, login, forgot password, profile, dark mode |
| **Org** | Teams, roles (Owner/Admin/Analyst/Reviewer/Viewer), permissions, notifications |
| **Dashboard** | Risk overview, activity, analytics, quick actions, recent reports, tasks |
| **Data Room** | Folders, bulk upload, OCR, version history, preview, tags |
| **Processing** | Classification, NER, embeddings, graph, duplicates, auto-folder |
| **Agents** | Financial, Legal, Compliance, Risk, Fraud, Executive |
| **Consensus** | Multi-agent debate, explainable final recommendation |
| **Chat** | Cited Q&A across all documents, suggested questions |
| **Search** | NL + semantic hybrid, filters, saved searches |
| **Intelligence** | Contradictions, missing docs, risk simulator, action plan |
| **Outputs** | Timeline, relationship graph, PDF/Excel/PPTX reports |
| **Admin** | Users, audit logs, usage, health, reindex |

### MVP Feature Slices (strict order)

| # | Slice | Scope | Status |
|---|-------|-------|--------|
| 1 | Auth | Signup, login, forgot password, profile | Done |
| 2 | Organizations | Teams, roles, permissions, invites, notifications | Done |
| 3 | Workspaces | Workspace CRUD | Done |
| 4 | Projects + Dashboard | Project types, dashboard widgets | Done |
| 5 | Data Room | Folders, bulk upload, versions | Done |
| 6 | Documents | Full processing pipeline | Done |
| 7 | Smart Search | Hybrid search, saved searches | Done |
| 8 | Chat | Interactive cited Q&A | Done |
| 9 | Intelligence Agents | Financial, Legal, Compliance, Risk, Fraud | Done |
| 10 | Executive + Consensus | Executive agent, consensus engine | Done |
| 11 | Reports & Export | PDF, board memo, Excel, PPTX | Done |
| 12 | Timeline + Graph | Executive timeline, relationship graph | Done |
| 13 | Contradiction + Missing | Cross-doc contradictions, missing docs | Done |
| 14 | Simulator + Actions | Risk simulator, action plan kanban | Done |
| 15 | History + Settings | Audit, comparison, AI config | Pending |
| 16 | Admin | Health, usage, reindex | Pending |

One slice at a time. Each slice: DB + API + UI + tests before next.

### Deferred (post-MVP)

SSO/SAML, billing/Stripe, paid LLMs, hosted vector/graph DBs, microservices, marketplace, webhooks.

---

## Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js App Router, TypeScript strict |
| UI | Tailwind, shadcn/ui, Framer Motion, Lucide, Recharts |
| Forms | React Hook Form, Zod |
| Data | TanStack Query, Prisma, PostgreSQL + pgvector + FTS |
| Auth | Auth.js |
| AI | Ollama (chat + embeddings) |
| OCR | Tesseract |
| Docs | LibreOffice, PDF.js |
| Export | @react-pdf/renderer, exceljs, pptxgenjs |
| Storage | Local filesystem |
| Testing | Vitest, Playwright, axe |

---

## AI Principles

1. **Retrieve first, reason second**
2. **Citations mandatory** on every factual claim
3. **Confidence required** — express uncertainty
4. **Six specialist agents + Executive + Consensus** — code modules, not services
5. **Never black box** — consensus shows agent opinions and resolution rationale
6. **No fabrication** — insufficient evidence is a valid output

---

## Quality Gates

- Compiles (`pnpm build`), tests pass, lint clean
- Loading, empty, error states on every screen
- WCAG 2.2 AA, responsive, keyboard + command palette
- No TODOs, no placeholders, no paid dependencies

---

## Autonomous Build

1. Paste [docs/CURSOR_MASTER_PROMPT.md](./docs/CURSOR_MASTER_PROMPT.md) into Cursor Agent
2. Agent reads `.cursor/rules/` → `docs/` → `tasks/<NN>.md`
3. One slice per session; validate [docs/08-acceptance-criteria.md](./docs/08-acceptance-criteria.md)
4. Repeat until slice 16 complete
