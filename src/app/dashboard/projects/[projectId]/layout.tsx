import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { ProjectBreadcrumbs } from "@/features/projects/components/project-breadcrumbs";
import { ProjectShellNav } from "@/features/projects/components/project-shell-nav";
import { ProjectShellHeaderActions } from "@/features/projects/components/project-shell-header-actions";
import { ProjectTypeBadge } from "@/features/projects/components/project-type-badge";
import { canManageProjects } from "@/features/projects/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { auth } from "@/lib/auth";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  return {
    title: project ? project.name : "Project",
  };
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const session = await auth();
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

  return (
    <div className="space-y-6">
      <ProjectBreadcrumbs projectId={projectId} projectName={project.name} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectTypeBadge type={project.type} />
            {project.pinned && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Pinned
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {project.workspace.organization.name} · {project.workspace.name}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.targetCompany && (
            <p className="text-sm text-muted-foreground">Target: {project.targetCompany}</p>
          )}
        </div>
        <ProjectShellHeaderActions
          projectId={project.id}
          projectName={project.name}
          pinned={project.pinned}
          canDelete={canDelete}
          canEdit
        />
      </div>

      <ProjectShellNav projectId={projectId} />
      {children}
    </div>
  );
}
