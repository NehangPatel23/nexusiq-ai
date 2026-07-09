import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  WORKSPACE_CREATE_MIN_ROLE,
  WORKSPACE_LIST_MIN_ROLE,
  WORKSPACE_MANAGE_MIN_ROLE,
} from "@/features/workspaces/lib/roles";
import {
  createWorkspace,
  listDeletedOrganizationWorkspaces,
  listOrganizationWorkspaces,
} from "@/features/workspaces/lib/workspaces";
import { createWorkspaceSchema } from "@/features/workspaces/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (status === "deleted") {
      await requireOrgRole(orgId, WORKSPACE_MANAGE_MIN_ROLE);
      const workspaces = await listDeletedOrganizationWorkspaces(orgId);
      return apiSuccess({ items: workspaces, total: workspaces.length });
    }

    await requireOrgRole(orgId, WORKSPACE_LIST_MIN_ROLE);

    const workspaces = await listOrganizationWorkspaces(orgId);
    return apiSuccess({ items: workspaces, total: workspaces.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, WORKSPACE_CREATE_MIN_ROLE);

    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid workspace data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await createWorkspace(orgId, parsed.data);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.workspace, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
