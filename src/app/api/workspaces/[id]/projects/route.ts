import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { getWorkspaceById } from "@/features/workspaces/lib/workspaces";
import {
  PROJECT_CREATE_MIN_ROLE,
  PROJECT_LIST_MIN_ROLE,
  PROJECT_MANAGE_MIN_ROLE,
} from "@/features/projects/lib/roles";
import {
  createProject,
  listDeletedWorkspaceProjects,
  listWorkspaceProjects,
} from "@/features/projects/lib/projects";
import { createProjectSchema } from "@/features/projects/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params;
    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace) {
      return apiError("NOT_FOUND", "Workspace not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (status === "deleted") {
      await requireOrgRole(workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
      const projects = await listDeletedWorkspaceProjects(workspaceId);
      return apiSuccess({ items: projects, total: projects.length });
    }

    await requireOrgRole(workspace.organizationId, PROJECT_LIST_MIN_ROLE);
    const projects = await listWorkspaceProjects(workspaceId);
    return apiSuccess({ items: projects, total: projects.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params;
    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace) {
      return apiError("NOT_FOUND", "Workspace not found", 404);
    }

    await requireOrgRole(workspace.organizationId, PROJECT_CREATE_MIN_ROLE);

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid project data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await createProject(workspaceId, parsed.data);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.project, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
