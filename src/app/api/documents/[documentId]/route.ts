import { NextResponse } from "next/server";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import {
  getDocumentById,
  getDocumentVersionRecord,
  softDeleteDocument,
  updateDocument,
} from "@/features/data-room/lib/documents";
import {
  DATA_ROOM_DELETE_MIN_ROLE,
  DATA_ROOM_UPLOAD_MIN_ROLE,
  DATA_ROOM_VIEW_MIN_ROLE,
} from "@/features/data-room/lib/roles";
import { updateDocumentSchema } from "@/features/data-room/schemas";
import { extractOfficeText } from "@/features/data-room/lib/office-text";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getStorage, isSupabaseStorageConfigured } from "@/lib/storage";

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

async function resolveDocumentProject(documentId: string) {
  const document = await getDocumentById(documentId);
  if (!document) {
    return null;
  }
  const project = await getProjectById(document.projectId);
  if (!project) {
    return null;
  }
  return { document, project };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const resolved = await resolveDocumentProject(documentId);

    if (!resolved) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }

    await requireOrgRole(
      resolved.project.workspace.organizationId,
      DATA_ROOM_VIEW_MIN_ROLE,
    );

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const preview = url.searchParams.get("preview") === "1";
    const versionParam = url.searchParams.get("version");
    const versionNumber = versionParam ? Number.parseInt(versionParam, 10) : null;

    let filePath = resolved.document.filePath;
    let fileName = resolved.document.originalName;
    const mimeType = resolved.document.mimeType;

    if (versionNumber && Number.isFinite(versionNumber)) {
      const versionRecord = await getDocumentVersionRecord(documentId, versionNumber);
      if (!versionRecord) {
        return apiError("NOT_FOUND", "Document version not found", 404);
      }
      filePath = versionRecord.filePath;
      const ext = resolved.document.originalName.match(/\.[^.]+$/)?.[0] ?? "";
      fileName = `${resolved.document.name.replace(/\.[^.]+$/, "")}-v${versionNumber}${ext}`;
    }

    if (download || preview) {
      if (isSupabaseStorageConfigured()) {
        // Office files need server-side text extraction for inline preview
        if (preview) {
          const buffer = await getStorage().getObject(filePath);
          const officeText = await extractOfficeText(
            new Uint8Array(buffer).buffer,
            mimeType,
          );
          if (officeText !== null) {
            return new Response(officeText, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }
        }
        const signedUrl = await getStorage().getSignedUrl(filePath, 3600);
        return NextResponse.redirect(signedUrl);
      }

      const buffer = await getStorage().getObject(filePath);

      if (preview) {
        const officeText = await extractOfficeText(
          new Uint8Array(buffer).buffer,
          mimeType,
        );
        if (officeText !== null) {
          return new Response(officeText, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      }

      const headers = new Headers({
        "Content-Type": mimeType,
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": download
          ? `attachment; filename="${encodeURIComponent(fileName)}"`
          : `inline; filename="${encodeURIComponent(fileName)}"`,
      });

      return new Response(new Uint8Array(buffer), { status: 200, headers });
    }

    return apiSuccess(resolved.document);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const resolved = await resolveDocumentProject(documentId);

    if (!resolved) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }

    await requireOrgRole(
      resolved.project.workspace.organizationId,
      DATA_ROOM_UPLOAD_MIN_ROLE,
    );

    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid document data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await updateDocument(documentId, parsed.data);
    if ("error" in result) {
      const status =
        result.error === "CONFLICT" ? 409 : result.error === "NOT_FOUND" ? 404 : 400;
      return apiError(result.error, result.message, status);
    }

    return apiSuccess(result.document);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const resolved = await resolveDocumentProject(documentId);

    if (!resolved) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }

    await requireOrgRole(
      resolved.project.workspace.organizationId,
      DATA_ROOM_DELETE_MIN_ROLE,
    );

    const result = await softDeleteDocument(documentId);
    if ("error" in result) {
      return apiError(result.error, result.message, 404);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
