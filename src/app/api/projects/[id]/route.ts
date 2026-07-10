import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  PROJECT_EDIT_MIN_ROLE,
  PROJECT_LIST_MIN_ROLE,
  PROJECT_MANAGE_MIN_ROLE,
} from "@/features/projects/lib/roles";
import {
  getProjectById,
  softDeleteProject,
  updateProject,
} from "@/features/projects/lib/projects";
import { updateProjectSchema } from "@/features/projects/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await getProjectById(id);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_LIST_MIN_ROLE);
    return apiSuccess(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await getProjectById(id);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_EDIT_MIN_ROLE);

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid project data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await updateProject(id, parsed.data);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await getProjectById(id);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, PROJECT_MANAGE_MIN_ROLE);
    await softDeleteProject(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
