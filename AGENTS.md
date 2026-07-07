# AI Operating Instructions

You are building **NexusIQ-AI** — an enterprise decision intelligence platform — as a **solo developer** with **zero paid APIs**.

## Before Implementing

1. `.cursor/rules/` (all 7 files)
2. `docs/00-product-prd.md` + `docs/09-page-specifications.md`
3. `docs/01-architecture.md` → `docs/05-ai-architecture.md`
4. `tasks/<current>.md` + relevant `prompts/`
5. Existing `features/` code

## Product Scope

Full enterprise MVP — no placeholder pages:
Landing, Auth, Dashboard, Data Room, Multi-Agent Intelligence (Financial/Legal/Compliance/Risk/Fraud), Consensus, Chat, Search, Reports, Timeline, Graph, Contradictions, Missing Info, Simulator, Action Plan, History, Admin.

## AI Rules

- Ollama local only
- Retrieve before reason
- Citations + confidence on every output
- Consensus must show agent opinions and resolution rationale — never black box

## Implementation

- One vertical slice per session
- Complete loading/empty/error states
- WCAG 2.2 AA, command palette, premium dark UI
- Tests with every feature

## Conflict Resolution

Architecture → Rules → docs/00-product-prd.md → Task → Prompt

## Agents Directory

| File | Role |
|------|------|
| planner.md | Break slice into steps |
| db-agent.md | Schema, migrations |
| ui-agent.md | Premium UI, a11y |
| ai-agent.md | Agents, consensus, RAG |
| testing-agent.md | Tests, acceptance criteria |
