import { AuthError } from "@/features/organizations/lib/authorization";
import { prisma } from "@/lib/db";

import { requireProjectReportsAccess } from "./authorization";

export type ReportCompareResult = {
  left: {
    id: string;
    title: string;
    reportType: string;
    createdAt: string;
    contentLength: number;
  };
  right: {
    id: string;
    title: string;
    reportType: string;
    createdAt: string;
    contentLength: number;
  };
  sameType: boolean;
  sectionDiff: {
    onlyLeft: string[];
    onlyRight: string[];
    shared: string[];
  };
  contentChanged: boolean;
  leftPreview: string;
  rightPreview: string;
};

function sectionTitles(content: string): string[] {
  const titles: string[] = [];
  for (const match of content.matchAll(/^##\s+(.+)$/gm)) {
    const title = match[1]?.trim();
    if (title) titles.push(title);
  }
  return titles;
}

export async function compareProjectReports(params: {
  projectId: string;
  leftReportId: string;
  rightReportId: string;
}): Promise<ReportCompareResult> {
  await requireProjectReportsAccess(params.projectId);

  if (params.leftReportId === params.rightReportId) {
    throw new AuthError("FORBIDDEN", "Select two different reports to compare");
  }

  const [left, right] = await Promise.all([
    prisma.report.findUnique({ where: { id: params.leftReportId } }),
    prisma.report.findUnique({ where: { id: params.rightReportId } }),
  ]);

  if (!left || left.projectId !== params.projectId) {
    throw new AuthError("NOT_FOUND", "Left report not found");
  }
  if (!right || right.projectId !== params.projectId) {
    throw new AuthError("NOT_FOUND", "Right report not found");
  }

  const leftSections = sectionTitles(left.content);
  const rightSections = sectionTitles(right.content);
  const leftSet = new Set(leftSections);
  const rightSet = new Set(rightSections);

  return {
    left: {
      id: left.id,
      title: left.title,
      reportType: left.reportType,
      createdAt: left.createdAt.toISOString(),
      contentLength: left.content.length,
    },
    right: {
      id: right.id,
      title: right.title,
      reportType: right.reportType,
      createdAt: right.createdAt.toISOString(),
      contentLength: right.content.length,
    },
    sameType: left.reportType === right.reportType,
    sectionDiff: {
      onlyLeft: leftSections.filter((title) => !rightSet.has(title)),
      onlyRight: rightSections.filter((title) => !leftSet.has(title)),
      shared: leftSections.filter((title) => rightSet.has(title)),
    },
    contentChanged: left.content !== right.content,
    leftPreview: left.content.slice(0, 2500),
    rightPreview: right.content.slice(0, 2500),
  };
}
