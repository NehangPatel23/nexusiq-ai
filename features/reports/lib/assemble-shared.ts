import type { FindingSeverity } from "@prisma/client";

import type { FindingItem } from "@/features/intelligence/lib/agent-runs";
import type { ChatCitation } from "@/lib/ai/citations";

import type { IntelligenceContext } from "./context";

export const INSUFFICIENT_CONTEXT_HEADING = "## Insufficient intelligence context";

export type RiskRegisterRow = {
  severity: FindingSeverity | "UNKNOWN";
  category: string;
  agent: string;
  title: string;
  description: string;
  citation: string;
  status: string;
  /** 1-based index into the report citations list when mapped. */
  citationIndex: number | null;
  documentId: string | null;
  chunkId: string | null;
  score: number | null;
  remediation: string;
  findingId?: string;
};

export type ActionPlanItem = {
  id: string;
  priority: string;
  action: string;
  detail: string;
  source: string;
  severity: FindingSeverity | "UNKNOWN" | "n/a";
  citationIndex: number | null;
  documentId: string | null;
  chunkId: string | null;
  remediation: string;
  category?: string;
};

export function humanizeLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";

  const agentLabels: Record<string, string> = {
    FINANCIAL: "Financial",
    LEGAL: "Legal",
    COMPLIANCE: "Compliance",
    RISK: "Risk",
    FRAUD: "Fraud",
    EXECUTIVE: "Executive",
  };
  const agent = agentLabels[trimmed.toUpperCase()];
  if (agent) return agent;

  const statusLabels: Record<string, string> = {
    OPEN: "Open",
    ACKNOWLEDGED: "Acknowledged",
    MITIGATED: "Mitigated",
    ACCEPTED: "Accepted",
    CLOSED: "Closed",
  };
  const status = statusLabels[trimmed.toUpperCase()];
  if (status) return status;

  const keepUpper = new Set([
    "GDPR",
    "SOX",
    "PCI",
    "DSS",
    "ISO",
    "HIPAA",
    "AML",
    "KYC",
    "ESG",
    "PCI-DSS",
  ]);
  if (keepUpper.has(trimmed.toUpperCase()) || keepUpper.has(trimmed.replace(/\s+/g, "-").toUpperCase())) {
    return trimmed
      .split(/[_/\s-]+/)
      .filter(Boolean)
      .map((part) => part.toUpperCase())
      .join("-");
  }

  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(titleCaseWord)
    .join(" ");
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  if (/^(gdpr|sox|pci|dss|iso|hipaa|aml|kyc|esg)$/i.test(word)) {
    return word.toUpperCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatCitationsSection(citations: ChatCitation[]): string {
  if (citations.length === 0) {
    return "## Citations\n\nNo source citations were available for this report.";
  }

  const lines = citations.map((citation, index) => {
    const label = citation.documentName || citation.documentId;
    const excerpt = citation.excerpt ? ` — "${citation.excerpt.slice(0, 160)}"` : "";
    return `${index + 1}. [${label}] (doc:${citation.documentId}, chunk:${citation.chunkId})${excerpt}`;
  });

  return `## Citations\n\n${lines.join("\n")}`;
}

export function insufficientContextSection(missing: string[]): string {
  const bullets =
    missing.length > 0
      ? missing.map((item) => `- ${item}`).join("\n")
      : "- No completed agent or consensus runs were available.";
  return [
    INSUFFICIENT_CONTEXT_HEADING,
    "",
    "This report was assembled from whatever intelligence was available. Missing inputs were not invented.",
    "",
    bullets,
    "",
    "Run specialist agents, consensus, and the executive package on the Intelligence tab to improve coverage.",
  ].join("\n");
}

export function resolveCitationIndex(
  documentId: string | null | undefined,
  chunkId: string | null | undefined,
  citations: ChatCitation[],
): number | null {
  if (!documentId) return null;
  const exact = citations.findIndex(
    (citation) => citation.documentId === documentId && citation.chunkId === chunkId,
  );
  if (exact >= 0) return exact + 1;
  const byDoc = citations.findIndex((citation) => citation.documentId === documentId);
  return byDoc >= 0 ? byDoc + 1 : null;
}

export function citationLabel(
  documentId: string | null | undefined,
  chunkId: string | null | undefined,
  citations: ChatCitation[],
): { label: string; index: number | null } {
  const index = resolveCitationIndex(documentId, chunkId, citations);
  if (index != null) {
    const citation = citations[index - 1]!;
    return {
      index,
      label: `[${index}] ${citation.documentName || citation.documentId}`,
    };
  }
  if (documentId && chunkId) {
    return { index: null, label: `doc:${documentId} / chunk:${chunkId}` };
  }
  if (documentId) {
    return { index: null, label: `doc:${documentId}` };
  }
  return { index: null, label: "—" };
}

export function remediationForFinding(finding: FindingItem): string {
  const meta = finding.metadata;
  const fromMeta =
    meta && typeof meta.remediation === "string" && meta.remediation.trim()
      ? meta.remediation.trim()
      : null;
  if (fromMeta) return fromMeta;

  const severity = finding.severity ?? "UNKNOWN";
  const urgency =
    severity === "CRITICAL" || severity === "HIGH"
      ? "Prioritize within this diligence cycle."
      : severity === "MEDIUM"
        ? "Schedule before close / next board review."
        : "Track as a watch item.";

  return [
    urgency,
    "Confirm the cited evidence in the data room and assign an owner with a due date.",
    "Document remediation (control, contract change, or policy update) and attach proof.",
    "Update finding status to Mitigated, Accepted, or Closed when residual risk is agreed.",
  ].join(" ");
}

export function buildRiskRegisterRows(
  findings: FindingItem[],
  citations: ChatCitation[] = [],
): RiskRegisterRow[] {
  return findings.map((finding) => {
    const cite = citationLabel(finding.documentId, finding.sourceChunkId, citations);
    return {
      severity: finding.severity ?? "UNKNOWN",
      category: humanizeLabel(finding.category),
      agent: humanizeLabel(finding.agentType),
      title: finding.title,
      description: finding.description,
      citation: cite.label,
      citationIndex: cite.index,
      documentId: finding.documentId,
      chunkId: finding.sourceChunkId,
      status: humanizeLabel(finding.status),
      score: finding.score,
      remediation: remediationForFinding(finding),
      findingId: finding.id,
    };
  });
}

export function buildActionPlanItems(
  findings: FindingItem[],
  priorityActions: string[],
  citations: ChatCitation[] = [],
): ActionPlanItem[] {
  const items: ActionPlanItem[] = [];

  priorityActions.forEach((action, index) => {
    items.push({
      id: `p-${index + 1}`,
      priority: `P${index + 1}`,
      action: action.trim(),
      detail: "Executive priority action from the latest executive package.",
      source: "Executive",
      severity: index === 0 ? "HIGH" : "MEDIUM",
      citationIndex: null,
      documentId: null,
      chunkId: null,
      remediation:
        "Assign an owner, set a target date, confirm evidence in the data room, and mark complete when the diligence condition is cleared.",
    });
  });

  const ranked = findings.filter(
    (finding) =>
      finding.severity === "CRITICAL" ||
      finding.severity === "HIGH" ||
      finding.severity === "MEDIUM",
  );

  ranked.slice(0, 25).forEach((finding, index) => {
    const cite = citationLabel(finding.documentId, finding.sourceChunkId, citations);
    items.push({
      id: finding.id || `f-${index + 1}`,
      priority: `F${index + 1}`,
      action: finding.title,
      detail: finding.description,
      source: humanizeLabel(finding.agentType),
      severity: finding.severity ?? "UNKNOWN",
      citationIndex: cite.index,
      documentId: finding.documentId,
      chunkId: finding.sourceChunkId,
      remediation: remediationForFinding(finding),
      category: humanizeLabel(finding.category),
    });
  });

  return items;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/\r/g, "");
}

export function riskRegisterMarkdown(rows: RiskRegisterRow[], projectName: string): string {
  const criticalHigh = rows.filter(
    (row) => row.severity === "CRITICAL" || row.severity === "HIGH",
  ).length;

  const header = [
    `# Risk Register — ${projectName}`,
    "",
    "## Overview",
    "",
      `- Open findings: ${rows.length}`,
      `- Critical / high: ${criticalHigh}`,
      `- How to use: Review severity, evidence, and close-out steps. Link each item to an owner before board review.`,
    "",
  ];

  if (rows.length === 0) {
    return [
      ...header,
      "## Findings",
      "",
      "No open findings were available to tabulate.",
      "",
      "### Compact table",
      "",
      "| Severity | Category | Agent | Title | Citation | Status |",
      "| --- | --- | --- | --- | --- | --- |",
      "| — | — | — | No open findings | — | — |",
    ].join("\n");
  }

  const body = rows.map((row, index) => {
    const lines = [
      `### ${index + 1}. ${escapeCell(row.title)}`,
      "",
      `- Severity: ${row.severity}`,
      `- Category: ${escapeCell(row.category)}`,
      `- Agent: ${escapeCell(row.agent)}`,
      `- Status: ${escapeCell(row.status)}`,
    ];
    if (row.score != null) lines.push(`- Score: ${row.score}`);
    lines.push(`- Citation: ${escapeCell(row.citation)}`);
    lines.push("");
    lines.push("#### Context");
    lines.push("");
    lines.push(escapeCell(row.description) || "_No additional description was stored for this finding._");
    lines.push("");
    lines.push("#### How to close");
    lines.push("");
    lines.push(escapeCell(row.remediation));
    return lines.join("\n");
  });

  const compact = [
    "## Compact table",
    "",
    "| Severity | Category | Agent | Title | Citation | Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.severity} | ${escapeCell(row.category)} | ${escapeCell(row.agent)} | ${escapeCell(row.title)} | ${escapeCell(row.citation)} | ${escapeCell(row.status)} |`,
    ),
  ];

  return [...header, "## Findings", "", ...body, "", ...compact].join("\n");
}

export function actionPlanMarkdown(items: ActionPlanItem[], projectName: string): string {
  const header = [
    `# Action Plan — ${projectName}`,
    "",
    "## Overview",
    "",
    "Prioritized next steps from executive actions and open diligence findings. Each item includes context and suggested close-out guidance.",
    "",
  ];

  if (items.length === 0) {
    return [
      ...header,
      "## Actions",
      "",
      "No prioritized actions were available.",
      "",
      "### Compact table",
      "",
      "| Priority | Action | Source | Severity |",
      "| --- | --- | --- | --- |",
      "| — | No prioritized actions available | — | — |",
    ].join("\n");
  }

  const cards = items.map((item) => {
    const lines = [
      `### ${item.priority}. ${escapeCell(item.action)}`,
      "",
      `- Source: ${escapeCell(item.source)}`,
      `- Severity: ${item.severity}`,
    ];
    if (item.category) lines.push(`- Category: ${escapeCell(item.category)}`);
    if (item.citationIndex != null) {
      lines.push(`- Citation: [${item.citationIndex}]`);
    }
    lines.push("");
    lines.push("#### Context");
    lines.push("");
    lines.push(escapeCell(item.detail) || "_No additional detail._");
    lines.push("");
    lines.push("#### How to close");
    lines.push("");
    lines.push(escapeCell(item.remediation));
    return lines.join("\n");
  });

  const compact = [
    "## Compact table",
    "",
    "| Priority | Action | Source | Severity |",
    "| --- | --- | --- | --- |",
    ...items.map(
      (item) =>
        `| ${item.priority} | ${escapeCell(item.action)} | ${escapeCell(item.source)} | ${item.severity} |`,
    ),
  ];

  return [...header, "## Actions", "", ...cards, "", ...compact].join("\n");
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function missingContextFlags(ctx: IntelligenceContext): string[] {
  const missing: string[] = [];
  if (!ctx.agentRuns.FINANCIAL) missing.push("Financial agent run");
  if (!ctx.agentRuns.LEGAL) missing.push("Legal agent run");
  if (!ctx.agentRuns.COMPLIANCE) missing.push("Compliance agent run");
  if (!ctx.agentRuns.RISK) missing.push("Risk agent run");
  if (!ctx.agentRuns.FRAUD) missing.push("Fraud agent run");
  if (!ctx.agentRuns.EXECUTIVE) missing.push("Executive agent run");
  if (!ctx.consensus) missing.push("Consensus run");
  if (ctx.findings.length === 0) missing.push("Open findings");
  return missing;
}
