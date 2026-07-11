export const dynamic = "force-dynamic";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { listDocuments } from "@/features/data-room/lib/documents";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { listDocumentsQuerySchema } from "@/features/data-room/schemas";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);

    const url = new URL(request.url);
    const parsed = listDocumentsQuerySchema.safeParse({
      folderId: url.searchParams.get("folderId") ?? "all",
    });

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid query",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const documents = await listDocuments(projectId, { folderId: parsed.data.folderId });
    return apiSuccess({ items: documents, total: documents.length });
  } catch (error) {
    return handleApiError(error);
  }
}
