export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { AuthError } from "@/features/organizations/lib/authorization";
import { requireReportAccess } from "@/features/reports/lib/authorization";
import { logReportExported } from "@/features/reports/lib/report-audit";
import {
  exportReportBinary,
  exportReportZip,
  normalizeExportFormat,
  type ExportFormat,
} from "@/features/reports/lib/export-report";
import { apiError, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { report, organizationId, session } = await requireReportAccess(id);
    const url = new URL(request.url);
    const formatParam = (url.searchParams.get("format") ?? "").toLowerCase();

    if (formatParam === "zip" || formatParam === "all") {
      const formatsParam = url.searchParams.get("formats");
      const formats = formatsParam
        ? (formatsParam
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter((item): item is ExportFormat =>
              ["md", "pdf", "xlsx", "pptx"].includes(item),
            ) as ExportFormat[])
        : undefined;
      const exported = await exportReportZip({
        reportId: id,
        organizationId,
        formats,
      });
      void logReportExported({
        projectId: report.projectId,
        actorId: session.userId,
        reportId: report.id,
        title: report.title,
        format: "zip",
      }).catch(() => undefined);
      return new Response(new Uint8Array(exported.buffer), {
        headers: {
          "Content-Type": exported.contentType,
          "Content-Disposition": `attachment; filename="${exported.fileName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const format = normalizeExportFormat(url.searchParams.get("format"), report.reportType);

    const exported = await exportReportBinary({
      reportId: id,
      organizationId,
      format,
    });

    void logReportExported({
      projectId: report.projectId,
      actorId: session.userId,
      reportId: report.id,
      title: report.title,
      format,
    }).catch(() => undefined);

    return new Response(new Uint8Array(exported.buffer), {
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${exported.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleApiError(error);
    }
    if (error instanceof Error && error.message === "Report not found") {
      return apiError("NOT_FOUND", "Report not found", 404);
    }
    console.error(error);
    const detail =
      error instanceof Error && error.message.includes("unsupported number")
        ? "PDF layout failed on this report body. Try Markdown or Excel, or regenerate and export again."
        : error instanceof Error
          ? error.message
          : "Failed to export report";
    return apiError("EXPORT_FAILED", detail.slice(0, 240), 500);
  }
}
