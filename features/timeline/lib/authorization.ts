import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectTimelineAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session };
}

export async function requireTimelineEventAccess(eventId: string) {
  const event = await prisma.timelineEvent.findUnique({
    where: { id: eventId },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!event || event.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Timeline event not found");
  }

  const session = await requireOrgRole(
    event.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return { event, session, organizationId: event.project.workspace.organizationId };
}
