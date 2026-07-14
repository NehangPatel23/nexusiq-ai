# Task 13: Contradiction + Missing Info + Risks

**Status:** DONE | **Slice:** 13/16 | **Depends on:** 06-documents, 09–10 Intelligence

## Goal
Cross-document contradictions, missing document detection, and the project **Risks** overview (deferred from Slice 12).

## Scope
### DB: Contradiction, MissingItem ✅
### Contradiction engine (`lib/ai/contradictions.ts`): extract facts, compare, rank severity ✅
### Missing info engine (`lib/ai/missing-info.ts`): checklist by project type, framework gaps ✅
### Risks page (`/dashboard/projects/[id]/risks`): enterprise risk score, category/severity heatmap, open findings rollup from all agents (not a separate Domain agent — synthesis UI over existing findings / consensus) ✅
### UI: Contradictions table, missing items checklist, follow-up request export, Risks overview ✅
### API: POST scan endpoints, PATCH status; Risks summary GET ✅

## Prompts
`prompts/contradictions.md`, `prompts/missing-info.md`

## Acceptance
docs/08-acceptance-criteria.md § 13 — complete

## Notes
- Risks tab was placeholder under Slice 12 (`Timeline + Graph`) but Timeline + Graph shipped without a Risks synthesis page — scoped and shipped here.
- Contradiction scan requires Ollama (`POST .../contradictions/scan` → `503 OLLAMA_UNAVAILABLE` when down).
- Missing scan is deterministic over classifications/checklist; optional Ollama polish of `followUpText` is non-blocking.
- Risks / missing list & export / status PATCH need no Ollama.
- Public Ollama HTTPS for Vercel contradiction scan remains an ops dependency (same B+C pattern as agents); OCI worker VPS unchanged.
