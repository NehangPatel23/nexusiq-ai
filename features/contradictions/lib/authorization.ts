import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectContradictionsAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session };
}

export async function requireContradictionAccess(contradictionId: string) {
  const contradiction = await prisma.contradiction.findUnique({
    where: { id: contradictionId },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!contradiction || contradiction.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Contradiction not found");
  }

  const session = await requireOrgRole(
    contradiction.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return {
    contradiction,
    session,
    organizationId: contradiction.project.workspace.organizationId,
  };
}
