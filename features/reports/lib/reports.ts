import type { Prisma, ReportFormat, ReportType } from "@prisma/client";

import { AuthError } from "@/features/organizations/lib/authorization";
import { prisma } from "@/lib/db";

import { canDeleteReport, requireProjectReportsAccess, requireReportAccess } from "./authorization";
import type { ReportMetadata } from "./generate-report";

export type ReportSummary = {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  reportType: ReportType;
  format: ReportFormat;
  filePath: string | null;
  formatsAvailable: Array<"md" | "pdf" | "xlsx" | "pptx">;
  createdAt: string;
  updatedAt: string;
};

export type ReportDetail = ReportSummary & {
  content: string;
  metadata: ReportMetadata | null;
};

function parseMetadata(value: Prisma.JsonValue | null): ReportMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as ReportMetadata;
}

function formatsAvailable(
  _metadata: ReportMetadata | null,
  _filePath: string | null,
  _reportType: ReportType,
): Array<"md" | "pdf" | "xlsx" | "pptx"> {
  return ["md", "pdf", "xlsx", "pptx"];
}

function mapSummary(report: {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  reportType: ReportType;
  format: ReportFormat;
  filePath: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): ReportSummary {
  const metadata = parseMetadata(report.metadata);
  return {
    id: report.id,
    projectId: report.projectId,
    userId: report.userId,
    title: report.title,
    reportType: report.reportType,
    format: report.format,
    filePath: report.filePath,
    formatsAvailable: formatsAvailable(metadata, report.filePath, report.reportType),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export async function listProjectReports(projectId: string): Promise<ReportSummary[]> {
  const reports = await prisma.report.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return reports.map(mapSummary);
}

export async function getReportDetail(reportId: string): Promise<ReportDetail | null> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return null;
  const summary = mapSummary(report);
  return {
    ...summary,
    content: report.content,
    metadata: parseMetadata(report.metadata),
  };
}

export async function deleteReport(reportId: string, userId: string) {
  const { report, session } = await requireReportAccess(reportId);
  if (
    !canDeleteReport({
      userId,
      reportUserId: report.userId,
      role: session.membership.role,
    })
  ) {
    throw new AuthError("FORBIDDEN", "Only the report owner or an admin can delete this report");
  }

  await prisma.report.delete({ where: { id: reportId } });
  return { deleted: true as const };
}

export async function updateReportExportCache(params: {
  reportId: string;
  formatKey: "md" | "pdf" | "xlsx" | "pptx";
  storageKey: string;
  setPrimaryFilePath?: boolean;
  exporterVersion?: number;
}) {
  const report = await prisma.report.findUnique({ where: { id: params.reportId } });
  if (!report) throw new AuthError("NOT_FOUND", "Report not found");

  const metadata = parseMetadata(report.metadata) ?? {
    citations: [],
    sourceAgentRunIds: [],
    consensusRunId: null,
    formats: {},
    exportVersions: {},
  };
  metadata.formats = {
    ...(metadata.formats ?? {}),
    [params.formatKey]: params.storageKey,
  };
  metadata.exportVersions = {
    ...(metadata.exportVersions ?? {}),
    [params.formatKey]: params.exporterVersion ?? (params.formatKey === "pdf" ? 5 : 1),
  };

  return prisma.report.update({
    where: { id: params.reportId },
    data: {
      metadata: metadata as Prisma.InputJsonValue,
      ...(params.setPrimaryFilePath ? { filePath: params.storageKey } : {}),
    },
  });
}

export async function renameReport(reportId: string, userId: string, title: string) {
  const { report, session } = await requireReportAccess(reportId);
  if (
    !canDeleteReport({
      userId,
      reportUserId: report.userId,
      role: session.membership.role,
    })
  ) {
    throw new AuthError("FORBIDDEN", "Only the report owner or an admin can rename this report");
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { title: title.trim() },
  });
  return mapSummary(updated);
}

export async function duplicateReport(reportId: string, userId: string, title?: string) {
  const { report } = await requireReportAccess(reportId);
  const metadata = parseMetadata(report.metadata);
  const clonedMeta: ReportMetadata = {
    citations: metadata?.citations ?? [],
    sourceAgentRunIds: metadata?.sourceAgentRunIds ?? [],
    consensusRunId: metadata?.consensusRunId ?? null,
    insufficientContext: metadata?.insufficientContext,
    slideOutline: metadata?.slideOutline,
    formats: { md: "inline" },
    generatedWithOllama: metadata?.generatedWithOllama,
    riskRegisterRows: metadata?.riskRegisterRows,
    actionPlanItems: metadata?.actionPlanItems,
    snapshotAsOf: metadata?.snapshotAsOf,
  };

  const created = await prisma.report.create({
    data: {
      projectId: report.projectId,
      userId,
      title: title?.trim() || `${report.title} (copy)`,
      reportType: report.reportType,
      content: report.content,
      format: "MARKDOWN",
      metadata: clonedMeta as Prisma.InputJsonValue,
    },
  });

  return mapSummary(created);
}

export { requireProjectReportsAccess, requireReportAccess };
