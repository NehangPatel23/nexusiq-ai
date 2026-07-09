import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { WORKSPACE_MANAGE_MIN_ROLE } from "@/features/workspaces/lib/roles";
import {
  getDeletedWorkspaceById,
  hardDeleteWorkspace,
} from "@/features/workspaces/lib/workspaces";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspace = await getDeletedWorkspaceById(id);

    if (!workspace) {
      return apiError("NOT_FOUND", "Deleted workspace not found", 404);
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_MANAGE_MIN_ROLE);
    await hardDeleteWorkspace(id);
    return apiSuccess({ deleted: true, permanent: true });
  } catch (error) {
    return handleApiError(error);
  }
}
