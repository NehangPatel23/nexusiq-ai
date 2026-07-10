"use client";

import { DeleteProjectButton } from "@/features/projects/components/delete-project-button";
import { ProjectCardMenu } from "@/features/projects/components/project-card-menu";

interface ProjectShellHeaderActionsProps {
  projectId: string;
  projectName: string;
  pinned: boolean;
  canDelete: boolean;
  canEdit: boolean;
}

export function ProjectShellHeaderActions({
  projectId,
  projectName,
  pinned,
  canDelete,
  canEdit,
}: ProjectShellHeaderActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <ProjectCardMenu
        projectId={projectId}
        projectName={projectName}
        pinned={pinned}
        canEdit={canEdit}
      />
      {canDelete && <DeleteProjectButton projectId={projectId} projectName={projectName} />}
    </div>
  );
}
