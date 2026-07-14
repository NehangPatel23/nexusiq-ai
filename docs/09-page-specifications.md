# Page Specifications

Every page: header, sidebar, widgets, states (loading/empty/error), keyboard access.

**App shell:** Fixed sidebar (240px) · top bar (breadcrumbs, search, Cmd+K, notifications bell, avatar) · main content.

---

## Landing Page (`/`)

**Purpose:** Convert visitors; communicate enterprise decision intelligence.

**Sections:**
- Hero: headline, subhead, CTA "Get Started" + "View Demo"
- Problem strip: weeks → minutes
- Feature grid: Data Room, Multi-Agent AI, Consensus, Reports
- Agent showcase: Financial, Legal, Compliance, Risk, Fraud
- Trust: citations, local AI, evidence-first
- Footer: login link

**States:** Static; no auth required. CTA → `/register`.

---

## Auth Pages

### Login (`/login`)
- Email, password, "Forgot password?", "Sign up" link
- Error: invalid credentials, account locked
- Success → redirect to `/dashboard`

### Register (`/register`)
- Name, email, password, confirm password, terms checkbox
- Success → create default org prompt or `/onboarding`

### Forgot Password (`/forgot-password`)
- Email input → dev: log reset link; prod: optional SMTP
- Success message (always generic for security)

### Profile (`/dashboard/settings/profile`)
- Avatar upload (local), name, email (read-only if verified)
- Save toast

---

## Onboarding (`/onboarding`)
- Step 1: Organization name
- Step 2: First workspace name
- Step 3: Optional first project
- Skip allowed after step 1

---

## Dashboard (`/dashboard`)

**Widgets:**
| Widget | Content |
|--------|---------|
| Stats row | Projects count, documents processed, open risks, pending tasks |
| Risk overview | Donut chart by severity |
| Recent activity | Feed: uploads, agent runs, reports |
| Quick actions | 4 buttons: New Project, Upload, Full Scan, New Chat |
| Recent reports | Table: title, project, date, download |
| Upcoming tasks | List: title, due, priority |

**Empty state:** "Create your first project" CTA.

---

## Projects List (`/dashboard/projects`)

- Grid/list toggle, search, filter by type/status
- Card: name, type badge, doc count, risk score, last activity
- "+ New Project" → modal: name, type, description, workspace

---

## Project Dashboard (`/dashboard/projects/[id]`)

**Tabs:** Overview · Data Room · Intelligence · Chat · Search · Reports · Timeline · Graph · Risks · Contradictions · Missing · Simulator · Actions · History

Live today: Overview, Data Room, Intelligence, Chat, Search, Reports, Timeline, Graph, Risks, Contradictions, Missing, Simulator, Actions. History remains a polished placeholder until slice 15.

**Overview tab:**
- Deal metadata card (editable)
- Processing progress bar
- Agent score cards (Financial, Legal, Compliance, Risk, Fraud)
- Enterprise risk score gauge
- Latest consensus recommendation
- Diligence gaps card (open contradictions + missing items)
- Quick links row

---

## Data Room (`/dashboard/projects/[id]/data-room`)

**Layout:** Left folder tree · center file list · right preview panel

**File list columns:** Name, type, classification, status, version, size, uploaded, actions

**Actions:** Upload, new folder, bulk delete, reprocess, download, view versions

**Upload modal:** Drag-drop zone, folder preserve toggle, progress list

**Preview:** PDF viewer, text preview, metadata sidebar

---

## Intelligence (`/dashboard/projects/[id]/intelligence`)

**Status:** live (Slices 09–10)

**Agent tabs:** Financial · Legal · Compliance · Risk · Fraud · Executive · Consensus

Each agent tab:
- Run scan button (with progress animation)
- Score gauge + breakdown
- Findings table with citations
- Expand row → evidence panel

**Consensus tab:**
- Agent opinion cards (side by side)
- Agreement/conflict matrix
- Final recommendation with confidence
- "Why this recommendation" expandable section

---

## Chat (`/dashboard/projects/[id]/chat`)

**Status:** live (Slice 08)

- Left: chat sessions list
- Center: messages, streaming, citation chips
- Bottom: input + agent selector + suggested questions
- Right (collapsible): source context panel

**Suggested questions chips:** "Biggest legal risk?", "Contracts expiring next year?", "Customer concentration?"

---

## Smart Search (`/dashboard/projects/[id]/search`)

**Status:** live (Slice 07)

- Large search input, mode toggle (hybrid/semantic/keyword)
- Filter bar: type, date, folder, tag
- Saved searches dropdown + save button
- Results: snippet cards with score, highlight, open in preview

---

## Reports (`/dashboard/projects/[id]/reports`)

**Status:** live (Slice 11)

- Audience presets (Board pack, IC memo, Risk export, Exec brief) with eager formats
- Quick generate grid + Generate dropdown for all report types
- Generate dialog: custom title, force-regenerate (narrative), eager format pickers
- Progress modal (assemble → generate → persist)
- Prerequisites banner when intelligence / findings missing; per-type empty CTAs
- Preview: Markdown / Risk Register / Action Plan cards, citations panel, print CSS
- Snapshot “as of” AgentRun / Consensus chips; Share dialog (time-limited links)
- History: search/filter, rename, duplicate, compare, download (PDF/MD/XLSX/PPTX/ZIP)
- Finding status controls on Risk Register cards
- Routes: `/dashboard/reports` (project picker / redirect), public `/share/reports/[token]`

---

## Timeline (`/dashboard/projects/[id]/timeline`)

- Vertical timeline with year markers
- Event cards: date, title, category icon, citation link
- "Extract events" + "Add event" buttons
- Filter by category

---

## Graph (`/dashboard/projects/[id]/graph`)

- Full-width force graph canvas
- Legend, zoom controls, fit-to-screen
- Node click → slide-over detail
- "Extract entities" button

---

## Risks (`/dashboard/projects/[id]/risks`)

**Status:** Live (Slice 13)

- Enterprise risk score gauge (rollup across agent findings / consensus)
- Severity / category heatmap
- Open findings list with editable severity/status badges (synced app-wide)
- Filters by agent type, severity, and status
- Links to open contradictions and missing items when counts > 0
- Finding status workflow (OPEN → ACKNOWLEDGED → RESOLVED/DISMISSED)

---

## Contradictions (`/dashboard/projects/[id]/contradictions`)

**Status:** Live (Slice 13)

- Summary cards (open / critical-high / acknowledged / closed)
- Severity-sorted table with explanation preview, source docs, value chips
- Filters: status, severity, fact type; multi-select + bulk status update
- Background contradiction scan (survives in-app navigation)
- Detail dialog: side-by-side evidence with value highlights, severity/status editors, resolution note, promote-to-finding
- Scan rejects citations where values are not found in retrieved chunk text

---

## Missing Information (`/dashboard/projects/[id]/missing`)

**Status:** Live (Slice 13)

- Coverage progress + expected-vs-found checklist (folder path badges)
- Gap cards with framework / category / severity / status badges
- “Upload to close gap” → data room `?folder=&upload=1`
- Background missing scan; export follow-ups (markdown / CSV)
- Mark requested / resolved / not applicable

---

## Risk Simulator (`/dashboard/projects/[id]/simulator`)

- Scenario picker cards + parameter sliders/inputs (revenue %, customer loss, lawsuit, price, custom)
- Prerequisites banner when FINANCIAL / RISK baselines missing → link to Intelligence
- Run simulation → AgentThinking → delta panel (baseline vs simulated scores, confidence, recommendation, key impacts)
- Run history to re-open past `SimulationRun`s
- Ollama required for POST simulate; GET list/detail offline

---

## Action Plan (`/dashboard/projects/[id]/actions`)

- Kanban by status: Todo / In Progress / Done (priority badges; cancel soft-hidden)
- Cards: title, assignee, deadline, impact, source finding link; drag-and-drop + status select
- Stats strip + priority/assignee filters
- "+ Add task", "+ Add from finding", "Suggest from intelligence" (deterministic; no Ollama)
---

## History (`/dashboard/history`)

- Org-wide audit log with filters
- Project comparison mode (select 2 projects → score diff table)

---

## Notifications (`/dashboard/notifications`)

- In-app list: processing done, risk found, task assigned
- Mark read, mark all read
- Archive to Archived tab; restore from Archived
- Permanently delete (with confirm)
- Multi-select with bulk mark read / archive / restore / delete

---

## Settings (`/dashboard/settings`)

Tabs: Profile · Security · Notifications · AI Models · Appearance · Shortcuts

---

## Admin (`/dashboard/admin`)

Owner only: health cards, queue status, user table, usage charts, reindex buttons.

---

## Global Interactions

| Interaction | Behavior |
|-------------|----------|
| Cmd+K | Command palette |
| ? | Shortcuts modal |
| Right-click row | Context menu |
| Destructive action | Confirmation dialog |
| Long operation | Skeleton + progress |
| Error | Toast + inline retry |
