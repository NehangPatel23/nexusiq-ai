import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  getDocumentById,
  listDocumentVersions,
} from "@/features/data-room/lib/documents";
import { listDataRoomAuditEvents } from "@/features/data-room/lib/audit";
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

    const [versions, auditEvents] = await Promise.all([
      listDocumentVersions(documentId),
      listDataRoomAuditEvents(document.projectId, { limit: 100 }),
    ]);

    const events: Array<{
      id: string;
      type: "uploaded" | "version" | "updated" | "processing" | "reprocessed" | "failed";
      label: string;
      detail: string;
      at: string;
    }> = [
      {
        id: `created-${document.id}`,
        type: "uploaded",
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

    if (document.processedAt) {
      events.push({
        id: `processed-${document.id}`,
        type: document.status === "FAILED" ? "failed" : "processing",
        label: document.status === "FAILED" ? "Processing failed" : "Processing completed",
        detail:
          document.status === "FAILED"
            ? document.errorMessage ?? "Unknown error"
            : document.classification
              ? `Classified as ${document.classification}`
              : "Document indexed",
        at: document.processedAt.toISOString(),
      });
    }

    for (const audit of auditEvents.filter((event) => event.resourceId === documentId)) {
      if (audit.action === "REPROCESSED") {
        const metadata = audit.metadata as { event?: string } | null;
        events.push({
          id: audit.id,
          type: metadata?.event === "processing_failed" ? "failed" : "reprocessed",
          label:
            metadata?.event === "processing_failed"
              ? "Processing failed"
              : metadata?.event === "processing_completed"
                ? "Processing completed"
                : "Reprocess queued",
          detail: audit.resourceName,
          at: audit.createdAt.toISOString(),
        });
      }
    }

    if (document.updatedAt.getTime() - document.createdAt.getTime() > 1000) {
      events.push({
        id: `updated-${document.id}`,
        type: "updated",
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
