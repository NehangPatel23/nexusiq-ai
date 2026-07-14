# Task 17: Polish

**Status:** NOT STARTED | **Slice:** 17 (Polish) | **Depends on:** Varies per item (mostly 05-data-room+)

## Goal

Cross-cutting UX, enterprise data-room polish, and quality-of-life improvements that are **not** core vertical slices (06–16). Ship opportunistically in small batches without blocking the main build sequence.

## Backlog policy

- **All future polish ideas go in this file** unless the user explicitly asks to implement them in the current session.
- Do **not** start Slice 17 work during a core slice session unless the user requests polish.
- When suggesting improvements, append new items here under the appropriate section (or **Backlog — uncategorized**).
- Items that belong to **Slice 06** (AI pipeline), **Slice 07** (search), or **Slice 15** (global settings/audit) stay in those tasks — cross-link only.

## Out of scope (other slices)

| Topic | Belongs in |
|-------|------------|
| OCR, auto-classification, chunking, embeddings, NER | [06-documents.md](./06-documents.md) |
| Full-text search across document content | [07-search.md](./07-search.md) |
| Global audit log viewer (org-wide), account recovery | Done — [15-settings.md](./15-settings.md) |
| Permissions matrix, folder-level RBAC | [16-admin.md](./16-admin.md) (partial) / polish |
| Redaction / legal hold workflows | Future compliance slice |

---

## P0 — Recommended first batch

- [ ] **In-app audit log viewer** — Filterable table on data room (actor, action, date, resource); complements CSV export
- [ ] **Folder-scoped share links** — Share a folder subtree only, not whole project
- [ ] **M&A folder templates** — One-click standard tree (Financial / Legal / HR / Tax / IP / Corporate)
- [x] **Checklist ↔ folder mapping** — Link checklist items to expected folder paths; data-room deep links (`?folder=…&upload=1`) from Missing page gap rows
- [ ] **Bulk tag / bulk classify** — Multi-select → apply tags or classification in one action

---

## P1 — Data room UX

- [ ] **Saved filter views** — Persist toolbar filters (e.g. Failed, Unclassified, Pending review) per user/project
- [ ] **Starred documents** — Pin files for quick access
- [ ] **Recently viewed** — Recency list in sidebar or command palette
- [ ] **PDF thumbnails in table** — First-page preview in file list
- [ ] **Show page count in table** — Surface `pageCount` from schema in file list
- [ ] **Upload entire ZIP** — Single archive upload with preserved folder structure
- [ ] **Project-level activity feed** — Timeline from `DataRoomAuditEvent` on data room page
- [ ] **Export folder manifest** — PDF/CSV of folder tree + file inventory
- [ ] **Bulk restore / bulk permanent delete (deleted folders)** — Parity with deleted files tab
- [ ] **Duplicate resolution UI** — Compare/dismiss when `duplicateOf` is set; merge or mark intentional

## P2 — External access & collaboration

- [ ] **Share link analytics** — View count, last accessed, optional download log
- [ ] **Password-protected share links** — Passphrase gate before public data room
- [ ] **Share expiry reminders** — Notify creator before link expires
- [ ] **Document notes / review comments** — Internal annotations without changing files
- [ ] **Document lock** — “Under review” flag; blocks delete/move until unlocked
- [ ] **QR code for share links** — For in-person diligence rooms

---

## P3 — Notifications & integration

- [ ] **Audit → notifications bell** — Push events: upload, share created/revoked, retention purge, failed processing
- [ ] **Webhook on document events** — Optional HTTP callback for integrations (upload, delete, ready)

---

## P4 — Quick wins (anytime)

- [ ] **Print-friendly folder manifest** — Browser print stylesheet for current view
- [ ] **Merge PDFs** — Select multiple PDFs → single download
- [ ] **Upload validation rules** — Max files per folder, naming pattern hints (admin-configurable later)
- [ ] **Conflict UI on folder restore** — Clear messaging when name/path conflicts with active folder

---

## Backlog — uncategorized

_Add new polish ideas here. Move to P0–P4 when prioritized._

- [ ] **Notification bell unread badge stale after mark-all-read** — After “Mark all read” / bulk mark read on `/dashboard/notifications`, the topbar bell still shows `9+` until a full refresh; sync `unreadCount` via `nexusiq:notifications-changed` (or optimistic clear) so the badge drops immediately

---

## Backlog — Reports / export (post–Slice 11)

- [x] **Aesthetic PDF export** — Cover page, accent bar, callout, footnotes; redesigned `@react-pdf/renderer` output aligned with product typography (still black-on-white for print)
- [x] **Aesthetic PPTX export (Action Plan / board decks)** — Cover, section dividers, score cards, severity-tagged item slides with context + how-to-close, citation footers; deck built from report metadata (action/risk rows) rather than raw markdown lines
- [x] Force-regenerate UI, custom title, eager format pickers, rename/duplicate, history search/filter
- [x] Multi-sheet XLSX (Summary + Findings), ZIP bulk download, print CSS, data-room citation links, per-type empty CTAs
- [x] Risk Register + Action Plan rich cards (severity badges, humanized categories, citation links, context + how-to-close, print layout)
- [x] Share / time-limited report links (public view + format-locked download; audit on create/revoke/export)
- [x] Compare two report versions (section diff + side-by-side previews)
- [x] Snapshot “as of” AgentRun / Consensus chips on report preview
- [x] Executive / Board PDF narrative polish (recommendation callouts + key-list boxes; exporter v5)
- [x] Audience presets (Board pack, IC memo, Risk export, Exec brief) with eager formats
- [x] Finding status controls on Risk Register (OPEN / ACKNOWLEDGED / RESOLVED / DISMISSED)
- [x] Export + generate activity in project audit (`REPORT_GENERATED`, `REPORT_EXPORTED`, share events)
- [ ] Password / org-only report shares — optional PIN or require logged-in org member (token-only today)
- [ ] Share analytics — view/download counts per report share link
- [ ] Email “copy mailto” — prefilled subject + share URL (no paid mail API)
- [ ] Scheduled regenerate — cron/local job to refresh Board pack weekly (pairs with OCI worker later)
- [ ] Word-level report compare diff (beyond section list + preview panes)
- [ ] Pin custom AgentRun set at generate time (today pins “latest”; UI to pick older runs)
- [ ] Watermark / “draft vs final” flag on PDF cover + footer
- [ ] DOCX export — local-only Word generation (PRD mentions Word; not MVP Slice 11)
- [ ] Command palette: “Share current report”, “Compare reports”, audience presets
- [ ] Intelligence → Reports deep links — “Export as Board pack” from Consensus/Executive tabs

---

## Backlog — Timeline + Graph (post–Slice 12)

- [x] Client-orchestrated multi-batch extract (“Extract all”) when >~25 date/entity-biased chunks
- [ ] Move timeline/graph extract to OCI worker VPS for long CPU Ollama runs
- [x] Background extract survives in-app navigation (module runner + project shell banner; closing browser tab still stops)
- [x] Timeline + Graph UI polish — glass headers, derived summary stats, richer rail/cards/canvas chrome, empty states
- [x] Manual graph node add/remove (POST/DELETE nodes APIs + UI)
- [x] Manual graph relations — modal + canvas Connect mode (click source then target)
- [ ] Global `/dashboard/timeline` and `/dashboard/graph` project pickers
- [x] Keyboard nav list for timeline events; ARIA live region for graph selection beyond panel
- [x] Graph clustering / type filters with density controls for large entity sets
- [x] Export timeline as CSV / ICS; export graph as JSON
- [x] Soft-delete / restore for timeline events (today hard delete)
- [x] Timeline date range filter UI + year jump chips + pin/highlight key events
- [x] Timeline ↔ Graph cross-links (event → graph search; entity detail → matching timeline events)
- [x] Edit/rename graph nodes; edit relation type/confidence + reverse direction; edge labels on hover
- [x] Restore fit-to-view (`zoomToFit`) on graph canvas
- [x] Custom aesthetic DatePicker (timeline forms + filters)

---

## Backlog — Contradiction + Missing + Risks (post–Slice 13)

- [x] Contradiction scan survives in-app navigation (background extract runner + project shell banner)
- [x] Missing-info scan background runner (same module pattern; wired into Missing page + banner)
- [x] Reject unmatched contradiction citations at scan time (`alignContradictionEvidence`; remap chunks or drop)
- [x] CRITICAL contradiction notifications (`RISK_FOUND`) after scan
- [x] Checklist ↔ folder mapping + data-room `?folder=&upload=1` deep links
- [x] Contradiction resolution workflow — resolution note, promote-to-finding, bulk status update, fact-type filter, multi-select
- [x] Risks + Overview diligence-gap rollups — open contradiction/missing counts surfaced on Risks page and Project Overview
- [ ] Move contradiction scan to OCI worker for very large multi-batch rooms

---

## Backlog — Intelligence / Consensus (post–Slice 10)

- [ ] Stream agent runs (token progress) instead of silent 30–90s waits
- [ ] Pin specific AgentRun IDs from Consensus history UI (“re-run with these opinions”)
- [ ] Diff two ConsensusRuns side-by-side
- [ ] Overview widget: sparkline of enterprise risk over time
- [ ] Server-side full-analysis job worker (survives browser close / hard refresh; pairs with OCI worker VPS)
- [ ] Further nav latency: skip redundant page-level session/membership when project layout already authorized; light ollama status endpoint (no DB) for Search badge

---

## Already shipped (reference — do not re-add)

These were delivered in Slice 05 / follow-up sessions; listed so they are not duplicated in backlog:

- Folder tree, drag-drop, bulk upload, version history, preview (PDF/image/text/Office/PPTX)
- Tags, manual classification, filters, sort, search-by-name, CSV export, bulk ZIP download
- Trash: deleted files + folders, restore, permanent delete, retention auto-purge
- Audit log CSV export, share links (whole project), processing status polling bar
- Processing queue panel, per-doc ready/failed toasts, worker setup banner, retry failed
- Actionable processing errors, preview processing metadata, extracted entities panel
- Duplicate resolution actions, needs-attention filter, bulk classify, dashboard processing stat
- Checklist widget, version compare, deep links, keyboard nav, command palette upload
- Upload cancel/retry, duplicate hash indicator, document activity panel (per doc)

---

## Acceptance (when implementing a batch)

Pick one P-section or a coherent subset; then:

- [ ] Loading, empty, error states for new UI
- [ ] WCAG 2.2 AA for new controls
- [ ] Tests for new server logic
- [ ] Update this file — check off completed items
- [ ] `pnpm build` passes

See [docs/08-acceptance-criteria.md](../docs/08-acceptance-criteria.md) § 17.
