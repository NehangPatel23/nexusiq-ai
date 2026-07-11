import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { getDocumentProcessingSummary } from "@/features/data-room/lib/documents";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);

    const summary = await getDocumentProcessingSummary(projectId);
    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
