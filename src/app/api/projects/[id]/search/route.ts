export const dynamic = "force-dynamic";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { searchRequestSchema } from "@/features/search/schemas";
import { searchDocuments } from "@/lib/ai/retrieval";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);

    const body = await request.json();
    const parsed = searchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid search request",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    try {
      const response = await searchDocuments({
        projectId,
        query: parsed.data.query,
        mode: parsed.data.mode,
        filters: parsed.data.filters,
        limit: parsed.data.limit,
      });
      return apiSuccess(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      if (message.includes("unavailable")) {
        return apiError("OLLAMA_UNAVAILABLE", message, 503);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
