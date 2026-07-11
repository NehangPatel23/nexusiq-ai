import { NextResponse } from "next/server";

import { getDocumentById, getDocumentVersionRecord } from "@/features/data-room/lib/documents";
import { extractOfficeText } from "@/features/data-room/lib/office-text";
import { getActiveShareByToken } from "@/features/data-room/lib/shares";
import { apiError, handleApiError } from "@/lib/api";
import { getStorage, isSupabaseStorageConfigured } from "@/lib/storage";

interface RouteContext {
  params: Promise<{ token: string; documentId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token, documentId } = await context.params;
    const shareResult = await getActiveShareByToken(token);

    if ("error" in shareResult) {
      const code = shareResult.error;
      const status = code === "NOT_FOUND" ? 404 : 410;
      return apiError(code, shareResult.message, status);
    }

    const document = await getDocumentById(documentId);
    if (!document || document.projectId !== shareResult.share.projectId) {
      return apiError("NOT_FOUND", "Document not found", 404);
    }

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const preview = url.searchParams.get("preview") === "1";
    const versionParam = url.searchParams.get("version");
    const versionNumber = versionParam ? Number.parseInt(versionParam, 10) : null;

    let filePath = document.filePath;
    let fileName = document.originalName;
    const mimeType = document.mimeType;

    if (versionNumber && Number.isFinite(versionNumber)) {
      const versionRecord = await getDocumentVersionRecord(documentId, versionNumber);
      if (!versionRecord) {
        return apiError("NOT_FOUND", "Document version not found", 404);
      }
      filePath = versionRecord.filePath;
      const ext = document.originalName.match(/\.[^.]+$/)?.[0] ?? "";
      fileName = `${document.name.replace(/\.[^.]+$/, "")}-v${versionNumber}${ext}`;
    }

    if (download || preview) {
      if (isSupabaseStorageConfigured()) {
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

    return apiError("VALIDATION_ERROR", "Use download=1 or preview=1", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
