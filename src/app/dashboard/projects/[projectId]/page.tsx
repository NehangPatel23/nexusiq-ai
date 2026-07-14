import type { AgentType, ConfidenceLevel } from "@prisma/client";

import { ProjectOverview } from "@/features/projects/components/project-overview";
import { countOpenContradictions } from "@/features/contradictions/lib/contradictions";
import { getLatestCompletedRunsByAgent } from "@/features/intelligence/lib/agent-runs";
import { getLatestConsensusRun } from "@/features/intelligence/lib/consensus-runs";
import { countOpenMissingItems } from "@/features/missing/lib/missing-items";
import { INTELLIGENCE_AGENT_TYPES } from "@/lib/ai/agents/types";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { projectId } = await params;
  const [latestByAgent, latestConsensus, contradictionOpenCount, missingOpenCount] =
    await Promise.all([
      getLatestCompletedRunsByAgent(projectId),
      getLatestConsensusRun(projectId),
      countOpenContradictions(projectId),
      countOpenMissingItems(projectId),
    ]);
  const agentScores = Object.fromEntries(
    INTELLIGENCE_AGENT_TYPES.map((agent) => [agent, latestByAgent.get(agent)?.score ?? null]),
  ) as Partial<Record<AgentType, number | null>>;
  const enterpriseRiskScore = latestByAgent.get("RISK")?.score ?? null;

  return (
    <ProjectOverview
      agentScores={agentScores}
      enterpriseRiskScore={enterpriseRiskScore}
      contradictionOpenCount={contradictionOpenCount}
      missingOpenCount={missingOpenCount}
      latestConsensus={
        latestConsensus
          ? {
              id: latestConsensus.id,
              finalRecommendation: latestConsensus.finalRecommendation,
              decisionConfidence: latestConsensus.decisionConfidence as ConfidenceLevel,
              createdAt: latestConsensus.createdAt,
              conflictCount: latestConsensus.conflicts.length,
              agreementCount: latestConsensus.agreements.length,
            }
          : null
      }
    />
  );
}
