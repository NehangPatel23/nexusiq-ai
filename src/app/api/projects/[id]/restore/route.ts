import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { PROJECT_MANAGE_MIN_ROLE } from "@/features/projects/lib/roles";
import {
  getDeletedProjectById,
  restoreProject,
} from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await getDeletedProjectById(id);

    if (!project) {
      return apiError("NOT_FOUND", "Deleted project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    const result = await restoreProject(id);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.project);
  } catch (error) {
    return handleApiError(error);
  }
}
