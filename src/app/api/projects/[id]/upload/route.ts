import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { logDataRoomAudit } from "@/features/data-room/lib/audit";
import { uploadDocument } from "@/features/data-room/lib/documents";
import { MAX_UPLOAD_BYTES } from "@/features/data-room/lib/mime";
import { DATA_ROOM_UPLOAD_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
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

    const session = await requireOrgRole(
      project.workspace.organizationId,
      DATA_ROOM_UPLOAD_MIN_ROLE,
    );

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return apiError("VALIDATION_ERROR", "Expected multipart/form-data", 400);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "file is required", 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError("VALIDATION_ERROR", "File exceeds the 50MB limit", 400);
    }

    const folderIdRaw = formData.get("folderId");
    const folderId =
      typeof folderIdRaw === "string" && folderIdRaw.length > 0 ? folderIdRaw : null;

    const relativePathRaw = formData.get("relativePath");
    const relativePath =
      typeof relativePathRaw === "string" && relativePathRaw.length > 0
        ? relativePathRaw
        : null;

    const replaceDocumentIdRaw = formData.get("replaceDocumentId");
    const replaceDocumentId =
      typeof replaceDocumentIdRaw === "string" && replaceDocumentIdRaw.length > 0
        ? replaceDocumentIdRaw
        : null;

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadDocument({
      organizationId: project.workspace.organizationId,
      projectId,
      uploadedById: session.userId,
      fileName: file.name,
      mimeType: file.type || null,
      buffer,
      folderId,
      relativePath,
      replaceDocumentId,
    });

    if ("error" in result) {
      const status =
        result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    await logDataRoomAudit({
      projectId,
      actorId: session.userId,
      action: "UPLOADED",
      resourceType: "DOCUMENT",
      resourceId: result.document.id,
      resourceName: result.document.name,
    });

    return apiSuccess(result.document, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
