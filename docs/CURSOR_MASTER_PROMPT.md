# Cursor Master Prompt

Autonomous build prompt for NexusIQ-AI enterprise decision intelligence platform.

---

## Prompt

```
You are building NexusIQ-AI — an AI Enterprise Decision Intelligence Platform.

## Constraints (NON-NEGOTIABLE)
- SOLO developer — one person builds everything
- ZERO paid APIs — Ollama local only, no OpenAI/Anthropic/Pinecone/Auth0/Stripe
- ONE Next.js app, ONE PostgreSQL+pgvector, ONE Ollama runtime
- Local filesystem storage, in-process jobs (no Redis/BullMQ)
- Modular monolith, vertical slices in features/
- Production commercial SaaS UX (Linear/Stripe/Notion quality)
- NO placeholder pages — full end-to-end user journey must work

## Read First (in order)
1. .cursor/rules/ (all 7 files)
2. AGENTS.md
3. docs/00-product-prd.md
4. docs/09-page-specifications.md
5. docs/01-architecture.md
6. docs/02-data-model.md
7. docs/03-api-contracts.md
8. docs/04-design-system.md
9. docs/05-ai-architecture.md
10. docs/06-build-plan.md
11. docs/07-feature-slices.md
12. docs/08-acceptance-criteria.md

## Product Scope (ALL required in MVP)
Landing, Auth (signup/login/forgot/profile), Organizations (teams/roles/permissions/notifications),
Dashboard (risk overview, activity, quick actions), Projects (M&A/Vendor DD/Audit types),
Data Room (folders, bulk upload, versions, OCR), Document Processing (classification, NER, embeddings),
Smart Search (hybrid, saved searches), Interactive Chat (cited, streaming),
Intelligence Agents (Financial, Legal, Compliance, Risk, Fraud),
Executive Agent + Consensus Engine (explainable, never black box),
Reports (PDF/Excel/PPTX export), Timeline, Relationship Graph,
Contradiction Engine, Missing Information Engine, Risk Simulator, Action Plan,
History, Settings, Admin.

## AI Rules
- Retrieve BEFORE reason (mandatory)
- Citations on every factual claim [doc:id:chunk:id]
- Confidence: HIGH/MEDIUM/LOW/INSUFFICIENT
- Consensus preserves per-agent opinions + resolution rationale
- Six agents + Executive + Consensus = code modules in lib/ai/agents/

## Build Protocol
1. Phase 0: foundation + landing page (docs/06-build-plan.md)
2. ONE slice at a time per docs/07-feature-slices.md
3. Read tasks/<NN>-<name>.md + prompts/<name>.md for current slice
4. Implement: schema → validation → server → UI → tests
5. Verify docs/08-acceptance-criteria.md for current slice
6. Mark task DONE, proceed to next slice only when all checks pass

**Status:** Core MVP slices 01–16 are shipped. Next work is optional [tasks/17-polish.md](../tasks/17-polish.md) or deferred OCI worker ([tasks/00-oci-worker-vps.md](../tasks/00-oci-worker-vps.md)) unless a regression / bugfix is requested.

## Quality Gates
- pnpm build && pnpm test && pnpm lint pass
- Loading + empty + error states on every screen
- WCAG 2.2 AA (including light-mode badge contrast), responsive, command palette (Cmd+K)
- Dark default + full light theme via Appearance
- No TODOs, no fake APIs, no paid deps

## Current Task
Find first incomplete task in tasks/ (typically polish backlog). Implement ONLY that workstream.```

## Per-Slice Usage

```
Current slice: <number> <name>
Read: tasks/<NN>-<name>.md
Read: prompts/<name>.md (+ agent prompts if applicable)
Implement only this slice. Do not start others.
```

## Compatible With

Cursor Agent, Claude Code, Windsurf, Copilot Agent, Gemini CLI, Replit Agent, OpenHands.
