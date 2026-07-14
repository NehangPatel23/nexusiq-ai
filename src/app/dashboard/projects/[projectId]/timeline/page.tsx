import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { TimelinePage } from "@/features/timeline/components/timeline-page";
import { listTimelineEvents } from "@/features/timeline/lib/timeline-events";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTimelinePage({ params }: PageProps) {
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

  const [events, processedCount] = await Promise.all([
    listTimelineEvents({ projectId }),
    prisma.document.count({
      where: { projectId, deletedAt: null, status: "READY" },
    }),
  ]);

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading timeline…</div>}>
      <TimelinePage
        projectId={projectId}
        projectName={project.name}
        initialEvents={JSON.parse(JSON.stringify(events))}
        hasProcessedDocs={processedCount > 0}
      />
    </Suspense>
  );
}
