import type { ReportType } from "@prisma/client";

import { buildDeckFromReport } from "@/features/reports/lib/build-deck";
import type { ReportMetadata } from "@/features/reports/lib/generate-report";
import { updateReportExportCache } from "@/features/reports/lib/reports";
import {
  exportMarkdownBuffer,
  markdownContentType,
  markdownFileName,
} from "@/lib/export/markdown";
import { exportPdfBuffer, pdfContentType, pdfFileName, REPORT_PDF_EXPORTER_VERSION } from "@/lib/export/pdf";
import {
  exportPptxBuffer,
  pptxContentType,
  pptxFileName,
  REPORT_PPTX_EXPORTER_VERSION,
} from "@/lib/export/pptx";
import { exportRiskRegisterXlsx, xlsxContentType, xlsxFileName } from "@/lib/export/xlsx";
import { prisma } from "@/lib/db";
import { buildReportStorageKey, getStorage } from "@/lib/storage";

import { buildRiskRegisterRows } from "@/features/reports/lib/assemble";

export type ExportFormat = "md" | "pdf" | "xlsx" | "pptx";

export function normalizeExportFormat(
  raw: string | null,
  reportType: ReportType,
): ExportFormat {
  const value = (raw ?? "").toLowerCase();
  if (value === "markdown") return "md";
  if (value === "md" || value === "pdf" || value === "xlsx" || value === "pptx") {
    return value;
  }
  if (reportType === "RISK_REGISTER") return "xlsx";
  if (reportType === "PPTX") return "pptx";
  return "pdf";
}

function parseFindingsFromContent(content: string, projectName: string) {
  // Prefer reconstructing rows from the markdown table for RISK_REGISTER exports.
  void projectName;
  const rows: Array<{
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    category: string;
    agent: string;
    title: string;
    description: string;
    citation: string;
    status: string;
    citationIndex: number | null;
    documentId: string | null;
    chunkId: string | null;
    score: number | null;
    remediation: string;
  }> = [];

  for (const line of content.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---") || line.includes("Severity")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 6) continue;
    const [severity, category, agent, title, citation, status] = cells;
    if (!title || title === "No open findings") continue;
    const docMatch = citation?.match(/doc:([^\s/]+)/);
    const chunkMatch = citation?.match(/chunk:([^\s)/]+)/);
    rows.push({
      severity: (severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN") || "UNKNOWN",
      category: category ?? "",
      agent: agent ?? "",
      title,
      description: "",
      citation: citation ?? "—",
      status: status ?? "OPEN",
      citationIndex: null,
      documentId: docMatch?.[1] ?? null,
      chunkId: chunkMatch?.[1] ?? null,
      score: null,
      remediation: "",
    });
  }
  return rows;
}

export async function exportReportBinary(params: {
  reportId: string;
  organizationId: string;
  format: ExportFormat;
}): Promise<{
  buffer: Buffer;
  contentType: string;
  fileName: string;
  storageKey: string;
}> {
  const report = await prisma.report.findUnique({
    where: { id: params.reportId },
    include: {
      project: { select: { name: true, id: true } },
    },
  });
  if (!report) {
    throw new Error("Report not found");
  }

  const metadata =
    report.metadata && typeof report.metadata === "object" && !Array.isArray(report.metadata)
      ? (report.metadata as unknown as ReportMetadata)
      : null;

  const cachedKey = metadata?.formats?.[params.format];
  const cachedVersion = metadata?.exportVersions?.[params.format];
  const requiredVersion =
    params.format === "pdf"
      ? REPORT_PDF_EXPORTER_VERSION
      : params.format === "pptx"
        ? REPORT_PPTX_EXPORTER_VERSION
        : 1;
  if (
    cachedKey &&
    cachedKey !== "inline" &&
    (cachedVersion ?? 0) >= requiredVersion
  ) {
    try {
      const buffer = await getStorage().getObject(cachedKey);
      return {
        buffer,
        contentType: contentTypeFor(params.format),
        fileName: fileNameFor(params.format, report.title, report.id),
        storageKey: cachedKey,
      };
    } catch {
      // regenerate below
    }
  }

  let buffer: Buffer;
  let fileName: string;
  let contentType: string;

  switch (params.format) {
    case "md": {
      buffer = exportMarkdownBuffer(report.content);
      fileName = markdownFileName(report.title, report.id);
      contentType = markdownContentType();
      break;
    }
    case "pdf": {
      buffer = await exportPdfBuffer({
        title: report.title,
        markdown: report.content,
        citations: metadata?.citations ?? [],
        reportType: report.reportType,
      });
      fileName = pdfFileName(report.title, report.id);
      contentType = pdfContentType();
      break;
    }
    case "xlsx": {
      const metadataRows = metadata?.riskRegisterRows;
      let rows =
        metadataRows && metadataRows.length > 0
          ? metadataRows
          : parseFindingsFromContent(report.content, report.project.name);

      if (rows.length === 0) {
        const findings = await prisma.finding.findMany({
          where: {
            projectId: report.projectId,
            status: { in: ["OPEN", "ACKNOWLEDGED"] },
          },
          orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
          take: 200,
        });
        rows = buildRiskRegisterRows(
          findings.map((f) => ({
            id: f.id,
            projectId: f.projectId,
            agentType: f.agentType,
            agentRunId: f.agentRunId,
            category: f.category,
            title: f.title,
            description: f.description,
            severity: f.severity,
            score: f.score,
            sourceChunkId: f.sourceChunkId,
            documentId: f.documentId,
            metadata:
              f.metadata && typeof f.metadata === "object" && !Array.isArray(f.metadata)
                ? (f.metadata as Record<string, unknown>)
                : null,
            status: f.status,
            createdAt: f.createdAt.toISOString(),
            updatedAt: f.updatedAt.toISOString(),
          })),
          metadata?.citations ?? [],
        );
      }

      buffer = await exportRiskRegisterXlsx({
        rows,
        projectName: report.project.name,
        reportTitle: report.title,
        includeSummarySheet: true,
      });
      fileName = xlsxFileName(report.title, report.id);
      contentType = xlsxContentType();
      break;
    }
    case "pptx": {
      const deck = buildDeckFromReport({
        title: report.title,
        projectName: report.project.name,
        reportType: report.reportType,
        content: report.content,
        citations: metadata?.citations ?? [],
        slideOutline: metadata?.slideOutline ?? null,
        riskRegisterRows: metadata?.riskRegisterRows ?? null,
        actionPlanItems: metadata?.actionPlanItems ?? null,
        generatedAt: new Date(report.createdAt).toLocaleString(),
      });
      buffer = await exportPptxBuffer({
        deck,
        projectName: report.project.name,
      });
      fileName = pptxFileName(report.title, report.id);
      contentType = pptxContentType();
      break;
    }
    default:
      throw new Error(`Unsupported export format: ${params.format}`);
  }

  const storageKey = buildReportStorageKey({
    organizationId: params.organizationId,
    projectId: report.projectId,
    reportId: report.id,
    format: params.format,
    fileName,
  });

  try {
    await getStorage().putObject(storageKey, buffer, contentType);
    await updateReportExportCache({
      reportId: report.id,
      formatKey: params.format,
      storageKey,
      setPrimaryFilePath: params.format !== "md",
      exporterVersion:
        params.format === "pdf"
          ? REPORT_PDF_EXPORTER_VERSION
          : params.format === "pptx"
            ? REPORT_PPTX_EXPORTER_VERSION
            : 1,
    });
  } catch (error) {
    // Still serve the download when persistence/cache is unavailable.
    console.error("Report export cache write failed:", error);
  }

  return { buffer, contentType, fileName, storageKey };
}

export async function exportReportZip(params: {
  reportId: string;
  organizationId: string;
  formats?: ExportFormat[];
}): Promise<{
  buffer: Buffer;
  contentType: string;
  fileName: string;
}> {
  const JSZip = (await import("jszip")).default;
  const report = await prisma.report.findUnique({ where: { id: params.reportId } });
  if (!report) throw new Error("Report not found");

  const formats = params.formats?.length
    ? params.formats
    : (["md", "pdf", "xlsx", "pptx"] as ExportFormat[]);

  const zip = new JSZip();
  for (const format of formats) {
    try {
      const exported = await exportReportBinary({
        reportId: params.reportId,
        organizationId: params.organizationId,
        format,
      });
      zip.file(exported.fileName, exported.buffer);
    } catch (error) {
      console.error(`Zip member export failed for ${format}:`, error);
    }
  }

  const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  const safe = report.title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 50) || "report";
  return {
    buffer,
    contentType: "application/zip",
    fileName: `${safe}-${report.id.slice(0, 8)}-exports.zip`,
  };
}

function contentTypeFor(format: ExportFormat): string {
  switch (format) {
    case "md":
      return markdownContentType();
    case "pdf":
      return pdfContentType();
    case "xlsx":
      return xlsxContentType();
    case "pptx":
      return pptxContentType();
  }
}

function fileNameFor(format: ExportFormat, title: string, reportId: string): string {
  switch (format) {
    case "md":
      return markdownFileName(title, reportId);
    case "pdf":
      return pdfFileName(title, reportId);
    case "xlsx":
      return xlsxFileName(title, reportId);
    case "pptx":
      return pptxFileName(title, reportId);
  }
}
