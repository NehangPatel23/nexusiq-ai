import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectGraphAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session };
}

export async function requireEntityAccess(entityId: string) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!entity || entity.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Entity not found");
  }

  const session = await requireOrgRole(
    entity.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return { entity, session, organizationId: entity.project.workspace.organizationId };
}
