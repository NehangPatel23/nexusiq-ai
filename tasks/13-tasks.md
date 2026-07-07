# Task 13: Contradiction + Missing Info

**Status:** NOT STARTED | **Slice:** 13/16 | **Depends on:** 06-documents

## Goal
Cross-document contradictions + missing document detection.

## Scope
### DB: Contradiction, MissingItem
### Contradiction engine (`lib/ai/contradictions.ts`): extract facts, compare, rank severity
### Missing info engine (`lib/ai/missing-info.ts`): checklist by project type, framework gaps
### UI: Contradictions table, missing items checklist, follow-up request export
### API: POST scan endpoints, PATCH status

## Prompts
`prompts/contradictions.md`, `prompts/missing-info.md`

## Acceptance
docs/08-acceptance-criteria.md § 13
