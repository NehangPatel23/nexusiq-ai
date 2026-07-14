import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { getLatestCompletedRunsByAgent } from "@/features/intelligence/lib/agent-runs";
import { getLatestConsensusRun } from "@/features/intelligence/lib/consensus-runs";
import { ReportsPage } from "@/features/reports/components/reports-page";
import { listProjectReports } from "@/features/reports/lib/reports";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectReportsPage({ params }: PageProps) {
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

  const [reports, latestRuns, consensus, findingCount] = await Promise.all([
    listProjectReports(projectId),
    getLatestCompletedRunsByAgent(projectId),
    getLatestConsensusRun(projectId),
    prisma.finding.count({
      where: { projectId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    }),
  ]);

  const hasIntelligence = latestRuns.size > 0 || Boolean(consensus) || findingCount > 0;
  const hasFindings = findingCount > 0;

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading reports…</div>}>
      <ReportsPage
        projectId={projectId}
        projectName={project.name}
        initialReports={JSON.parse(JSON.stringify(reports))}
        hasIntelligence={hasIntelligence}
        hasFindings={hasFindings}
      />
    </Suspense>
  );
}
