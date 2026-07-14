# AI Architecture

Local-first multi-agent intelligence with Ollama. Retrieval before reasoning. Consensus is explainable.

---

## Agent Registry

| Agent | Module | Responsibility |
|-------|--------|----------------|
| Financial | `agents/financial.ts` | Revenue, expenses, margins, anomalies, concentration, fraud indicators |
| Legal | `agents/legal.ts` | Contracts, clauses, liabilities, renewals, red flags |
| Compliance | `agents/compliance.ts` | GDPR, SOX, PCI, ISO, HIPAA gap analysis |
| Risk | `agents/risk.ts` | Enterprise risk categories + overall score |
| Fraud | `agents/fraud.ts` | Invoice, vendor, transaction, COI fraud signals |
| Executive | `agents/executive.ts` | Synthesis, memos, board reports, recommendations |
| **Consensus** | `agents/consensus.ts` | Multi-agent debate + explainable final recommendation |

All agents are **code modules + prompt templates**, not microservices.

---

## Consensus Engine Flow

```
1. Trigger: user runs "Full Analysis" or Consensus tab
2. Parallel agent runs (in-process, sequential if Ollama RAM limited):
   Financial → Legal → Compliance → Risk → Fraud
3. Each agent returns:
   {
     agentId, score, recommendation, findings[], citations[], confidence
   }
4. Consensus engine prompt receives all agent outputs
5. LLM identifies: agreements, conflicts, dissent, resolution
6. Output:
   {
     finalRecommendation,
     decisionConfidence,
     agentOpinions[],        // preserved verbatim
     agreements[],
     conflicts[],
     resolutionRationale,    // WHY this recommendation
     citations[]
   }
7. Store ConsensusRun + link findings
```

**Never black box:** UI always shows per-agent opinions before final synthesis.

---

## Per-Agent Outputs

### Financial Agent
- `financialHealthScore` (0–100)
- `revenueAnalysis`, `expenseAnalysis`, `cashFlowAnalysis`, `marginAnalysis`
- `anomalies[]`, `customerConcentration`, `vendorConcentration`
- `duplicatePayments[]`, `invoiceFraudIndicators[]`
- `forecast` (simple trend), `varianceAnalysis[]`
- `journalEntrySuggestions[]` (review queue)

### Legal Agent
- `legalRiskScore` (0–100)
- `contracts[]` with clause breakdown
- `clauses`: liability, renewal, termination, confidentiality, payment
- `redFlags[]`, `expiringContracts[]`

### Compliance Agent
- `auditReadinessScore` (0–100)
- `frameworkGaps[]` per framework (GDPR, SOX, PCI, ISO, HIPAA)
- `policyMappings[]`, `remediationRecommendations[]`

### Risk Agent
- `enterpriseRiskScore` (0–100)
- `categoryScores`: financial, legal, operational, vendor, customer, cyber, supplyChain, market
- `riskHeatmap` data, `findings[]`

### Fraud Agent
- `fraudRiskScore` (0–100)
- `indicators[]`: invoice, duplicateVendor, ghostVendor, suspiciousTxn, relatedParty, expense, payroll

### Executive Agent
- `executiveSummary`, `boardReport`, `investmentMemo`
- `acquisitionRecommendation` | `vendorRecommendation`
- `decisionConfidence`, `riskHeatmap`, `priorityActions[]`

---

## Document Processing Pipeline

```
Upload → Classify → Extract text (PDF.js/LibreOffice/Tesseract)
    → Extract metadata → NER → Relationship extraction
    → Chunk (semantic) → Embed (Ollama) → Index FTS + vector
    → Timeline events → Duplicate check → Auto-folder suggestion
    → Cross-doc entity linking
```

### Classification Labels
`financial`, `legal`, `tax`, `hr`, `operational`, `compliance`, `contract`, `correspondence`, `other`

### Contradiction Engine
1. Retrieve hybrid chunks across project documents
2. Mine structured facts (dates, amounts, parties, metrics) and ask Ollama for inconsistencies
3. Validate ownership + **require both values to appear in retrieved chunk text** (remap chunk IDs when needed; drop unmatched citations)
4. Rank by severity; store `Contradiction` with both source chunks
5. Support resolution notes, promote-to-finding, and CRITICAL `RISK_FOUND` notifications

### Missing Information Engine
1. Load expected document checklist by project type (M&A, Vendor DD, Audit, …) including `expectedFolderPath`
2. Match uploaded classifications / name hints against checklist
3. Optionally pull compliance framework gaps from latest Compliance agent run
4. Generate `MissingItem` records + follow-up request text (optional Ollama polish)
5. Export follow-ups as markdown/CSV; deep-link uploads into expected folders

### Risk Simulator
1. Load baseline agent scores
2. Apply user scenario parameters (structured JSON)
3. Re-run Financial + Risk agents with scenario context injected
4. Compute delta vs baseline
5. Store `SimulationRun`

---

## RAG Pipeline (Chat + Agents)

```
Query → Embed → Hybrid search (top-k chunks, project scoped)
    → Optional: agent-specific retrieval filters
    → Assemble context window
    → Agent system prompt + context
    → Ollama stream
    → Parse citations [doc:id:chunk:id]
    → Validate claims
    → Confidence score
```

## Hallucination Prevention

1. Retrieve before generate (mandatory)
2. System prompt: "Answer ONLY from context"
3. Post-parse citation validation
4. Strip uncited factual sentences or downgrade confidence
5. `INSUFFICIENT` when no relevant chunks

## Memory

- **Short-term:** chat message history (last N turns in prompt)
- **Long-term:** all chunks in PostgreSQL (no separate memory DB)
- **Agent runs:** persisted `AgentRun` with inputs, outputs, citations

## Evaluation (Manual QA)

- Sample data room with known risks → verify agent recall
- Citation spot-check: 10 random claims → trace to chunk
- Consensus: verify dissent is preserved when agents disagree

## Ollama Configuration

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
```

Solo dev note: run agents sequentially if GPU RAM limited.

## Prompt Files

See `prompts/` directory — one file per agent plus `consensus.md`, `contradictions.md`, `missing-info.md`, `risk-simulator.md`.
