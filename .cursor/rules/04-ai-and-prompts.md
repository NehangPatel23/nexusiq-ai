# AI and Prompts Rules

## Runtime

- **Ollama only** — local inference and embeddings, no paid APIs
- Models configurable via settings: `llama3`, `nomic-embed-text`
- Run agents sequentially if GPU RAM limited (solo dev)

## Retrieval-First Pipeline

```
Query → Embed → Hybrid search (pgvector + FTS) → Context → Ollama → Citations → Confidence
```

Never reason before retrieval.

## Response Structure

1. Evidence → 2. Facts → 3. Analysis → 4. Confidence → 5. Recommendation

## Agent Modules (`lib/ai/agents/`)

| Agent | Focus |
|-------|-------|
| Financial | Revenue, margins, anomalies, concentration, fraud indicators |
| Legal | Contracts, clauses, liabilities, red flags |
| Compliance | GDPR, SOX, PCI, ISO, HIPAA gaps |
| Risk | Enterprise risk score, category heatmap |
| Fraud | Invoice, vendor, transaction fraud signals |
| Executive | Summaries, memos, recommendations |
| **Consensus** | Multi-agent synthesis — never black box |

Plus engines: `contradictions.ts`, `missing-info.ts`, `simulator.ts`

## Consensus Rules

- Preserve each agent's opinion verbatim in output
- Show agreements, conflicts, resolution rationale
- Final recommendation requires evidence from agent outputs
- Store full audit trail in `ConsensusRun`

## Citations

Format: `[doc:{documentId}:chunk:{chunkId}]`  
Every factual claim must cite. Insufficient evidence is valid output.

## Prompts

Live in `prompts/` — see `financial.md`, `legal.md`, `compliance.md`, `fraud.md`, `executive.md`, `consensus.md`, etc.

No giant inline prompts in route handlers.

## Never

- Paid LLM APIs in MVP
- Black-box recommendations
- Remove citations or confidence
- Fabricate document references
