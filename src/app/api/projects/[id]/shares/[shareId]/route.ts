import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { revokeDataRoomShare } from "@/features/data-room/lib/shares";
import { DATA_ROOM_ADMIN_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string; shareId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: projectId, shareId } = await context.params;
    const project = await getProjectById(projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_ADMIN_MIN_ROLE);

    await revokeDataRoomShare(shareId);
    return apiSuccess({ revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
