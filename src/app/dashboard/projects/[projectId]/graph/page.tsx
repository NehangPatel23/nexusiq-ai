import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { GraphPage } from "@/features/graph/components/graph-page";
import { getProjectGraph } from "@/features/graph/lib/graph-data";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectGraphPage({ params }: PageProps) {
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

  const [graph, processedCount] = await Promise.all([
    getProjectGraph(projectId),
    prisma.document.count({
      where: { projectId, deletedAt: null, status: "READY" },
    }),
  ]);

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading graph…</div>}>
      <GraphPage
        projectId={projectId}
        projectName={project.name}
        initialGraph={JSON.parse(JSON.stringify(graph))}
        hasProcessedDocs={processedCount > 0}
      />
    </Suspense>
  );
}
