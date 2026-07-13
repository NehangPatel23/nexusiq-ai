import type { AgentType, ConfidenceLevel, FindingSeverity } from "@prisma/client";

import type { SearchResultItem } from "@/features/search/lib/types";
import type { ChatCitation } from "@/lib/ai/citations";

import type {
  AgentOutputByType,
  ComplianceAgentOutput,
  FinancialAgentOutput,
  FraudAgentOutput,
  LegalAgentOutput,
  NormalizedFinding,
  RiskAgentOutput,
} from "./types";

function parseSeverity(value: unknown): FindingSeverity | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") {
    return upper;
  }
  return undefined;
}

function findingFromItem(input: {
  category: string;
  title: string;
  description: string;
  severity?: FindingSeverity;
  sourceChunkId?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
}): NormalizedFinding {
  return {
    category: input.category,
    title: input.title,
    description: input.description,
    severity: input.severity,
    sourceChunkId: input.sourceChunkId,
    documentId: input.documentId,
    metadata: input.metadata,
  };
}

export function normalizeFinancialFindings(output: FinancialAgentOutput): NormalizedFinding[] {
  const findings: NormalizedFinding[] = [];

  for (const item of output.anomalies ?? []) {
    findings.push(
      findingFromItem({
        category: "Anomaly",
        title: item.title,
        description: item.description,
        severity: parseSeverity(item.severity),
        sourceChunkId: item.sourceChunkId,
        documentId: item.documentId,
      }),
    );
  }

  for (const item of output.duplicatePayments ?? []) {
    findings.push(
      findingFromItem({
        category: "Duplicate payment",
        title: "Duplicate payment detected",
        description: item.description,
        severity: "HIGH",
        sourceChunkId: item.sourceChunkId,
        metadata: { amount: item.amount },
      }),
    );
  }

  for (const item of output.invoiceFraudIndicators ?? []) {
    findings.push(
      findingFromItem({
        category: "Invoice fraud",
        title: "Invoice fraud indicator",
        description: item.description,
        severity: parseSeverity(item.severity) ?? "MEDIUM",
        sourceChunkId: item.sourceChunkId,
      }),
    );
  }

  for (const item of output.varianceAnalysis ?? []) {
    findings.push(
      findingFromItem({
        category: "Variance",
        title: item.metric,
        description: `Expected ${item.expected ?? "—"} vs actual ${item.actual ?? "—"}`,
        severity: "MEDIUM",
        sourceChunkId: item.sourceChunkId,
        metadata: { expected: item.expected, actual: item.actual },
      }),
    );
  }

  return findings;
}

export function normalizeLegalFindings(output: LegalAgentOutput): NormalizedFinding[] {
  const findings: NormalizedFinding[] = [];

  for (const item of output.redFlags ?? []) {
    findings.push(
      findingFromItem({
        category: "Red flag",
        title: item.title,
        description: item.description,
        severity: parseSeverity(item.severity) ?? "HIGH",
        sourceChunkId: item.sourceChunkId,
      }),
    );
  }

  for (const item of output.expiringContracts ?? []) {
    findings.push(
      findingFromItem({
        category: "Expiring contract",
        title: item.name,
        description: `Expires ${item.expiryDate ?? "on unknown date"}`,
        severity: "MEDIUM",
        sourceChunkId: item.sourceChunkId,
      }),
    );
  }

  for (const item of output.litigation ?? []) {
    findings.push(
      findingFromItem({
        category: "Litigation",
        title: "Litigation matter",
        description: item.description,
        severity: "HIGH",
        sourceChunkId: item.sourceChunkId,
      }),
    );
  }

  return findings;
}

export function normalizeComplianceFindings(output: ComplianceAgentOutput): NormalizedFinding[] {
  const findings: NormalizedFinding[] = [];

  for (const gap of output.frameworkGaps ?? []) {
    if (gap.status === "met") continue;
    findings.push(
      findingFromItem({
        category: gap.framework,
        title: gap.requirement,
        description: gap.evidence?.trim() || gap.remediation || "No supporting evidence in data room.",
        severity: gap.status === "missing" ? "HIGH" : "MEDIUM",
        sourceChunkId: gap.sourceChunkId ?? undefined,
        metadata: { status: gap.status, remediation: gap.remediation },
      }),
    );
  }

  return findings;
}

export function normalizeRiskFindings(output: RiskAgentOutput): NormalizedFinding[] {
  return (output.findings ?? []).map((item) =>
    findingFromItem({
      category: item.category,
      title: item.title,
      description: item.description,
      severity: parseSeverity(item.severity) ?? "MEDIUM",
      sourceChunkId: item.sourceChunkId,
      documentId: item.documentId,
    }),
  );
}

export function normalizeFraudFindings(output: FraudAgentOutput): NormalizedFinding[] {
  return (output.indicators ?? []).map((item) =>
    findingFromItem({
      category: item.type,
      title: item.title,
      description: item.description,
      severity: parseSeverity(item.severity) ?? "MEDIUM",
      sourceChunkId: item.sourceChunkId,
      documentId: item.documentId,
    }),
  );
}

const NORMALIZERS: {
  [K in AgentType]: (output: AgentOutputByType[K]) => NormalizedFinding[];
} = {
  FINANCIAL: normalizeFinancialFindings,
  LEGAL: normalizeLegalFindings,
  COMPLIANCE: normalizeComplianceFindings,
  RISK: normalizeRiskFindings,
  FRAUD: normalizeFraudFindings,
};

export function normalizeAgentFindings<T extends AgentType>(
  agentType: T,
  output: AgentOutputByType[T],
): NormalizedFinding[] {
  return NORMALIZERS[agentType](output);
}

export function extractCitationsFromOutput(
  output: Record<string, unknown>,
  retrievedChunks: SearchResultItem[],
): ChatCitation[] {
  const chunksById = new Map(retrievedChunks.map((chunk) => [chunk.chunkId, chunk]));
  const citations = new Map<string, ChatCitation>();

  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    const record = value as Record<string, unknown>;
    const chunkId = typeof record.sourceChunkId === "string" ? record.sourceChunkId : null;
    if (chunkId) {
      const chunk = chunksById.get(chunkId);
      if (chunk) {
        const key = `${chunk.documentId}:${chunk.chunkId}`;
        if (!citations.has(key)) {
          citations.set(key, {
            documentId: chunk.documentId,
            chunkId: chunk.chunkId,
            documentName: chunk.documentName,
            excerpt: chunk.content.length > 280 ? `${chunk.content.slice(0, 280)}…` : chunk.content,
          });
        }
      }
    }

    for (const nested of Object.values(record)) {
      visit(nested);
    }
  }

  visit(output);
  return Array.from(citations.values());
}

export function parseAgentConfidence(
  output: { confidence?: ConfidenceLevel },
  citations: ChatCitation[],
  retrievalCount: number,
): ConfidenceLevel {
  if (retrievalCount === 0) return "INSUFFICIENT";
  const modelConfidence = output.confidence;
  if (modelConfidence === "INSUFFICIENT" || citations.length === 0) {
    return citations.length >= 2 ? "LOW" : "INSUFFICIENT";
  }
  return modelConfidence ?? "MEDIUM";
}

export const INSUFFICIENT_AGENT_RECOMMENDATION =
  "Insufficient evidence in the data room to run this agent scan. Upload and process supporting documents, then try again.";
