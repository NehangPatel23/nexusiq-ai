import type {
  AgentRunStatus,
  AgentType,
  ConfidenceLevel,
  FindingSeverity,
  Prisma,
  RiskStatus,
} from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";
import type { NormalizedFinding } from "@/lib/ai/agents/types";
import { prisma } from "@/lib/db";

export const AGENT_RUN_CACHE_WINDOW_MS = 15 * 60 * 1000;

export type AgentRunSummary = {
  id: string;
  projectId: string;
  agentType: AgentType;
  status: AgentRunStatus;
  score: number | null;
  confidence: ConfidenceLevel | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  findingCount: number;
};

export type FindingItem = {
  id: string;
  projectId: string;
  agentType: AgentType;
  agentRunId: string | null;
  category: string;
  title: string;
  description: string;
  severity: FindingSeverity | null;
  score: number | null;
  sourceChunkId: string | null;
  documentId: string | null;
  metadata: Record<string, unknown> | null;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
};

export type AgentRunDetail = AgentRunSummary & {
  output: Record<string, unknown> | null;
  citations: ChatCitation[];
  findings: FindingItem[];
};

export type AgentRunApiResponse =
  | {
      runId: string;
      agentType: AgentType;
      status: "completed";
      score?: number;
      confidence: ConfidenceLevel;
      findings: Array<{
        id: string;
        category: string;
        title: string;
        description: string;
        severity: FindingSeverity | null;
        sourceChunkId: string | null;
        documentId: string | null;
      }>;
      citations: ChatCitation[];
      output: Record<string, unknown> | null;
      cached?: boolean;
    }
  | {
      runId: string;
      agentType: AgentType;
      status: "failed";
      confidence: ConfidenceLevel;
      findings: [];
      citations: [];
      output: null;
      error: string;
      cached?: boolean;
    };

function mapFinding(finding: {
  id: string;
  projectId: string;
  agentType: AgentType;
  agentRunId: string | null;
  category: string;
  title: string;
  description: string;
  severity: FindingSeverity | null;
  score: number | null;
  sourceChunkId: string | null;
  documentId: string | null;
  metadata: Prisma.JsonValue;
  status: RiskStatus;
  createdAt: Date;
  updatedAt: Date;
}): FindingItem {
  return {
    id: finding.id,
    projectId: finding.projectId,
    agentType: finding.agentType,
    agentRunId: finding.agentRunId,
    category: finding.category,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    score: finding.score,
    sourceChunkId: finding.sourceChunkId,
    documentId: finding.documentId,
    metadata:
      finding.metadata && typeof finding.metadata === "object" && !Array.isArray(finding.metadata)
        ? (finding.metadata as Record<string, unknown>)
        : null,
    status: finding.status,
    createdAt: finding.createdAt.toISOString(),
    updatedAt: finding.updatedAt.toISOString(),
  };
}

export async function createAgentRun(input: {
  projectId: string;
  agentType: AgentType;
  triggeredById?: string;
  inputParams?: Record<string, unknown>;
}) {
  return prisma.agentRun.create({
    data: {
      projectId: input.projectId,
      agentType: input.agentType,
      status: "RUNNING",
      triggeredById: input.triggeredById,
      inputParams: input.inputParams as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function completeAgentRun(input: {
  runId: string;
  output: Record<string, unknown>;
  score: number | null;
  confidence: ConfidenceLevel;
  citations: ChatCitation[];
  findings: NormalizedFinding[];
  projectId: string;
  agentType: AgentType;
}) {
  const completed = await prisma.$transaction(async (tx) => {
    const run = await tx.agentRun.update({
      where: { id: input.runId },
      data: {
        status: "COMPLETED",
        output: input.output as Prisma.InputJsonValue,
        score: input.score,
        confidence: input.confidence,
        citations: input.citations as Prisma.InputJsonValue,
        completedAt: new Date(),
        error: null,
      },
    });

    await tx.finding.updateMany({
      where: {
        projectId: input.projectId,
        agentType: input.agentType,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        agentRunId: { not: input.runId },
      },
      data: { status: "SUPERSEDED" },
    });

    if (input.findings.length > 0) {
      await tx.finding.createMany({
        data: input.findings.map((finding) => ({
          projectId: input.projectId,
          agentType: input.agentType,
          agentRunId: input.runId,
          category: finding.category,
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          score: finding.score,
          sourceChunkId: finding.sourceChunkId,
          documentId: finding.documentId,
          metadata: finding.metadata as Prisma.InputJsonValue | undefined,
        })),
      });
    }

    return run;
  });

  const findings = await prisma.finding.findMany({
    where: { agentRunId: input.runId },
    orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
  });

  return { run: completed, findings };
}

export async function failAgentRun(runId: string, error: string) {
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      error,
      completedAt: new Date(),
    },
  });
}

export async function listAgentRuns(projectId: string, options?: { agentType?: AgentType; limit?: number }) {
  const runs = await prisma.agentRun.findMany({
    where: {
      projectId,
      ...(options?.agentType ? { agentType: options.agentType } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: options?.limit ?? 20,
    include: {
      _count: { select: { findings: true } },
    },
  });

  return runs.map((run) => ({
    id: run.id,
    projectId: run.projectId,
    agentType: run.agentType,
    status: run.status,
    score: run.score,
    confidence: run.confidence,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    error: run.error,
    findingCount: run._count.findings,
  })) satisfies AgentRunSummary[];
}

export async function getLatestCompletedRunsByAgent(projectId: string) {
  const runs = await listAgentRuns(projectId, { limit: 50 });
  const latest = new Map<AgentType, AgentRunSummary>();

  for (const run of runs) {
    if (run.status !== "COMPLETED") continue;
    if (!latest.has(run.agentType)) {
      latest.set(run.agentType, run);
    }
  }

  return latest;
}

export async function getAgentRunWithFindings(runId: string): Promise<AgentRunDetail | null> {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: {
      findings: { orderBy: [{ severity: "asc" }, { createdAt: "asc" }] },
      _count: { select: { findings: true } },
    },
  });

  if (!run) return null;

  return {
    id: run.id,
    projectId: run.projectId,
    agentType: run.agentType,
    status: run.status,
    score: run.score,
    confidence: run.confidence,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    error: run.error,
    findingCount: run._count.findings,
    output:
      run.output && typeof run.output === "object" && !Array.isArray(run.output)
        ? (run.output as Record<string, unknown>)
        : null,
    citations: Array.isArray(run.citations) ? (run.citations as ChatCitation[]) : [],
    findings: run.findings.map(mapFinding),
  };
}

export async function getRunningAgentRun(projectId: string, agentType: AgentType) {
  return prisma.agentRun.findFirst({
    where: { projectId, agentType, status: "RUNNING" },
    orderBy: { startedAt: "desc" },
  });
}

export async function getRecentCompletedAgentRun(
  projectId: string,
  agentType: AgentType,
  maxAgeMs = AGENT_RUN_CACHE_WINDOW_MS,
) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  return prisma.agentRun.findFirst({
    where: {
      projectId,
      agentType,
      status: "COMPLETED",
      completedAt: { gte: cutoff },
    },
    orderBy: { completedAt: "desc" },
  });
}

export function buildAgentRunApiResponse(
  detail: AgentRunDetail,
  options?: { cached?: boolean },
): AgentRunApiResponse {
  if (detail.status === "FAILED") {
    return {
      runId: detail.id,
      agentType: detail.agentType,
      status: "failed",
      confidence: detail.confidence ?? "INSUFFICIENT",
      findings: [],
      citations: [],
      output: null,
      error: detail.error ?? "Agent run failed.",
      cached: options?.cached,
    };
  }

  return {
    runId: detail.id,
    agentType: detail.agentType,
    status: "completed",
    score: detail.score ?? undefined,
    confidence: detail.confidence ?? "INSUFFICIENT",
    findings: detail.findings.map((finding) => ({
      id: finding.id,
      category: finding.category,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      sourceChunkId: finding.sourceChunkId,
      documentId: finding.documentId,
    })),
    citations: detail.citations,
    output: detail.output,
    cached: options?.cached,
  };
}
