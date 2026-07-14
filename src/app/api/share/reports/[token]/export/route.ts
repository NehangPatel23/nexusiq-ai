export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { logReportExported } from "@/features/reports/lib/report-audit";
import {
  exportReportBinary,
  normalizeExportFormat,
  type ExportFormat,
} from "@/features/reports/lib/export-report";
import { getActiveReportShareByToken } from "@/features/reports/lib/report-shares";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ token: string }>;
}

function formatFromReportFormat(format: "MARKDOWN" | "PDF" | "XLSX" | "PPTX"): ExportFormat {
  switch (format) {
    case "MARKDOWN":
      return "md";
    case "PDF":
      return "pdf";
    case "XLSX":
      return "xlsx";
    case "PPTX":
      return "pptx";
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token) {
      return apiError("NOT_FOUND", "Share link not found", 404);
    }
    const result = await getActiveReportShareByToken(token);
    if (!result.ok) {
      const status = result.error === "EXPIRED" ? 410 : 404;
      return apiError(result.error, result.message, status);
    }

    const { share } = result;
    const url = new URL(request.url);
    const requested = normalizeExportFormat(
      url.searchParams.get("format"),
      share.report.reportType,
    );

    let format: ExportFormat = requested;
    if (share.format) {
      const locked = formatFromReportFormat(share.format);
      if (url.searchParams.get("format") && requested !== locked) {
        return apiError("FORBIDDEN", "This share link is locked to a single format", 403);
      }
      format = locked;
    }

    const project = await prisma.project.findUnique({
      where: { id: share.projectId },
      select: { workspace: { select: { organizationId: true } } },
    });
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    const exported = await exportReportBinary({
      reportId: share.reportId,
      organizationId: project.workspace.organizationId,
      format,
    });

    void logReportExported({
      projectId: share.projectId,
      actorId: null,
      reportId: share.reportId,
      title: share.report.title,
      format,
      viaShare: true,
    }).catch(() => undefined);

    return new Response(new Uint8Array(exported.buffer), {
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${exported.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return apiError(
      "EXPORT_FAILED",
      error instanceof Error ? error.message.slice(0, 240) : "Failed to export shared report",
      500,
    );
  }
}
