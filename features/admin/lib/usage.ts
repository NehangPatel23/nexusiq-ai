import { prisma } from "@/lib/db";

import { documentsInOrgWhere, projectsInOrgWhere } from "./org-scope";

export type DayBucket = { date: string; count: number };

export type OrgUsageStats = {
  members: number;
  projects: number;
  documents: number;
  documentsByStatus: {
    pending: number;
    processing: number;
    ready: number;
    failed: number;
  };
  chunks: number;
  agentRuns: number;
  consensusRuns: number;
  simulationRuns: number;
  reports: number;
  tasks: number;
  storageBytes: number;
  series: {
    uploads: DayBucket[];
    agentRuns: DayBucket[];
  };
};

function emptyDays(days: number): Map<string, number> {
  const map = new Map<string, number>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  return map;
}

function toSeries(map: Map<string, number>): DayBucket[] {
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

export async function getOrgUsageStats(
  organizationId: string,
  options: { days?: number } = {},
): Promise<OrgUsageStats> {
  const days = Math.min(Math.max(options.days ?? 30, 7), 90);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const projectWhere = projectsInOrgWhere(organizationId);
  const docWhere = documentsInOrgWhere(organizationId);

  const [
    members,
    projects,
    documentsByStatus,
    storageAgg,
    chunks,
    agentRuns,
    consensusRuns,
    simulationRuns,
    reports,
    tasks,
    recentUploads,
    recentAgentRuns,
  ] = await Promise.all([
    prisma.organizationMember.count({
      where: {
        organizationId,
        user: { deletedAt: null },
      },
    }),
    prisma.project.count({ where: projectWhere }),
    prisma.document.groupBy({
      by: ["status"],
      where: docWhere,
      _count: { _all: true },
    }),
    prisma.document.aggregate({
      where: docWhere,
      _sum: { fileSize: true },
      _count: { _all: true },
    }),
    prisma.documentChunk.count({
      where: {
        document: docWhere,
      },
    }),
    prisma.agentRun.count({
      where: { project: projectWhere },
    }),
    prisma.consensusRun.count({
      where: { project: projectWhere },
    }),
    prisma.simulationRun.count({
      where: { project: projectWhere },
    }),
    prisma.report.count({
      where: { project: projectWhere },
    }),
    prisma.task.count({
      where: { project: projectWhere, deletedAt: null },
    }),
    prisma.document.findMany({
      where: { ...docWhere, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.agentRun.findMany({
      where: { project: projectWhere, startedAt: { gte: since } },
      select: { startedAt: true },
    }),
  ]);

  const statusCounts = {
    pending: 0,
    processing: 0,
    ready: 0,
    failed: 0,
  };
  for (const row of documentsByStatus) {
    if (row.status === "PENDING") statusCounts.pending = row._count._all;
    if (row.status === "PROCESSING") statusCounts.processing = row._count._all;
    if (row.status === "READY") statusCounts.ready = row._count._all;
    if (row.status === "FAILED") statusCounts.failed = row._count._all;
  }

  const uploadMap = emptyDays(days);
  for (const doc of recentUploads) {
    const key = doc.createdAt.toISOString().slice(0, 10);
    if (uploadMap.has(key)) uploadMap.set(key, (uploadMap.get(key) ?? 0) + 1);
  }

  const agentMap = emptyDays(days);
  for (const run of recentAgentRuns) {
    const key = run.startedAt.toISOString().slice(0, 10);
    if (agentMap.has(key)) agentMap.set(key, (agentMap.get(key) ?? 0) + 1);
  }

  return {
    members,
    projects,
    documents: storageAgg._count._all,
    documentsByStatus: statusCounts,
    chunks,
    agentRuns,
    consensusRuns,
    simulationRuns,
    reports,
    tasks,
    storageBytes: storageAgg._sum.fileSize ?? 0,
    series: {
      uploads: toSeries(uploadMap),
      agentRuns: toSeries(agentMap),
    },
  };
}
