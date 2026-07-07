# Task 10: Executive + Consensus

**Status:** NOT STARTED | **Slice:** 10/16 | **Depends on:** 09-agents

## Goal
Executive agent + explainable consensus engine (never black box).

## Scope
### DB: ConsensusRun (links AgentRuns)
### Executive agent: summary, board report, investment memo, acquisition/vendor recommendation
### Consensus (`lib/ai/agents/consensus.ts`):
- Input: all agent run outputs
- Output: agentOpinions[], agreements[], conflicts[], resolutionRationale, finalRecommendation
### UI: Consensus tab — agent opinion cards, conflict matrix, "Why this recommendation" section
### API: POST `/agents/executive/run`, POST `/agents/consensus/run`

## Prompts
`prompts/executive.md`, `prompts/consensus.md`

## Acceptance
docs/08-acceptance-criteria.md § 10
