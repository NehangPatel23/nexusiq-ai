import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { getDocumentById, getDocumentEntities } from "@/features/data-room/lib/documents";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const document = await getDocumentById(documentId);

    if (!document) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }

    const project = await getProjectById(document.projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);

    const data = await getDocumentEntities(documentId);
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
