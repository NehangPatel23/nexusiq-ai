import { redirect } from "next/navigation";

import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { ProjectOverview } from "@/features/projects/components/project-overview";
import { canEditProject } from "@/features/projects/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { auth } from "@/lib/auth";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    redirect("/dashboard/projects");
  }

  const membership = await getOrganizationMembership(
    project.workspace.organizationId,
    session.user.id,
  );
  if (!membership) {
    redirect("/dashboard/projects");
  }

  return (
    <ProjectOverview
      project={project}
      canEdit={canEditProject(membership.role)}
    />
  );
}
