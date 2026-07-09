import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { WORKSPACE_MANAGE_MIN_ROLE } from "@/features/workspaces/lib/roles";
import {
  getDeletedWorkspaceById,
  restoreWorkspace,
} from "@/features/workspaces/lib/workspaces";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspace = await getDeletedWorkspaceById(id);

    if (!workspace) {
      return apiError("NOT_FOUND", "Deleted workspace not found", 404);
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_MANAGE_MIN_ROLE);

    const result = await restoreWorkspace(id);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.workspace);
  } catch (error) {
    return handleApiError(error);
  }
}
