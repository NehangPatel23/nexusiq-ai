import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackgroundAnalysisBanner } from "@/features/intelligence/components/background-analysis-banner";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { BackgroundExtractBanner } from "@/features/projects/components/background-extract-banner";
import { ProjectShellHeader } from "@/features/projects/components/project-shell-header";
import { ProjectShellProvider } from "@/features/projects/components/project-shell-context";
import { ProjectShellNav } from "@/features/projects/components/project-shell-nav";
import { canEditProject, canManageProjects } from "@/features/projects/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { toProjectSnapshot } from "@/features/projects/lib/project-snapshot";
import { getSession } from "@/lib/session";
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { projectId } = await params;
  // Reuses the same request-scoped cache as the layout body.
  const project = await getProjectById(projectId);
  return {
    title: project ? project.name : "Project",
  };
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  const membership = await getOrganizationMembership(
    project.workspace.organizationId,
    session.user.id,
  );
  if (!membership) {
    redirect("/dashboard/projects");
  }

  const canDelete = canManageProjects(membership.role);
  const canEdit = canEditProject(membership.role);

  return (
    <ProjectShellProvider
      initialProject={toProjectSnapshot(project)}
      canEdit={canEdit}
      canDelete={canDelete}
    >
      <div className="space-y-6">
        <ProjectShellHeader projectId={projectId} />

        <ProjectShellNav projectId={projectId} />
        <BackgroundAnalysisBanner projectId={projectId} />
        <BackgroundExtractBanner projectId={projectId} />
        {children}
      </div>
    </ProjectShellProvider>
  );
}
