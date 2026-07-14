# NexusIQ AI — Product Requirements Document

**Product:** NexusIQ-AI — AI Enterprise Decision Intelligence Platform  
**Version:** 2.0.0  
**Status:** Canonical  
**Builder:** Solo developer  
**Budget:** Zero — free/open-source/local only  
**Quality bar:** Production-grade commercial SaaS UX; zero-cost infrastructure

---

## Part 1 — Product Vision

### 1.1 Vision Statement

NexusIQ-AI is an autonomous enterprise intelligence platform that helps executives, investors, procurement teams, auditors, legal teams, finance teams, and compliance officers make **high-stakes business decisions in minutes instead of weeks**.

Instead of hiring multiple analysts to read thousands of pages, the user uploads an entire company data room and AI performs due diligence, risk analysis, legal review, financial analysis, compliance review, contradiction detection, fraud detection, executive reporting, and interactive Q&A — **entirely on local infrastructure with Ollama**.

**Positioning (experience target):** Palantir + Bloomberg Terminal + trustworthy cited AI + Deloitte-grade diligence + Notion clarity + Stripe polish — **without paid cloud AI bills**.

### 1.2 Core Problem

Current enterprise workflows require weeks of manual analysis across:

| Workflow | Pain |
|----------|------|
| M&A due diligence | Thousands of files, missed red flags |
| Vendor due diligence | Duplicate review across teams |
| Internal audit | Slow evidence gathering |
| Compliance review | Framework mapping is manual |
| Investment analysis | Fragmented financial signals |
| Contract review | Clause risks buried in PDFs |
| Financial review | Anomalies found too late |
| Procurement evaluation | Incomplete vendor picture |
| Risk assessment | No unified enterprise risk score |
| Board prep / executive reporting | Analyst bottleneck |

**Root causes:** duplicate work across teams, missed critical issues, slow decisions, black-box AI tools without citations.

**NexusIQ-AI reduces weeks → minutes** using retrieval-first local AI with mandatory evidence, citations, and multi-agent consensus.

### 1.3 Market (Solo MVP Lens)

| Segment | Use case |
|---------|----------|
| PE / IB analysts | Deal data room diligence |
| Corp dev | Acquisition target analysis |
| CFO / finance | Financial health, anomalies |
| Legal | Contract clause and liability review |
| Compliance | SOX/GDPR/PCI gap detection |
| Procurement | Vendor risk and concentration |
| Auditors | Evidence trails and contradictions |
| Founders / VCs | Investment memo generation |

MVP is fully functional for a **single power user or small team** on self-hosted infra — not multi-tenant SaaS billing.

### 1.4 Personas

| Persona | Goal | Key features |
|---------|------|--------------|
| PE Analyst | Investment decision in 48h | Financial agent, reports, risk score |
| Legal Counsel | Contract risk scan | Legal agent, clause detection, citations |
| Compliance Officer | Audit readiness | Compliance agent, gap detection |
| CFO | Financial health | Margins, cash flow, anomalies, forecasting |
| Corp Dev Lead | M&A recommendation | Consensus engine, executive memo |
| Auditor | Evidence integrity | Contradiction engine, missing docs |
| Executive | Board-ready summary | Executive agent, risk heatmap |
| Procurement | Vendor evaluation | Vendor risk, concentration analysis |

### 1.5 Goals

1. End-to-end user journey with **no placeholder pages**
2. Upload entire data room → full intelligence dashboard in one session
3. Every AI output includes **evidence, citations, confidence**
4. Multi-agent analysis with **explainable consensus** (not black box)
5. Premium enterprise UX (Linear / Stripe / Notion quality)
6. **$0** recurring cost for APIs and AI inference

### 1.6 KPIs & Success Metrics

| Metric | Target |
|--------|--------|
| Data room → first insights | < 30 min (hardware dependent) |
| Search latency | < 2s p95 |
| Chat citation rate | ≥ 95% of factual claims cited |
| Contradiction detection recall | Manual QA on sample data rooms |
| User journey completion | Landing → export without dead ends |
| Build health | `pnpm build && pnpm test` always green |
| Accessibility | WCAG 2.2 AA on all pages |

### 1.7 Competitor Analysis

| Product | Strength | NexusIQ-AI differentiator |
|---------|----------|---------------------------|
| ChatGPT Enterprise | Fast Q&A | No data room workflow, citation gaps |
| Hebbia / Rogo | Finance focus | Paid, closed |
| Kira / Luminance | Legal AI | Expensive, narrow |
| Palantir | Graph + intel | Enterprise cost, complexity |
| Notion AI | Docs | No diligence agents |
| **NexusIQ-AI** | Full diligence stack | Local, cited, multi-agent, zero API cost |

---

## Part 2 — Complete User Journey

```
Landing Page
    ↓
Sign Up / Login / Forgot Password
    ↓
Onboarding (create org → workspace)
    ↓
Dashboard (risk overview, activity, quick actions)
    ↓
Create Project (deal / audit / vendor review)
    ↓
Upload Data Room (folders, bulk, OCR)
    ↓
AI Processing (classification, NER, graph, embeddings)
    ↓
Intelligence Dashboard (scores, heatmaps, agent outputs)
    ↓
AI Chat (cited Q&A across all documents)
    ↓
Specialized Agents (Financial, Legal, Compliance, Risk, Fraud)
    ↓
Consensus Engine (multi-agent recommendation)
    ↓
Reports + Timeline + Graph + Contradictions + Missing Docs
    ↓
Risk Simulator + Action Plan
    ↓
Export (PDF, Markdown, Excel, PPTX)
    ↓
History (audit, comparison, version history)
```

### Edge Cases

- Empty data room → guided upload CTA
- Processing failure → per-document retry, error detail
- Ollama offline → clear banner, degraded mode (search only)
- Insufficient evidence → explicit "cannot recommend" state
- Large uploads → chunked upload, progress per file
- Permission denied → 403 with role explanation

---

## Part 3 — Tenancy & Navigation

```
User
 └── Organization (tenant, teams, roles)
      └── Workspace (department / deal team)
           └── Project (data room + intelligence context)
                ├── Folders → Documents (versioned)
                ├── Intelligence Dashboard
                ├── Agents & Consensus
                ├── Chat, Search, Reports
                ├── Timeline, Graph
                ├── Contradictions, Missing Info
                ├── Risk Simulator, Action Plan
                └── History
```

**Primary nav:** Dashboard · Projects · Data Room · Intelligence · Chat · Reports · Timeline · Graph · Risks · Actions · History · Settings

**Command palette:** `Cmd+K` — navigate, search, upload, new chat, run agent scan

---

## Part 4 — Feature Specification (Complete)

### 4.1 Authentication
- Sign up, login, logout, forgot password (dev: console token; prod: optional SMTP)
- Profile: name, email, avatar, password change
- Session cookies (Auth.js)
- Dark mode preference (default: dark)

### 4.2 Organizations
- Org CRUD, logo, description
- **Teams** within org (group members)
- **Roles:** Owner, Admin, Analyst, Reviewer, Viewer
- **Permissions** matrix per resource (project, document, report, admin)
- Member invites, pending invites
- **In-app notifications** (processing complete, risk found, mention) — no paid push services

### 4.3 Dashboard
- Welcome + org context
- **Projects** grid with status chips
- **Recent activity** feed
- **Risk overview** widget (open findings by severity)
- **Analytics** mini-charts (documents processed, agent runs, chat sessions)
- **Quick actions:** New project, upload, run full scan, new chat
- **Recent reports** list
- **Upcoming tasks** from action plan

### 4.4 Projects
- CRUD with type: M&A, Vendor DD, Audit, Investment, Internal
- Project dashboard shell linking all intelligence modules
- Deal metadata: target company, date, status, tags

### 4.5 Data Room
- Drag-and-drop + folder upload (preserve tree)
- Formats: PDF, Excel, CSV, Word, PowerPoint, TXT, images
- **Bulk upload** with per-file progress
- **Folder tree** navigation
- **Version history** per document (re-upload creates new version)
- **OCR** for scans (Tesseract)
- **Search** within data room
- **Tags** and manual classification override

### 4.6 AI Document Processing
- Document **classification** (financial, legal, HR, tax, etc.)
- **Metadata extraction** (dates, parties, amounts)
- OCR → text extraction → **semantic chunking** → **embeddings** (Ollama)
- **Named entity recognition** (people, companies, dates, amounts)
- **Relationship extraction** → knowledge graph edges
- **Timeline event extraction**
- **Cross-document linking** (same entity across files)
- **Duplicate detection** (content hash + fuzzy match)
- **Automatic folder organization** suggestion (user can accept/reject)
- Processing status per document + project-level progress

### 4.7 Financial Intelligence Agent
- Revenue, expense, cash flow, margin analysis (from extracted tables/text)
- Anomaly detection, variance analysis
- **Financial health score** (0–100 with evidence breakdown)
- Customer concentration, vendor concentration
- Duplicate payments, invoice fraud indicators
- Simple forecasting (trend extrapolation from historical data)
- Journal entry **suggestions** (review queue, not auto-posting)
- All outputs cited to source chunks

### 4.8 Legal Intelligence Agent
- Contract analysis, clause detection
- Liability, renewal, termination, confidentiality, payment terms
- **Legal risk score** + red flag list
- Expiring contracts query support
- Lawsuit / litigation mention extraction

### 4.9 Compliance Agent
- Framework mapping: GDPR, SOX, PCI, ISO 27001, HIPAA (checklist-based gap analysis)
- Policy mapping to uploaded policies
- Gap detection with remediation recommendations
- **Audit readiness score**

### 4.10 Enterprise Risk Agent
- Categories: financial, legal, operational, vendor, customer, cyber, supply chain, market
- Per-category scores + **overall enterprise risk score**
- Risk heatmap visualization
- Findings linked to evidence

### 4.11 Fraud Detection Agent
- Invoice fraud, duplicate vendors, ghost vendor indicators
- Suspicious transactions, related-party transactions
- Conflict of interest signals, expense/payroll fraud indicators

### 4.12 Executive Decision Agent
Combines all agent outputs into:
- Executive summary, board report, investment memo
- Acquisition / vendor recommendation
- **Decision confidence** score
- Risk heatmap, priority actions

### 4.13 AI Consensus Engine
- Each agent produces independent opinion with evidence
- Engine synthesizes: agreements, conflicts, resolution rationale
- **Never black box** — show agent votes, dissent, and why final recommendation won
- Stored as `ConsensusRun` with full audit trail

### 4.14 Interactive AI Chat
- Project-scoped chat across all documents
- Example queries supported by retrieval + agents
- Streaming responses, citation chips, confidence badges
- Chat history, rename, pin

### 4.15 Executive Timeline
- Auto-extract: funding, hiring, M&A, lawsuits, leadership, revenue milestones, major contracts
- Visual vertical/horizontal timeline
- Manual event add/edit
- Source citation per event

### 4.16 Enterprise Relationship Graph
- Nodes: companies, employees, investors, customers, vendors, subsidiaries, legal cases
- Interactive force-directed graph
- Click node → related docs, chunks, risks

### 4.17 Contradiction Engine
- Cross-document fact comparison
- Inconsistency detection with severity ranking
- Explanation: which docs conflict, on what field/fact
- Resolution workflow: acknowledged, resolved, dismissed

### 4.18 Missing Information Engine
- Detect missing expected documents (e.g., no audited financials, missing tax returns)
- Missing evidence for compliance frameworks
- Auto-generate **follow-up request list** (exportable)

### 4.19 Risk Simulator
- Scenario templates: revenue −20%, customer churn, lawsuit loss, price change, custom
- MVP: single Ollama JSON reassessment from FINANCIAL+RISK baselines + RAG context (not Monte Carlo)
- Updated recommendation + delta from baseline; persist `SimulationRun` (never overwrite live AgentRuns)
- Prerequisites: completed FINANCIAL + RISK agent runs; Ollama required to simulate

### 4.20 Smart Search
- Natural language + keyword + semantic (hybrid)
- Filters: type, date, folder, tag, agent classification
- **Saved searches**
- Highlighted snippets, relevance score

### 4.21 Reports
| Report type | Format |
|-------------|--------|
| Executive PDF | PDF (local generation) |
| Board report | PDF + Markdown |
| Investment memo | Markdown + PDF |
| Audit report | PDF |
| Risk register | Excel (xlsx) + PDF |
| AI action plan | Markdown + PDF |
| PowerPoint summary | PPTX (template-based, LibreOffice or pptxgenjs) |

### 4.22 AI Action Plan
- Prioritized action items from findings + executive priorityActions (deterministic suggest; no Ollama required)
- Assignee (org member), impact estimate, priority, deadline; soft delete
- Links to source findings / documents
- Status kanban (Todo / In Progress / Done) + add-from-finding

### 4.23 History
- Past projects, comparison view (side-by-side scores)
- Full audit log (immutable) — org-wide + per-project; source-labeled feed
- Document / data-room events projected into the same History UI
- Trend analysis over time (within org) — compare projects; richer trends optional polish

### 4.24 Admin
- Users, organizations, permissions
- Audit logs, usage stats (local aggregates)
- System health: DB, Ollama (host only — never API key), disk, processing queue
- Reindex FTS / re-embed maintenance (confirmation required)
- **Status:** Slice 16 — **shipped** (live OCI worker health deferred)

### 4.25 Settings
- Profile, security, notifications preferences
- Ollama model configuration (env overrides stored settings)
- Keyboard shortcuts reference
- Dark/light theme toggle (`User.theme`; light tokens on `:root`, dark on `.dark`)
- Deferred account deletion (24h recovery) + org tombstone restore

---

## Part 5 — UX Requirements

**Feel:** Linear, Stripe, Notion, Arc, Vercel, Apple — premium, futuristic, trustworthy.

- Dark mode default for authenticated shell; full light theme via Appearance settings
- Status badges / tint chips must remain readable in both themes (use `text-tint-*` / `badge-tint-*`)
- Glassmorphism on key panels (subtle backdrop-blur)
- Minimal chrome, professional density
- Smooth Framer Motion transitions; AI "thinking" animation during agent runs
- Rounded cards, subtle shadows, generous whitespace
- Command palette, context menus, keyboard shortcuts
- Loading skeletons, progress animations, micro-interactions
- WCAG 2.2 AA, responsive, reduced-motion support

See [04-design-system.md](./04-design-system.md) and [09-page-specifications.md](./09-page-specifications.md).

---

## Part 6 — Zero-Cost Technical Constraints

| Capability | Free implementation |
|------------|---------------------|
| AI inference | Ollama (local) |
| Embeddings | Ollama `nomic-embed-text` |
| OCR | Tesseract |
| Office conversion | LibreOffice headless |
| PDF text | PDF.js |
| PDF export | @react-pdf/renderer or Puppeteer local |
| Excel export | exceljs |
| PPTX | pptxgenjs |
| Charts | Recharts |
| Graph viz | react-force-graph / custom SVG |
| Search | PostgreSQL FTS + pgvector |
| Graph data | PostgreSQL tables (Entity, EntityRelation) |
| Queue | In-process async jobs |
| Auth | Auth.js |
| Notifications | In-app DB table + polling/SSE |
| Monitoring | Admin health dashboard |

**Explicitly not in MVP:** Stripe, Auth0, OpenAI, Pinecone, Neo4j, Algolia, Datadog paid, SendGrid (optional later).

---

## Part 7 — Non-Goals (Post-MVP)

- SSO/SAML/SCIM enterprise auth
- Multi-region cloud deployment
- Billing/subscriptions
- Paid LLM fallback
- Real-time multiplayer editing
- Mobile native apps
- Marketplace / webhooks

---

## Part 8 — References

- [User Journey & Pages](./09-page-specifications.md)
- [Architecture](./01-architecture.md)
- [Data Model](./02-data-model.md)
- [AI Architecture](./05-ai-architecture.md)
- [Feature Slices](./07-feature-slices.md)
- [Acceptance Criteria](./08-acceptance-criteria.md)
