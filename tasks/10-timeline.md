# Task 10: Executive + Consensus

**Status:** DONE | **Slice:** 10/16 | **Depends on:** 09-agents

## Goal
Executive agent + explainable consensus engine (never black box).

## Scope
### DB: ConsensusRun (links AgentRuns) + `AgentType.EXECUTIVE`
### Executive agent: summary, board/investment sections, acquisition recommendation, priority actions
### Consensus (`lib/ai/agents/consensus.ts`):
- Input: all agent run outputs
- Output: agentOpinions[], agreements[], conflicts[], resolutionRationale, finalRecommendation
### UI: Consensus tab — agent opinion cards, conflict matrix, "Why this recommendation" section
### API: POST `/agents/executive/run`, POST `/agents/consensus/run`, GET consensus runs

## Prompts
`prompts/executive.md`, `prompts/consensus.md`

## Acceptance
docs/08-acceptance-criteria.md § 10

## Deferred
- OCI worker VPS + public Ollama HTTPS for Vercel prod (same as Slice 09)
- Slice 11 report export (PDF/board memo download UI)
