"use client";

import { ProjectBreadcrumbs } from "@/features/projects/components/project-breadcrumbs";
import { useProjectShell } from "@/features/projects/components/project-shell-context";
import { ProjectShellHeaderActions } from "@/features/projects/components/project-shell-header-actions";
import { ProjectTypeBadge } from "@/features/projects/components/project-type-badge";

interface ProjectShellHeaderProps {
  projectId: string;
}

export function ProjectShellHeader({ projectId }: ProjectShellHeaderProps) {
  const { project, canEdit, canDelete } = useProjectShell();

  return (
    <>
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
          projectId={projectId}
          projectName={project.name}
          pinned={project.pinned}
          canDelete={canDelete}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}
