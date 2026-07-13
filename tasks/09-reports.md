# Task 09: Intelligence Agents

**Status:** DONE | **Slice:** 9/16 | **Depends on:** 08-chat

## Goal
Five specialist agents with scores, findings, citations, run UI.

## Scope
### DB: AgentRun, Finding
### Agents (`lib/ai/agents/`):
- **Financial:** health score, revenue/expense/margin, anomalies, concentration, duplicate payments
- **Legal:** risk score, clauses, red flags, expiring contracts
- **Compliance:** audit readiness, GDPR/SOX/PCI/ISO/HIPAA gaps
- **Risk:** enterprise score, category heatmap (8 categories)
- **Fraud:** invoice, vendor, transaction, COI indicators
### UI: `/intelligence` page with agent tabs, score cards, findings tables, AgentThinking animation
### API: POST `/api/projects/[id]/agents/{type}/run`

## Prompts
`prompts/financial.md`, `legal.md`, `compliance.md`, `risk.md`, `fraud.md`

## Acceptance
docs/08-acceptance-criteria.md § 09

## Deferred — OCI / public Ollama (production)

Agent runs on localhost with local Ollama; Vercel prod requires processed docs + public Ollama.

- [ ] OCI worker — [00-oci-worker-vps.md](./00-oci-worker-vps.md) § 1–5
- [ ] Public Ollama HTTPS — same file § 6 (agent execution from Vercel)
