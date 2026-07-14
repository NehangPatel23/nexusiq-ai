import type { AgentType } from "@prisma/client";

import type { IntelligenceContext } from "./context";

export type ReportSnapshotAsOf = {
  capturedAt: string;
  agentRuns: Array<{
    id: string;
    agentType: AgentType;
    completedAt: string | null;
    score: number | null;
  }>;
  consensus: {
    id: string;
    createdAt: string;
    finalRecommendation: string;
    decisionConfidence: string;
  } | null;
  openFindingCount: number;
};

export function buildReportSnapshot(ctx: IntelligenceContext): ReportSnapshotAsOf {
  const agentRuns = (Object.values(ctx.agentRuns).filter(Boolean) as NonNullable<
    IntelligenceContext["agentRuns"][AgentType]
  >[]).map((run) => ({
    id: run.id,
    agentType: run.agentType,
    completedAt: run.completedAt,
    score: run.score ?? null,
  }));

  return {
    capturedAt: new Date().toISOString(),
    agentRuns,
    consensus: ctx.consensus
      ? {
          id: ctx.consensus.id,
          createdAt: ctx.consensus.createdAt,
          finalRecommendation: ctx.consensus.finalRecommendation,
          decisionConfidence: ctx.consensus.decisionConfidence,
        }
      : null,
    openFindingCount: ctx.findings.length,
  };
}
