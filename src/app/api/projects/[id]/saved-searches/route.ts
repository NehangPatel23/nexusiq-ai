export const dynamic = "force-dynamic";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import {
  createSavedSearch,
  listSavedSearches,
} from "@/features/search/lib/saved-searches";
import { createSavedSearchSchema } from "@/features/search/schemas";
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

    const { userId } = await requireOrgRole(
      project.workspace.organizationId,
      DATA_ROOM_VIEW_MIN_ROLE,
    );

    const items = await listSavedSearches(projectId, userId);
    return apiSuccess({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    const { userId } = await requireOrgRole(
      project.workspace.organizationId,
      DATA_ROOM_VIEW_MIN_ROLE,
    );

    const body = await request.json();
    const parsed = createSavedSearchSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid saved search",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const item = await createSavedSearch(projectId, userId, parsed.data);
    return apiSuccess(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
