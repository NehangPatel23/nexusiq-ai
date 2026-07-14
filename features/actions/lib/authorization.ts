import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectActionsAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session, organizationId: project.workspace.organizationId };
}

export async function requireTaskAccess(taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!task || task.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Task not found");
  }

  const session = await requireOrgRole(
    task.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return {
    task,
    session,
    organizationId: task.project.workspace.organizationId,
    projectId: task.projectId,
  };
}
