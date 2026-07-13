import type { AgentType, ConfidenceLevel, FindingSeverity } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";

export type CitationRef = ChatCitation;

export type AgentOutputBase = {
  recommendation: string;
  confidence: ConfidenceLevel;
};

export type FinancialAgentOutput = AgentOutputBase & {
  financialHealthScore: number;
  revenueAnalysis?: string;
  expenseAnalysis?: string;
  cashFlowAnalysis?: string;
  marginAnalysis?: string;
  anomalies?: Array<{
    title: string;
    description: string;
    severity?: FindingSeverity;
    sourceChunkId?: string;
    documentId?: string;
  }>;
  customerConcentration?: { topCustomers?: unknown[]; maxConcentrationPct?: number };
  vendorConcentration?: { topVendors?: unknown[]; maxConcentrationPct?: number };
  duplicatePayments?: Array<{ description: string; amount?: number; sourceChunkId?: string }>;
  invoiceFraudIndicators?: Array<{
    description: string;
    severity?: FindingSeverity;
    sourceChunkId?: string;
  }>;
  varianceAnalysis?: Array<{
    metric: string;
    expected?: string;
    actual?: string;
    sourceChunkId?: string;
  }>;
};

export type LegalAgentOutput = AgentOutputBase & {
  legalRiskScore: number;
  contracts?: Array<{
    name: string;
    parties?: string;
    effectiveDate?: string;
    sourceChunkId?: string;
    documentId?: string;
  }>;
  clauses?: Record<string, Array<{ summary: string; sourceChunkId?: string }>>;
  redFlags?: Array<{
    title: string;
    description: string;
    severity?: FindingSeverity;
    sourceChunkId?: string;
  }>;
  expiringContracts?: Array<{ name: string; expiryDate?: string; sourceChunkId?: string }>;
  litigation?: Array<{ description: string; sourceChunkId?: string }>;
};

export type ComplianceAgentOutput = AgentOutputBase & {
  auditReadinessScore: number;
  frameworkGaps?: Array<{
    framework: string;
    requirement: string;
    status: "met" | "partial" | "missing";
    evidence?: string;
    sourceChunkId?: string | null;
    remediation?: string;
  }>;
  policyMappings?: Array<{ policy: string; documentId?: string; coverage?: string }>;
};

export type RiskAgentOutput = AgentOutputBase & {
  enterpriseRiskScore: number;
  categoryScores?: Record<string, number>;
  findings?: Array<{
    category: string;
    title: string;
    description: string;
    severity: FindingSeverity;
    sourceChunkId?: string;
    documentId?: string;
  }>;
  riskHeatmap?: Array<{ category: string; severity: FindingSeverity; count: number }>;
};

export type FraudAgentOutput = AgentOutputBase & {
  fraudRiskScore: number;
  indicators?: Array<{
    type: string;
    title: string;
    description: string;
    severity: FindingSeverity;
    sourceChunkId?: string;
    documentId?: string;
  }>;
};

export type ExecutiveAgentOutput = AgentOutputBase & {
  executiveSummary: string;
  boardReport?: string;
  investmentMemo?: string;
  markdown: string;
  acquisitionRecommendation?: string;
  priorityActions?: string[];
  specialistRunIds?: string[];
  specialistContext?: Array<{
    agentType: SpecialistAgentType;
    runId: string;
    score: number | null;
    confidence: ConfidenceLevel;
    recommendation: string;
  }>;
};

export type AgentOutputByType = {
  FINANCIAL: FinancialAgentOutput;
  LEGAL: LegalAgentOutput;
  COMPLIANCE: ComplianceAgentOutput;
  RISK: RiskAgentOutput;
  FRAUD: FraudAgentOutput;
  EXECUTIVE: ExecutiveAgentOutput;
};

export type NormalizedFinding = {
  category: string;
  title: string;
  description: string;
  severity?: FindingSeverity;
  score?: number;
  sourceChunkId?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRunResult<T extends AgentType = AgentType> = {
  agentType: T;
  output: AgentOutputByType[T];
  score: number | null;
  confidence: ConfidenceLevel;
  citations: CitationRef[];
  findings: NormalizedFinding[];
};

export const SPECIALIST_AGENT_TYPES = [
  "FINANCIAL",
  "LEGAL",
  "COMPLIANCE",
  "RISK",
  "FRAUD",
] as const satisfies readonly AgentType[];

export type SpecialistAgentType = (typeof SPECIALIST_AGENT_TYPES)[number];

/** Specialist scans only — Executive is a separate package tab. */
export const INTELLIGENCE_AGENT_TYPES = SPECIALIST_AGENT_TYPES;

export const AGENT_SCORE_FIELDS: Record<Exclude<AgentType, "EXECUTIVE">, string> = {
  FINANCIAL: "financialHealthScore",
  LEGAL: "legalRiskScore",
  COMPLIANCE: "auditReadinessScore",
  RISK: "enterpriseRiskScore",
  FRAUD: "fraudRiskScore",
};

export const AGENT_PROMPT_FILES: Record<AgentType, string> = {
  FINANCIAL: "financial.md",
  LEGAL: "legal.md",
  COMPLIANCE: "compliance.md",
  RISK: "risk.md",
  FRAUD: "fraud.md",
  EXECUTIVE: "executive.md",
};

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  FINANCIAL: "Financial",
  LEGAL: "Legal",
  COMPLIANCE: "Compliance",
  RISK: "Risk",
  FRAUD: "Fraud",
  EXECUTIVE: "Executive",
};
