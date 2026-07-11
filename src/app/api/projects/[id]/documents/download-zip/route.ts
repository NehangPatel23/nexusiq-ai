import JSZip from "jszip";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { getDocumentById } from "@/features/data-room/lib/documents";
import { DATA_ROOM_VIEW_MIN_ROLE } from "@/features/data-room/lib/roles";
import { getProjectById } from "@/features/projects/lib/projects";
import { apiError, handleApiError } from "@/lib/api";
import { getStorage } from "@/lib/storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProjectById(projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    await requireOrgRole(project.workspace.organizationId, DATA_ROOM_VIEW_MIN_ROLE);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid request body", 400);
    }

    const zip = new JSZip();
    let added = 0;

    for (const documentId of parsed.data.documentIds) {
      const document = await getDocumentById(documentId);
      if (!document || document.projectId !== projectId) continue;

      try {
        const buffer = await getStorage().getObject(document.filePath);
        const folderPath = document.folder?.path?.replace(/^\//, "") ?? "";
        const zipPath = folderPath ? `${folderPath}/${document.originalName}` : document.originalName;
        zip.file(zipPath, buffer);
        added++;
      } catch {
        // Skip files that fail to load
      }
    }

    if (added === 0) {
      return apiError("NOT_FOUND", "No documents available to download", 404);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="data-room-${projectId.slice(0, 8)}.zip"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
