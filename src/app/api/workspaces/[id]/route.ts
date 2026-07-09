import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  WORKSPACE_EDIT_MIN_ROLE,
  WORKSPACE_LIST_MIN_ROLE,
  WORKSPACE_MANAGE_MIN_ROLE,
} from "@/features/workspaces/lib/roles";
import {
  getWorkspaceById,
  softDeleteWorkspace,
  updateWorkspace,
} from "@/features/workspaces/lib/workspaces";
import { updateWorkspaceSchema } from "@/features/workspaces/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspace = await getWorkspaceById(id);

    if (!workspace) {
      return apiError("NOT_FOUND", "Workspace not found", 404);
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_LIST_MIN_ROLE);
    return apiSuccess(workspace);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspace = await getWorkspaceById(id);

    if (!workspace) {
      return apiError("NOT_FOUND", "Workspace not found", 404);
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_EDIT_MIN_ROLE);

    const body = await request.json();
    const parsed = updateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid workspace data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await updateWorkspace(id, parsed.data);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.workspace);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspace = await getWorkspaceById(id);

    if (!workspace) {
      return apiError("NOT_FOUND", "Workspace not found", 404);
    }

    await requireOrgRole(workspace.organizationId, WORKSPACE_MANAGE_MIN_ROLE);
    await softDeleteWorkspace(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
