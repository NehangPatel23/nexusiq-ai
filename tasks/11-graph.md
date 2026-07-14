# Task 11: Reports & Export

**Status:** DONE | **Slice:** 11/16 | **Depends on:** 10-consensus

## Goal
Generate and export all report types locally (no paid services).

## Scope
### DB: Report (reportType, filePath) + ReportShare (token, expiresAt, format lock)
### Report types: Executive, Board, Investment Memo, Audit, Risk Register, Action Plan, PPTX
### Export libs: @react-pdf/renderer, exceljs, pptxgenjs
### UI: Generate dropdown, audience presets, report history, download/ZIP, share, compare, generation progress modal, snapshot chips, finding status on Risk Register

## Completed
- Assemble from AgentRuns + ConsensusRun + Findings; Ollama only for force-regenerate / missing executive narrative
- Tabular RISK_REGISTER / ACTION_PLAN offline; PDF/XLSX/PPTX/MD export never calls Ollama
- Share links, version compare, audience presets, snapshot as-of, finding status, audit events
- Aesthetic PDF (v5) + PPTX decks from structured metadata

## Acceptance
docs/08-acceptance-criteria.md § 11

## Notes
- Deferred: OCI worker + public Ollama for Vercel narrative regenerate (assembly/export still works when intelligence exists)
- Further report polish ideas live in [tasks/17-polish.md](./17-polish.md)
