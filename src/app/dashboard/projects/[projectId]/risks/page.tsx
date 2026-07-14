import { notFound, redirect } from "next/navigation";

import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { RisksPageClient } from "@/features/risks/components/risks-page";
import { getProjectRisksSummary } from "@/features/risks/lib/risks-summary";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function RisksPage({ params }: PageProps) {
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

  const summary = await getProjectRisksSummary(projectId);

  return (
    <RisksPageClient
      projectId={projectId}
      projectName={project.name}
      initialSummary={JSON.parse(JSON.stringify(summary))}
    />
  );
}
