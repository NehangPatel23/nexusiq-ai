import type { AgentType } from "@prisma/client";

import { ProjectOverview } from "@/features/projects/components/project-overview";
import { getLatestCompletedRunsByAgent } from "@/features/intelligence/lib/agent-runs";
import { INTELLIGENCE_AGENT_TYPES } from "@/lib/ai/agents/types";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { projectId } = await params;
  const latestByAgent = await getLatestCompletedRunsByAgent(projectId);
  const agentScores = Object.fromEntries(
    INTELLIGENCE_AGENT_TYPES.map((agent) => [agent, latestByAgent.get(agent)?.score ?? null]),
  ) as Partial<Record<AgentType, number | null>>;
  const enterpriseRiskScore = latestByAgent.get("RISK")?.score ?? null;

  return <ProjectOverview agentScores={agentScores} enterpriseRiskScore={enterpriseRiskScore} />;
}
