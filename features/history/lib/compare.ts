import type { AgentType, ConfidenceLevel } from "@prisma/client";

import { getLatestCompletedRunsByAgent } from "@/features/intelligence/lib/agent-runs";
import { getLatestConsensusRun } from "@/features/intelligence/lib/consensus-runs";
import {
  EMPTY_SEVERITY_COUNTS,
  type FindingSeverityCounts,
} from "@/features/intelligence/lib/severity-summary";
import { prisma } from "@/lib/db";
import { AGENT_TYPE_LABELS } from "@/lib/ai/agents/types";

const COMPARE_AGENT_TYPES: AgentType[] = [
  "FINANCIAL",
  "LEGAL",
  "COMPLIANCE",
  "RISK",
  "FRAUD",
  "EXECUTIVE",
];

export type ProjectCompareSnapshot = {
  projectId: string;
  projectName: string;
  agentScores: Record<AgentType, number | null>;
  consensusConfidence: ConfidenceLevel | null;
  findingSeverityCounts: FindingSeverityCounts;
  openContradictionCount: number;
  openMissingCount: number;
};

export type ProjectCompareResult = {
  projectA: ProjectCompareSnapshot;
  projectB: ProjectCompareSnapshot;
  scoreDiffs: Array<{
    agentType: AgentType;
    label: string;
    scoreA: number | null;
    scoreB: number | null;
    diff: number | null;
  }>;
};

async function latestCompletedRunIds(projectId: string): Promise<string[]> {
  const runs = await prisma.agentRun.findMany({
    where: { projectId, status: "COMPLETED" },
    select: { id: true, agentType: true },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
  });
  const latest = new Map<string, string>();
  for (const run of runs) {
    if (!latest.has(run.agentType)) latest.set(run.agentType, run.id);
  }
  return [...latest.values()];
}

async function buildSnapshot(projectId: string): Promise<ProjectCompareSnapshot> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const runIds = await latestCompletedRunIds(projectId);
  const [latestByAgent, consensus, findings, openContradictionCount, openMissingCount] =
    await Promise.all([
      getLatestCompletedRunsByAgent(projectId),
      getLatestConsensusRun(projectId),
      runIds.length === 0
        ? Promise.resolve([])
        : prisma.finding.findMany({
            where: {
              projectId,
              agentRunId: { in: runIds },
              status: "OPEN",
            },
            select: { severity: true },
          }),
      prisma.contradiction.count({ where: { projectId, status: "OPEN" } }),
      prisma.missingItem.count({
        where: { projectId, status: { in: ["OPEN", "REQUESTED"] } },
      }),
    ]);

  const agentScores = Object.fromEntries(
    COMPARE_AGENT_TYPES.map((type) => [type, latestByAgent.get(type)?.score ?? null]),
  ) as Record<AgentType, number | null>;

  const findingSeverityCounts = { ...EMPTY_SEVERITY_COUNTS };
  for (const finding of findings) {
    switch (finding.severity) {
      case "CRITICAL":
        findingSeverityCounts.critical += 1;
        break;
      case "HIGH":
        findingSeverityCounts.high += 1;
        break;
      case "MEDIUM":
        findingSeverityCounts.medium += 1;
        break;
      case "LOW":
        findingSeverityCounts.low += 1;
        break;
      default:
        break;
    }
  }

  return {
    projectId: project.id,
    projectName: project.name,
    agentScores,
    consensusConfidence: consensus?.decisionConfidence ?? null,
    findingSeverityCounts,
    openContradictionCount,
    openMissingCount,
  };
}

export async function compareProjects(
  projectAId: string,
  projectBId: string,
): Promise<ProjectCompareResult> {
  const [projectA, projectB] = await Promise.all([
    buildSnapshot(projectAId),
    buildSnapshot(projectBId),
  ]);

  const scoreDiffs = COMPARE_AGENT_TYPES.map((agentType) => {
    const scoreA = projectA.agentScores[agentType];
    const scoreB = projectB.agentScores[agentType];
    const diff =
      scoreA !== null && scoreB !== null ? Math.round((scoreA - scoreB) * 10) / 10 : null;
    return {
      agentType,
      label: AGENT_TYPE_LABELS[agentType],
      scoreA,
      scoreB,
      diff,
    };
  });

  return { projectA, projectB, scoreDiffs };
}

export async function assertProjectsInOrganization(
  organizationId: string,
  projectIds: string[],
): Promise<boolean> {
  const count = await prisma.project.count({
    where: {
      id: { in: projectIds },
      deletedAt: null,
      workspace: { organizationId, deletedAt: null },
    },
  });
  return count === projectIds.length;
}

export async function listOrganizationProjectsForCompare(organizationId: string) {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
      workspace: { organizationId, deletedAt: null },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
