import type { FindingSeverity, Prisma } from "@prisma/client";

import {
  EMPTY_SEVERITY_COUNTS,
  type FindingSeverityCounts,
} from "@/features/intelligence/lib/severity-summary";
import { prisma } from "@/lib/db";

export type { FindingSeverityCounts };

const EMPTY_COUNTS = EMPTY_SEVERITY_COUNTS;

function userProjectsFilter(userId: string): Prisma.ProjectWhereInput {
  return {
    deletedAt: null,
    workspace: {
      deletedAt: null,
      organization: {
        deletedAt: null,
        members: { some: { userId } },
      },
    },
  };
}

export function mapSeverityGroups(
  groups: Array<{ severity: FindingSeverity | null; _count: number }>,
): FindingSeverityCounts {
  const counts = { ...EMPTY_COUNTS };
  for (const group of groups) {
    if (group.severity === "CRITICAL") counts.critical = group._count;
    if (group.severity === "HIGH") counts.high = group._count;
    if (group.severity === "MEDIUM") counts.medium = group._count;
    if (group.severity === "LOW") counts.low = group._count;
  }
  return counts;
}

/**
 * Findings accumulate across every agent run, so counting all OPEN rows would
 * multiply results by the number of times an agent has been re-run. The current
 * state is only ever the latest completed run per (project, agent), matching
 * what the intelligence tabs display, so we scope stats to those run ids.
 */
async function latestCompletedRunIds(where: Prisma.AgentRunWhereInput): Promise<string[]> {
  const runs = await prisma.agentRun.findMany({
    where: { ...where, status: "COMPLETED" },
    select: { id: true, projectId: true, agentType: true },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
  });

  const latest = new Map<string, string>();
  for (const run of runs) {
    const key = `${run.projectId}:${run.agentType}`;
    if (!latest.has(key)) latest.set(key, run.id);
  }

  return [...latest.values()];
}

async function countOpenFindings(runIds: string[]): Promise<number> {
  if (runIds.length === 0) return 0;
  return prisma.finding.count({
    where: { status: "OPEN", agentRunId: { in: runIds } },
  });
}

async function countOpenFindingsBySeverity(runIds: string[]): Promise<FindingSeverityCounts> {
  if (runIds.length === 0) return { ...EMPTY_COUNTS };

  const groups = await prisma.finding.groupBy({
    by: ["severity"],
    where: {
      status: "OPEN",
      severity: { not: null },
      agentRunId: { in: runIds },
    },
    _count: { _all: true },
  });

  return mapSeverityGroups(
    groups.map((group) => ({ severity: group.severity, _count: group._count._all })),
  );
}

export async function countOpenFindingsForUser(userId: string): Promise<number> {
  const runIds = await latestCompletedRunIds({ project: userProjectsFilter(userId) });
  return countOpenFindings(runIds);
}

export async function countOpenFindingsBySeverityForUser(
  userId: string,
): Promise<FindingSeverityCounts> {
  const runIds = await latestCompletedRunIds({ project: userProjectsFilter(userId) });
  return countOpenFindingsBySeverity(runIds);
}

export async function countOpenFindingsBySeverityForProject(
  projectId: string,
): Promise<FindingSeverityCounts> {
  const runIds = await latestCompletedRunIds({ projectId });
  return countOpenFindingsBySeverity(runIds);
}
