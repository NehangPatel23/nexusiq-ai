import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectMissingAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session };
}

export async function requireMissingItemAccess(itemId: string) {
  const item = await prisma.missingItem.findUnique({
    where: { id: itemId },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!item || item.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Missing item not found");
  }

  const session = await requireOrgRole(
    item.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return {
    item,
    session,
    organizationId: item.project.workspace.organizationId,
  };
}
