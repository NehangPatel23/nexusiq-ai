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
- [ ] Landing page renders with CTA to register
- [ ] App shell with sidebar, topbar, command palette skeleton
- [ ] Dark theme default, design tokens applied

### 01 Auth
- [ ] Register, login, logout, forgot password
- [ ] Profile edit (name, avatar)
- [ ] Protected routes redirect unauthenticated users
- [ ] Password bcrypt hashed

### 02 Organizations
- [ ] Org CRUD, teams, roles (Owner/Admin/Analyst/Reviewer/Viewer)
- [ ] Invites, member management, permissions enforced
- [ ] In-app notifications created on key events

### 03 Workspaces
- [ ] Workspace CRUD, unique slug per org
- [ ] Optional team assignment

### 04 Projects + Dashboard
- [ ] Project types: M&A, Vendor DD, Audit, Investment, Internal
- [ ] Dashboard: stats, risk overview, activity, quick actions, recent reports, tasks
- [ ] Empty states with CTAs

### 05 Data Room
- [ ] Folder tree, drag-drop, bulk upload
- [ ] Version history, file preview
- [ ] Tags, upload progress per file

### 06 Document Processing
- [ ] Classification, OCR, chunking, embeddings
- [ ] NER, relationship extraction, duplicate detection
- [ ] Auto-folder suggestions, cross-doc linking
- [ ] Status: pending → processing → ready/failed

### 07 Smart Search
- [ ] Hybrid NL + keyword + semantic search
- [ ] Filters, tags, saved searches
- [ ] Highlighted snippets, < 2s p95

### 08 Chat
- [ ] Streaming cited Q&A, confidence badges
- [ ] Suggested questions, agent selector
- [ ] Chat history persistence
- [ ] Insufficient evidence state

### 09 Intelligence Agents
- [ ] Financial: health score, revenue/expense/margin, anomalies, concentration
- [ ] Legal: risk score, clauses, red flags, expiring contracts
- [ ] Compliance: audit readiness, GDPR/SOX/PCI/ISO/HIPAA gaps
- [ ] Risk: enterprise score, category heatmap
- [ ] Fraud: indicators with citations
- [ ] Each agent: run UI, score card, findings table

### 10 Executive + Consensus
- [ ] Executive agent: summary, memo, recommendation
- [ ] Consensus: per-agent opinions preserved
- [ ] Agreements, conflicts, resolution rationale shown
- [ ] Never black-box final recommendation

### 11 Reports & Export
- [ ] Generate: executive, board, investment memo, audit, risk register
- [ ] Export: PDF, Markdown, Excel, PPTX (local generation)
- [ ] Report history with download

### 12 Timeline + Graph
- [ ] Auto-extract events (funding, lawsuits, contracts, etc.)
- [ ] Visual timeline with citations
- [ ] Force-directed relationship graph
- [ ] Node click → related documents

### 13 Contradiction + Missing Info
- [ ] Cross-doc contradiction scan with severity ranking
- [ ] Missing document detection by project type
- [ ] Follow-up request export
- [ ] Status workflow on findings

### 14 Simulator + Action Plan
- [ ] What-if scenarios (revenue change, customer loss, etc.)
- [ ] Delta vs baseline scores shown
- [ ] Action plan kanban with assignee, priority, deadline, impact
- [ ] Link actions to source findings

### 15 History + Settings
- [ ] Audit log with filters
- [ ] Project comparison view
- [ ] Profile, password, AI model config, notification prefs
- [ ] Keyboard shortcuts page

### 16 Admin
- [ ] Health: DB, Ollama, disk
- [ ] Usage stats, processing queue
- [ ] Reindex/re-embed (owner only)

---

## End-to-End Journey Test

- [ ] Landing → Register → Onboarding → Dashboard
- [ ] Create project → Upload data room → Processing completes
- [ ] Run agents → View consensus → Chat with citations
- [ ] Generate report → Export PDF
- [ ] View timeline, graph, contradictions, missing docs
- [ ] Run simulator → Create action items
- [ ] No dead-end pages in journey

---

## MVP Complete

All slices + end-to-end journey pass. App runs from clean clone per README.
