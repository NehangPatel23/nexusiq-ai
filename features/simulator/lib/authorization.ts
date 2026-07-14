import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { AuthError, requireOrgRole } from "@/features/organizations/lib/authorization";
import { getProjectById } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

export async function requireProjectSimulatorAccess(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AuthError("NOT_FOUND", "Project not found");
  }
  const session = await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);
  return { project, session, organizationId: project.workspace.organizationId };
}

export async function requireSimulationAccess(simulationId: string) {
  const simulation = await prisma.simulationRun.findUnique({
    where: { id: simulationId },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!simulation || simulation.project.deletedAt) {
    throw new AuthError("NOT_FOUND", "Simulation not found");
  }

  const session = await requireOrgRole(
    simulation.project.workspace.organizationId,
    DATA_ROOM_VIEW_MIN_ROLE,
  );

  return {
    simulation,
    session,
    organizationId: simulation.project.workspace.organizationId,
  };
}
