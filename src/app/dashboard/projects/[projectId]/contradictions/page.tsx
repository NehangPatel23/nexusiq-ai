import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ContradictionsPageClient } from "@/features/contradictions/components/contradictions-page";
import { listContradictions } from "@/features/contradictions/lib/contradictions";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ContradictionsPage({ params }: PageProps) {
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

  const [contradictions, readyDocumentCount] = await Promise.all([
    listContradictions({ projectId }),
    prisma.document.count({
      where: { projectId, deletedAt: null, status: "READY" },
    }),
  ]);

  return (
    <Suspense
      fallback={<div className="text-sm text-muted-foreground">Loading contradictions…</div>}
    >
      <ContradictionsPageClient
        projectId={projectId}
        projectName={project.name}
        initialContradictions={JSON.parse(JSON.stringify(contradictions))}
        readyDocumentCount={readyDocumentCount}
      />
    </Suspense>
  );
}
