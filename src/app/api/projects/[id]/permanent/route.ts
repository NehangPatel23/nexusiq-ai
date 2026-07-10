import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { PROJECT_MANAGE_MIN_ROLE } from "@/features/projects/lib/roles";
import {
  getDeletedProjectById,
  hardDeleteProject,
} from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await getDeletedProjectById(id);

    if (!project) {
      return apiError("NOT_FOUND", "Deleted project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    await hardDeleteProject(id);
    return apiSuccess({ deleted: true, permanent: true });
  } catch (error) {
    return handleApiError(error);
  }
}
