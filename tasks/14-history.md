# Task 14: Risk Simulator + Action Plan

**Status:** DONE | **Slice:** 14/16 | **Depends on:** 09-agents

## Goal
What-if risk scenarios + prioritized action plan kanban.

## Scope
### DB: SimulationRun, Task (action plan items with impact, findingId link)
### Simulator (`lib/ai/simulator.ts`): single Ollama JSON call from FINANCIAL+RISK baseline → delta (does not overwrite AgentRuns)
### UI: Scenario picker + sliders, delta panel, history; Action Plan kanban with CRUD / from-findings / suggest
### Scenarios: revenue_decline, customer_churn, lawsuit_loss, price_change, custom

## Prompts
`prompts/risk-simulator.md`, `prompts/tasks.md`

## Acceptance
docs/08-acceptance-criteria.md § 14

## Notes
- Simulations require `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel); Action Plan works offline
- Deferred: public Ollama for Vercel simulations if not already configured; OCI worker unchanged
- Optional later: `mode: "deep"` re-running FINANCIAL+RISK via `runAgent` — not required for MVP
