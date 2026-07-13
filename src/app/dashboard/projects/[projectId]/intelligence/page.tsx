import { notFound, redirect } from "next/navigation";

import { IntelligencePage as ProjectIntelligencePage } from "@/features/intelligence/components/intelligence-page";
import {
  getAgentRunWithFindings,
  getLatestCompletedRunsByAgent,
  listAgentRuns,
} from "@/features/intelligence/lib/agent-runs";
import {
  getLatestConsensusRun,
  listConsensusRuns,
} from "@/features/intelligence/lib/consensus-runs";
import { countOpenFindingsBySeverityForProject } from "@/features/intelligence/lib/findings-stats";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { INTELLIGENCE_AGENT_TYPES } from "@/lib/ai/agents/types";
import { getSession } from "@/lib/session";
import type { AgentType } from "@prisma/client";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function IntelligencePage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const membership = await getOrganizationMembership(
    project.workspace.organizationId,
    session.user.id,
  );
  if (!membership) redirect("/dashboard/projects");

  const [runs, latestByAgent, initialRiskSummary, initialConsensus, initialConsensusHistory] =
    await Promise.all([
      listAgentRuns(projectId, { limit: 30 }),
      getLatestCompletedRunsByAgent(projectId),
      countOpenFindingsBySeverityForProject(projectId),
      getLatestConsensusRun(projectId),
      listConsensusRuns(projectId, { limit: 20 }),
    ]);

  const agentTypesToHydrate: AgentType[] = [...INTELLIGENCE_AGENT_TYPES, "EXECUTIVE"];
  const initialDetailsEntries = await Promise.all(
    agentTypesToHydrate.map(async (agentType) => {
      const latest = latestByAgent.get(agentType);
      if (!latest) return [agentType, undefined] as const;
      const detail = await getAgentRunWithFindings(latest.id);
      return [agentType, detail ?? undefined] as const;
    }),
  );

  const initialDetails = Object.fromEntries(
    initialDetailsEntries.filter((entry) => entry[1] !== undefined),
  );

  return (
    <ProjectIntelligencePage
      projectId={projectId}
      projectName={project.name}
      initialRuns={runs}
      initialDetails={initialDetails}
      initialRiskSummary={initialRiskSummary}
      initialConsensus={initialConsensus}
      initialConsensusHistory={initialConsensusHistory}
    />
  );
}
