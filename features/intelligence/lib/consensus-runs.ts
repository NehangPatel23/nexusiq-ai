import type { ConfidenceLevel, Prisma } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";
import type { ConsensusOutput } from "@/lib/ai/agents/consensus-schema";
import { prisma } from "@/lib/db";

export const CONSENSUS_RUN_CACHE_WINDOW_MS = 15 * 60 * 1000;

export type ConsensusRunSummary = {
  id: string;
  projectId: string;
  decisionConfidence: ConfidenceLevel;
  finalRecommendation: string;
  agentRunIds: string[];
  createdAt: string;
};

export type ConsensusRunDetail = ConsensusRunSummary & {
  agreements: ConsensusOutput["agreements"];
  conflicts: ConsensusOutput["conflicts"];
  resolutionRationale: string;
  agentOpinions: ConsensusOutput["agentOpinions"];
  citations: ChatCitation[];
  triggeredById: string | null;
};

export type ConsensusRunApiResponse = {
  consensusRunId: string;
  projectId: string;
  status: "completed";
  finalRecommendation: string;
  decisionConfidence: ConfidenceLevel;
  agentOpinions: ConsensusOutput["agentOpinions"];
  agreements: ConsensusOutput["agreements"];
  conflicts: ConsensusOutput["conflicts"];
  resolutionRationale: string;
  citations: ChatCitation[];
  agentRunIds: string[];
  cached?: boolean;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapConsensusRun(run: {
  id: string;
  projectId: string;
  agentRunIds: string[];
  finalRecommendation: string;
  decisionConfidence: ConfidenceLevel;
  agreements: Prisma.JsonValue;
  conflicts: Prisma.JsonValue;
  resolutionRationale: string;
  agentOpinions: Prisma.JsonValue;
  citations: Prisma.JsonValue;
  triggeredById: string | null;
  createdAt: Date;
}): ConsensusRunDetail {
  return {
    id: run.id,
    projectId: run.projectId,
    agentRunIds: run.agentRunIds,
    finalRecommendation: run.finalRecommendation,
    decisionConfidence: run.decisionConfidence,
    agreements: asArray(run.agreements),
    conflicts: asArray(run.conflicts),
    resolutionRationale: run.resolutionRationale,
    agentOpinions: asArray(run.agentOpinions),
    citations: Array.isArray(run.citations) ? (run.citations as ChatCitation[]) : [],
    triggeredById: run.triggeredById,
    createdAt: run.createdAt.toISOString(),
  };
}

export async function createConsensusRun(input: {
  projectId: string;
  agentRunIds: string[];
  finalRecommendation: string;
  decisionConfidence: ConfidenceLevel;
  agreements: ConsensusOutput["agreements"];
  conflicts: ConsensusOutput["conflicts"];
  resolutionRationale: string;
  agentOpinions: ConsensusOutput["agentOpinions"];
  citations: ChatCitation[];
  triggeredById?: string;
}) {
  return prisma.consensusRun.create({
    data: {
      projectId: input.projectId,
      agentRunIds: input.agentRunIds,
      finalRecommendation: input.finalRecommendation,
      decisionConfidence: input.decisionConfidence,
      agreements: input.agreements as Prisma.InputJsonValue,
      conflicts: input.conflicts as Prisma.InputJsonValue,
      resolutionRationale: input.resolutionRationale,
      agentOpinions: input.agentOpinions as Prisma.InputJsonValue,
      citations: input.citations as Prisma.InputJsonValue,
      triggeredById: input.triggeredById,
    },
  });
}

export async function getConsensusRunById(id: string): Promise<ConsensusRunDetail | null> {
  const run = await prisma.consensusRun.findUnique({ where: { id } });
  if (!run) return null;
  return mapConsensusRun(run);
}

export async function getLatestConsensusRun(projectId: string): Promise<ConsensusRunDetail | null> {
  const run = await prisma.consensusRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return null;
  return mapConsensusRun(run);
}

export async function getRecentConsensusRun(
  projectId: string,
  maxAgeMs = CONSENSUS_RUN_CACHE_WINDOW_MS,
): Promise<ConsensusRunDetail | null> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const run = await prisma.consensusRun.findFirst({
    where: { projectId, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return null;
  return mapConsensusRun(run);
}

export async function listConsensusRuns(
  projectId: string,
  options?: { limit?: number },
): Promise<ConsensusRunSummary[]> {
  const runs = await prisma.consensusRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 20,
  });

  return runs.map((run) => ({
    id: run.id,
    projectId: run.projectId,
    decisionConfidence: run.decisionConfidence,
    finalRecommendation: run.finalRecommendation,
    agentRunIds: run.agentRunIds,
    createdAt: run.createdAt.toISOString(),
  }));
}

export function buildConsensusApiResponse(
  detail: ConsensusRunDetail,
  options?: { cached?: boolean },
): ConsensusRunApiResponse {
  return {
    consensusRunId: detail.id,
    projectId: detail.projectId,
    status: "completed",
    finalRecommendation: detail.finalRecommendation,
    decisionConfidence: detail.decisionConfidence,
    agentOpinions: detail.agentOpinions,
    agreements: detail.agreements,
    conflicts: detail.conflicts,
    resolutionRationale: detail.resolutionRationale,
    citations: detail.citations,
    agentRunIds: detail.agentRunIds,
    cached: options?.cached,
  };
}
