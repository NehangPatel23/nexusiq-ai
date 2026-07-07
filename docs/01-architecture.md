# Architecture

**NexusIQ-AI** — Modular Monolith, Solo Zero-Cost Enterprise MVP

---

## ADR Summary

| ID | Decision | Status |
|----|----------|--------|
| ADR-001 | Modular monolith | Accepted |
| ADR-002 | Next.js owns backend | Accepted |
| ADR-003 | PostgreSQL system of record | Accepted |
| ADR-004 | Local AI only (Ollama) | Accepted |
| ADR-005 | Local filesystem storage | Accepted |
| ADR-006 | Retrieval before reasoning | Accepted |
| ADR-007 | Evidence before recommendations | Accepted |
| ADR-008 | Citations mandatory | Accepted |
| ADR-009 | Vertical slice development | Accepted |
| ADR-010 | Feature modules own all layers | Accepted |
| ADR-011 | Zero-cost MVP | Accepted |
| ADR-012 | Accessibility non-negotiable | Accepted |
| ADR-013 | Multi-agent consensus (explainable) | Accepted |

---

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   Next.js Application                     │
│  Landing │ Dashboard │ Data Room │ Intelligence │ Chat   │
│  ┌────────────────────────────────────────────────────┐  │
│  │              features/ (vertical slices)            │  │
│  │ auth│orgs│projects│data-room│documents│search│chat  │  │
│  │ agents│consensus│reports│timeline│graph│contradictions│  │
│  │ missing│simulator│actions│history│settings│admin     │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         ▼                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  lib/: prisma, auth, ai/agents, storage, export    │  │
│  └──────────────────────┬─────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
       PostgreSQL    Filesystem      Ollama
       + pgvector     ./storage/      (local)
       + FTS
```

## Intelligence Module Layout

```
lib/ai/
├── ollama-client.ts
├── embeddings.ts, retrieval.ts, chunking.ts
├── citations.ts, confidence.ts
├── processing/          # OCR, classify, NER
├── agents/
│   ├── financial.ts, legal.ts, compliance.ts
│   ├── risk.ts, fraud.ts, executive.ts
│   └── consensus.ts
├── contradictions.ts
├── missing-info.ts
└── simulator.ts
```

## User Journey Architecture

```
/ (landing) → /login → /dashboard → /projects/[id]
  → /data-room → processing → /intelligence → /chat
  → /reports → /timeline → /graph → /contradictions
  → /missing → /simulator → /actions → export
```

## Multi-Agent Flow

```
Document chunks in PostgreSQL
    ↓
User triggers "Full Analysis"
    ↓
Sequential agent runs (Financial → Legal → Compliance → Risk → Fraud)
    ↓
Each → AgentRun record + Finding records + citations
    ↓
Consensus engine synthesizes (preserves dissent)
    ↓
ConsensusRun → UI shows opinions + final recommendation
```

## Export Pipeline (Local)

| Format | Library |
|--------|---------|
| PDF | @react-pdf/renderer |
| Excel | exceljs |
| PPTX | pptxgenjs |
| Markdown | native |

## What We Do Not Build

Microservices, Redis/BullMQ, Neo4j, OpenSearch, cloud AI APIs, Stripe, Auth0.

See [05-ai-architecture.md](./05-ai-architecture.md) for agent details.
