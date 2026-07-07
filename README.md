# NexusIQ-AI

**AI Enterprise Decision Intelligence Platform** — local-first, zero API cost.

Upload a company data room. Get multi-agent due diligence (Financial, Legal, Compliance, Risk, Fraud), explainable consensus, contradictions, missing docs, risk simulation, and executive reports — all with citations, powered by Ollama.

Built solo with free/open-source tools only.

## What It Does

- **Data room:** folders, bulk upload, OCR, version history
- **AI processing:** classification, NER, embeddings, knowledge graph
- **Six intelligence agents** + Executive + Consensus engine
- **Interactive chat** with mandatory citations
- **Contradiction & missing info** engines
- **Risk simulator** and prioritized action plan
- **Reports:** PDF, board memo, investment memo, Excel, PPTX
- **Timeline & relationship graph**
- **Premium dark UI** with command palette

**Experience target:** Palantir + Bloomberg + cited AI + Deloitte diligence + Stripe polish — at $0 API cost.

## Quick Start

### Prerequisites

- Node.js 20+, pnpm
- Docker (PostgreSQL) or PostgreSQL 16+
- [Ollama](https://ollama.com/) — `llama3`, `nomic-embed-text`
- Tesseract, LibreOffice

```bash
pnpm install
cp .env.example .env
docker compose up -d db
ollama pull llama3 && ollama pull nomic-embed-text
pnpm db:migrate && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

One Next.js app · One PostgreSQL (pgvector + FTS) · One Ollama · Modular monolith

See [docs/01-architecture.md](./docs/01-architecture.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [PRD.md](./PRD.md) | Master index |
| [docs/00-product-prd.md](./docs/00-product-prd.md) | Full enterprise PRD |
| [docs/09-page-specifications.md](./docs/09-page-specifications.md) | Every page spec |
| [docs/06-build-plan.md](./docs/06-build-plan.md) | Solo build plan |
| [docs/CURSOR_MASTER_PROMPT.md](./docs/CURSOR_MASTER_PROMPT.md) | Autonomous build |
| `.cursor/rules/` | Cursor rules |
| `tasks/` | Feature slices 01–16 |

## Build Order

Auth → Orgs → Workspaces → Projects+Dashboard → Data Room → Processing → Search → Chat → Agents → Consensus → Reports → Timeline+Graph → Contradictions → Simulator → Settings → Admin

## Constraints

- Solo developer, sequential slices
- Zero paid APIs (Ollama local only)
- Production SaaS quality, no placeholders

## License

Private — all rights reserved.
