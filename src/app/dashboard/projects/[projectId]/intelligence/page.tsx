import { notFound, redirect } from "next/navigation";

import { IntelligencePage as ProjectIntelligencePage } from "@/features/intelligence/components/intelligence-page";
import { listAgentRuns } from "@/features/intelligence/lib/agent-runs";
import {
  getLatestConsensusRun,
  listConsensusRuns,
} from "@/features/intelligence/lib/consensus-runs";
import { countOpenFindingsBySeverityForProject } from "@/features/intelligence/lib/findings-stats";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { getSession } from "@/lib/session";

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

  // Keep this route lean — detailed run payloads hydrate on the client after paint so
  // tab navigation is not blocked on N finding fetches.
  const [runs, initialRiskSummary, initialConsensus, initialConsensusHistory] = await Promise.all([
    listAgentRuns(projectId, { limit: 30 }),
    countOpenFindingsBySeverityForProject(projectId),
    getLatestConsensusRun(projectId),
    listConsensusRuns(projectId, { limit: 20 }),
  ]);

  return (
    <ProjectIntelligencePage
      projectId={projectId}
      projectName={project.name}
      initialRuns={runs}
      initialDetails={{}}
      initialRiskSummary={initialRiskSummary}
      initialConsensus={initialConsensus}
      initialConsensusHistory={initialConsensusHistory}
    />
  );
}
