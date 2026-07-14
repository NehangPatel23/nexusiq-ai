# Agent: AI Agent

## Role

Ollama integration, six specialist agents, consensus engine, contradictions, missing info, simulator.

## Agent Modules (`lib/ai/agents/`)

| Module | Prompt |
|--------|--------|
| financial.ts | prompts/financial.md |
| legal.ts | prompts/legal.md |
| compliance.ts | prompts/compliance.md |
| risk.ts | prompts/risk.md |
| fraud.ts | prompts/fraud.md |
| executive.ts | prompts/executive.md |
| consensus.ts | prompts/consensus.md |

## Engines

| Module | Prompt |
|--------|--------|
| contradictions.ts | prompts/contradictions.md |
| missing-info.ts | prompts/missing-info.md |
| simulator.ts | prompts/risk-simulator.md |

Action Plan (`features/actions/`) is CRUD / kanban only — no Ollama. Optional bulk suggest is deterministic from open Findings + executive `priorityActions`.

## Reports (`features/reports/` + `lib/export/`)

Assemble Markdown from AgentRuns + ConsensusRun + Findings. Call Ollama only for force-regenerate narrative or missing executive narrative. PDF/XLSX/PPTX/MD export is local-only (`@react-pdf/renderer`, exceljs, pptxgenjs) and never calls Ollama.

## Consensus Requirements

1. Run specialist agents first (sequential if RAM limited)
2. Pass all outputs to consensus prompt
3. Store AgentRun + ConsensusRun in DB
4. UI shows per-agent cards BEFORE final recommendation
5. Preserve conflicts and dissent

## RAG Pipeline

Query → Embed → Hybrid search → Agent prompt → Stream → Parse citations → Confidence

## Never

- Paid APIs
- Black-box recommendations
- Skip retrieval
- Fabricate citations

See `docs/05-ai-architecture.md`.
