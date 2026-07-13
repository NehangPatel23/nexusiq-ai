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
| Global audit log viewer (org-wide), account recovery | [15-settings.md](./15-settings.md) |
| Permissions matrix, folder-level RBAC | [15-settings.md](./15-settings.md) / [16-admin.md](./16-admin.md) |
| Redaction / legal hold workflows | Future compliance slice or 15 |

---

## P0 — Recommended first batch

- [ ] **In-app audit log viewer** — Filterable table on data room (actor, action, date, resource); complements CSV export
- [ ] **Folder-scoped share links** — Share a folder subtree only, not whole project
- [ ] **M&A folder templates** — One-click standard tree (Financial / Legal / HR / Tax / IP / Corporate)
- [ ] **Checklist ↔ folder mapping** — Link checklist items to expected folder paths; “missing in `/Financial`”
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

- [ ] _(none yet)_

---

## Backlog — Intelligence / Consensus (post–Slice 10)

- [ ] Stream agent runs (token progress) instead of silent 30–90s waits
- [ ] Pin specific AgentRun IDs from Consensus history UI (“re-run with these opinions”)
- [ ] Diff two ConsensusRuns side-by-side
- [ ] Overview widget: sparkline of enterprise risk over time

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
