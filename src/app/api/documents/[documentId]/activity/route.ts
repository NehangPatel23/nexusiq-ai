import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  getDocumentById,
  listDocumentVersions,
} from "@/features/data-room/lib/documents";
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

    const versions = await listDocumentVersions(documentId);

    const events: Array<{
      id: string;
      type: "uploaded" | "version" | "updated";
      label: string;
      detail: string;
      at: string;
    }> = [
      {
        id: `created-${document.id}`,
        type: "uploaded" as const,
        label: "Document uploaded",
        detail: `Version ${document.version}`,
        at: document.createdAt.toISOString(),
      },
      ...versions.map((version) => ({
        id: version.id,
        type: "version" as const,
        label: `Version ${version.version} uploaded`,
        detail: version.uploadedBy.name ?? version.uploadedBy.email,
        at: version.createdAt.toISOString(),
      })),
    ];

    if (document.updatedAt.getTime() - document.createdAt.getTime() > 1000) {
      events.push({
        id: `updated-${document.id}`,
        type: "updated" as const,
        label: "Metadata updated",
        detail: document.classification
          ? `Classification: ${document.classification}`
          : "Tags or name changed",
        at: document.updatedAt.toISOString(),
      });
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return apiSuccess({ events });
  } catch (error) {
    return handleApiError(error);
  }
}
