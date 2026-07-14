import type {
  AgentType,
  ConfidenceLevel,
  FindingSeverity,
  RiskStatus,
} from "@prisma/client";

import {
  EMPTY_SEVERITY_COUNTS,
  type FindingSeverityCounts,
  totalFindingCount,
} from "@/features/intelligence/lib/severity-summary";
import type { RiskAgentOutput } from "@/lib/ai/agents/types";
import { prisma } from "@/lib/db";

export type RiskFindingRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: FindingSeverity | null;
  status: RiskStatus;
  agentType: AgentType;
  score: number | null;
  documentId: string | null;
  sourceChunkId: string | null;
  createdAt: string;
};

export type RisksSummary = {
  enterpriseRiskScore: number | null;
  scoreSource: "risk_agent" | "composite" | "none";
  severityCounts: FindingSeverityCounts;
  categoryBreakdown: Array<{ category: string; count: number }>;
  categoryScores: Record<string, number> | null;
  findings: RiskFindingRow[];
  openFindingCount: number;
  contradictionOpenCount: number;
  missingOpenCount: number;
  consensus: {
    decisionConfidence: ConfidenceLevel;
    finalRecommendation: string;
    createdAt: string;
  } | null;
  hasAgentRuns: boolean;
};

const COMPOSITE_WEIGHTS: Record<FindingSeverity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
};

/**
 * Composite enterprise risk from open finding severities (0–100).
 * More/higher-severity findings → higher risk score.
 */
export function compositeRiskScoreFromSeverities(counts: FindingSeverityCounts): number {
  const weighted =
    counts.critical * COMPOSITE_WEIGHTS.CRITICAL +
    counts.high * COMPOSITE_WEIGHTS.HIGH +
    counts.medium * COMPOSITE_WEIGHTS.MEDIUM +
    counts.low * COMPOSITE_WEIGHTS.LOW;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

async function latestCompletedRunIds(projectId: string): Promise<string[]> {
  const runs = await prisma.agentRun.findMany({
    where: { projectId, status: "COMPLETED" },
    select: { id: true, agentType: true },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
  });
  const latest = new Map<string, string>();
  for (const run of runs) {
    if (!latest.has(run.agentType)) latest.set(run.agentType, run.id);
  }
  return [...latest.values()];
}

export async function getProjectRisksSummary(projectId: string): Promise<RisksSummary> {
  const runIds = await latestCompletedRunIds(projectId);
  const hasAgentRuns = runIds.length > 0;

  const [riskRun, consensus, findings, contradictionOpenCount, missingOpenCount] = await Promise.all([
    prisma.agentRun.findFirst({
      where: { projectId, agentType: "RISK", status: "COMPLETED" },
      orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
      select: { score: true, output: true },
    }),
    prisma.consensusRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        decisionConfidence: true,
        finalRecommendation: true,
        createdAt: true,
      },
    }),
    runIds.length === 0
      ? Promise.resolve([])
      : prisma.finding.findMany({
          where: {
            projectId,
            agentRunId: { in: runIds },
            status: { in: ["OPEN", "ACKNOWLEDGED"] },
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            severity: true,
            status: true,
            agentType: true,
            score: true,
            documentId: true,
            sourceChunkId: true,
            createdAt: true,
          },
        }),
    prisma.contradiction.count({
      where: { projectId, status: "OPEN" },
    }),
    prisma.missingItem.count({
      where: { projectId, status: { in: ["OPEN", "REQUESTED"] } },
    }),
  ]);

  const severityCounts = { ...EMPTY_SEVERITY_COUNTS };
  const categoryMap = new Map<string, number>();

  for (const finding of findings) {
    if (finding.status !== "OPEN") continue;
    switch (finding.severity) {
      case "CRITICAL":
        severityCounts.critical += 1;
        break;
      case "HIGH":
        severityCounts.high += 1;
        break;
      case "MEDIUM":
        severityCounts.medium += 1;
        break;
      case "LOW":
        severityCounts.low += 1;
        break;
      default:
        break;
    }
    const cat = finding.category || "uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  let categoryScores: Record<string, number> | null = null;
  let enterpriseRiskScore: number | null = null;
  let scoreSource: RisksSummary["scoreSource"] = "none";

  if (riskRun) {
    const output =
      riskRun.output && typeof riskRun.output === "object"
        ? (riskRun.output as RiskAgentOutput)
        : null;
    if (output?.categoryScores && typeof output.categoryScores === "object") {
      categoryScores = output.categoryScores;
    }
    if (typeof output?.enterpriseRiskScore === "number") {
      enterpriseRiskScore = Math.round(output.enterpriseRiskScore);
      scoreSource = "risk_agent";
    } else if (typeof riskRun.score === "number") {
      enterpriseRiskScore = Math.round(riskRun.score);
      scoreSource = "risk_agent";
    }
  }

  if (enterpriseRiskScore === null && totalFindingCount(severityCounts) > 0) {
    enterpriseRiskScore = compositeRiskScoreFromSeverities(severityCounts);
    scoreSource = "composite";
  }

  return {
    enterpriseRiskScore,
    scoreSource,
    severityCounts,
    categoryBreakdown: [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    categoryScores,
    findings: findings.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      category: f.category,
      severity: f.severity,
      status: f.status,
      agentType: f.agentType,
      score: f.score,
      documentId: f.documentId,
      sourceChunkId: f.sourceChunkId,
      createdAt: f.createdAt.toISOString(),
    })),
    openFindingCount: findings.filter((f) => f.status === "OPEN").length,
    contradictionOpenCount,
    missingOpenCount,
    consensus: consensus
      ? {
          decisionConfidence: consensus.decisionConfidence,
          finalRecommendation: consensus.finalRecommendation.slice(0, 400),
          createdAt: consensus.createdAt.toISOString(),
        }
      : null,
    hasAgentRuns,
  };
}
