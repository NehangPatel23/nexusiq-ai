# Acceptance Criteria

Global and per-slice definition of done for NexusIQ-AI enterprise MVP.

---

## Global Criteria (Every Slice)

- [ ] TypeScript strict, Zod validation on all inputs
- [ ] Auth + role-based authorization on all protected routes
- [ ] Loading, empty, error, success states
- [ ] Toast on mutations, confirmation on destructive actions
- [ ] Responsive mobile + desktop
- [ ] WCAG 2.2 AA, keyboard nav, `prefers-reduced-motion`
- [ ] Unit + integration tests
- [ ] No TODOs, no placeholders, no paid dependencies
- [ ] `pnpm lint && pnpm build && pnpm test` pass

---

## Per-Slice Criteria

### 00 Foundation
- [x] Landing page renders with CTA to register
- [x] App shell with sidebar, topbar, command palette skeleton
- [x] Dark theme default, design tokens applied

### 01 Auth
- [x] Register, login, logout, forgot password
- [x] Profile edit (name, avatar)
- [x] Protected routes redirect unauthenticated users
- [x] Password bcrypt hashed

### 02 Organizations
- [x] Org CRUD, teams, roles (Owner/Admin/Analyst/Reviewer/Viewer)
- [x] Invites, member management, permissions enforced
- [x] In-app notifications created on key events
- [x] Notifications inbox: archive, restore, delete, mark all read

### 03 Workspaces
- [x] Workspace CRUD, unique slug per org
- [x] Optional team assignment

### 04 Projects + Dashboard
- [x] Project types: M&A, Vendor DD, Audit, Investment, Internal
- [x] Dashboard: stats, risk overview, activity, quick actions, recent reports, tasks
- [x] Empty states with CTAs

### 05 Data Room
- [x] Folder tree, drag-drop, bulk upload
- [x] Version history, file preview
- [x] Tags, upload progress per file

### 06 Document Processing
- [x] Classification, OCR, chunking, embeddings
- [x] NER, relationship extraction, duplicate detection
- [x] Auto-folder suggestions, cross-doc linking
- [x] Status: pending → processing → ready/failed

### 07 Smart Search
- [x] Hybrid NL + keyword + semantic search
- [x] Filters, tags, saved searches
- [x] Highlighted snippets, < 2s p95

### 08 Chat
- [x] Streaming cited Q&A, confidence badges
- [x] Suggested questions, agent selector
- [x] Chat history persistence
- [x] Insufficient evidence state

### 09 Intelligence Agents
- [x] Financial: health score, revenue/expense/margin, anomalies, concentration
- [x] Legal: risk score, clauses, red flags, expiring contracts
- [x] Compliance: audit readiness, GDPR/SOX/PCI/ISO/HIPAA gaps
- [x] Risk: enterprise score, category heatmap
- [x] Fraud: indicators with citations
- [x] Each agent: run UI, score card, findings table

### 10 Executive + Consensus
- [x] Executive agent: summary, memo, recommendation
- [x] Consensus: per-agent opinions preserved
- [x] Agreements, conflicts, resolution rationale shown
- [x] Never black-box final recommendation

### 11 Reports & Export
- [x] Generate: executive, board, investment memo, audit, risk register
- [x] Export: PDF, Markdown, Excel, PPTX (local generation)
- [x] Report history with download
- [x] Custom title, force-regenerate, eager formats, rename/duplicate, search/filter
- [x] ZIP bulk download, print CSS, citation links to data room, per-type empty CTAs
- [x] Share links, version compare, snapshot as-of chips, audience presets
- [x] Finding status from Risk Register; report generate/export/share audit events
- [x] Executive/Board PDF narrative polish (v5)

### 12 Timeline + Graph
- [x] Auto-extract events (funding, lawsuits, contracts, etc.)
- [x] Visual timeline with citations
- [x] Force-directed relationship graph
- [x] Node click → related documents

### 13 Contradiction + Missing Info
- [ ] Cross-doc contradiction scan with severity ranking
- [ ] Missing document detection by project type
- [ ] Follow-up request export
- [ ] Full status workflow on findings (OPEN → closed paths; Risk Register already supports status PATCH)

### 14 Simulator + Action Plan
- [ ] What-if scenarios (revenue change, customer loss, etc.)
- [ ] Delta vs baseline scores shown
- [ ] Action plan kanban with assignee, priority, deadline, impact
- [ ] Link actions to source findings

### 15 History + Settings
- [ ] Audit log with filters
- [ ] Project comparison view
- [ ] Settings shell: Profile, Security, Notifications, AI Models, Appearance, Shortcuts
- [ ] Profile, password, AI model config, notification prefs
- [ ] Account deletion with 24h grace period and recovery on re-login
- [ ] Organization deletion tombstone + 24h recovery (revert immediate hard delete)
- [ ] Purge job removes expired tombstoned users/orgs after 24h
- [ ] Keyboard shortcuts page

### 16 Admin
- [ ] Health: DB, Ollama, disk
- [ ] Usage stats, processing queue
- [ ] Reindex/re-embed (owner only)

### 17 Polish (parallel backlog)
Optional UX polish — see [tasks/17-polish.md](../tasks/17-polish.md). Not required for MVP complete; track per batch.

- [ ] Backlog maintained in `tasks/17-polish.md`
- [ ] Each implemented batch: loading/empty/error, a11y, tests, build pass

---

## End-to-End Journey Test

- [x] Landing → Register → Onboarding → Dashboard
- [x] Create project → Upload data room → Processing completes (local / worker; Vercel inline optional)
- [x] Run agents → View consensus → Chat with citations
- [x] Generate report → Export PDF (also MD/XLSX/PPTX/ZIP; share links)
- [ ] View timeline, graph, contradictions, missing docs
- [ ] Run simulator → Create action items
- [ ] No dead-end pages in journey (placeholders remain for slices 12–16)

---

## MVP Complete

All slices + end-to-end journey pass. App runs from clean clone per README.
