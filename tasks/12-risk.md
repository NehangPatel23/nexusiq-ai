# Task 12: Timeline + Graph

**Status:** DONE | **Slice:** 12/16 | **Depends on:** 06-documents

## Goal
Executive timeline + enterprise relationship graph.

## Scope
### DB: TimelineEvent (category: funding|hiring|acquisition|lawsuit|leadership|revenue|contract|other)
### Timeline: AI extract + manual CRUD, vertical timeline UI
### Graph: Entity/EntityRelation, force-directed viz, node detail panel
### API: timeline extract, graph extract

## Prompts
`prompts/timeline.md`, `prompts/graph.md`

## Acceptance
docs/08-acceptance-criteria.md § 12

## Notes
- GET timeline / GET graph work offline (no Ollama). Extract endpoints require `OLLAMA_BASE_URL` (+ `OLLAMA_API_KEY` on Vercel).
- Deferred: move extract to OCI worker VPS; public HTTPS Ollama for reliable Vercel prod extract latency.
- **Risks** tab (enterprise risk score / heatmap) deferred to Slice 13 — see [tasks/13-tasks.md](./13-tasks.md).
