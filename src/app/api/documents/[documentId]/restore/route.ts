import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  getDeletedDocumentById,
  restoreDocument,
} from "@/features/data-room/lib/documents";
import { DATA_ROOM_ADMIN_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const document = await getDeletedDocumentById(documentId);
    if (!document) {
      return apiError("NOT_FOUND", "Deleted document not found", 404);
    }

    const project = await getProjectById(document.projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_ADMIN_MIN_ROLE);

    const result = await restoreDocument(documentId);
    if ("error" in result) {
      const status = result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.document);
  } catch (error) {
    return handleApiError(error);
  }
}
