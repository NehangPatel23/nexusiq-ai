import type { AgentType, ConfidenceLevel } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";
import type { SpecialistConsensusInput } from "@/lib/ai/agents/consensus-schema";
import type { SpecialistRunSummary } from "@/lib/ai/agents/executive";
import {
  SPECIALIST_AGENT_TYPES,
  type SpecialistAgentType,
} from "@/lib/ai/agents/types";
import { prisma } from "@/lib/db";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function recommendationFromOutput(output: unknown, fallback: string): string {
  const record = asRecord(output);
  const recommendation = record?.recommendation;
  return typeof recommendation === "string" && recommendation.trim()
    ? recommendation.trim()
    : fallback;
}

function citationsFromJson(value: unknown): ChatCitation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChatCitation => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return typeof record.documentId === "string" && typeof record.chunkId === "string";
  });
}

function findingsSummaryFromRows(
  findings: Array<{ title: string; description: string; category: string }>,
): string[] {
  return findings.slice(0, 5).map((finding) => `${finding.category}: ${finding.title} — ${finding.description}`);
}

export async function getLatestCompletedSpecialistRuns(
  projectId: string,
): Promise<SpecialistRunSummary[]> {
  const runs = await prisma.agentRun.findMany({
    where: {
      projectId,
      status: "COMPLETED",
      agentType: { in: [...SPECIALIST_AGENT_TYPES] },
    },
    orderBy: { completedAt: "desc" },
    include: {
      findings: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
        take: 5,
      },
    },
  });

  const latest = new Map<SpecialistAgentType, (typeof runs)[number]>();
  for (const run of runs) {
    const agentType = run.agentType as SpecialistAgentType;
    if (!SPECIALIST_AGENT_TYPES.includes(agentType)) continue;
    if (!latest.has(agentType)) {
      latest.set(agentType, run);
    }
  }

  return SPECIALIST_AGENT_TYPES.flatMap((agentType) => {
    const run = latest.get(agentType);
    if (!run) return [];
    return [
      {
        runId: run.id,
        agentType,
        score: run.score,
        recommendation: recommendationFromOutput(run.output, "No recommendation recorded."),
        confidence: (run.confidence ?? "INSUFFICIENT") as ConfidenceLevel,
        findingsSummary: findingsSummaryFromRows(run.findings),
        citations: citationsFromJson(run.citations),
      } satisfies SpecialistRunSummary,
    ];
  });
}

export async function getSpecialistRunsForConsensus(
  projectId: string,
  agentRunIds?: string[],
): Promise<SpecialistConsensusInput[]> {
  if (agentRunIds && agentRunIds.length > 0) {
    const runs = await prisma.agentRun.findMany({
      where: {
        projectId,
        id: { in: agentRunIds },
        status: "COMPLETED",
        agentType: { in: [...SPECIALIST_AGENT_TYPES] },
      },
      include: {
        findings: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
          orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
          take: 5,
        },
      },
    });

    const byId = new Map(runs.map((run) => [run.id, run]));
    return agentRunIds.flatMap((id) => {
      const run = byId.get(id);
      if (!run) return [];
      return [
        {
          agent: run.agentType as SpecialistAgentType,
          runId: run.id,
          score: run.score,
          recommendation: recommendationFromOutput(run.output, "No recommendation recorded."),
          confidence: (run.confidence ?? "INSUFFICIENT") as ConfidenceLevel,
          findingsSummary: findingsSummaryFromRows(run.findings),
          citations: citationsFromJson(run.citations),
        } satisfies SpecialistConsensusInput,
      ];
    });
  }

  const latest = await getLatestCompletedSpecialistRuns(projectId);
  return latest.map((run) => ({
    agent: run.agentType,
    runId: run.runId,
    score: run.score,
    recommendation: run.recommendation,
    confidence: run.confidence,
    findingsSummary: run.findingsSummary,
    citations: run.citations.map((citation) => ({
      documentId: citation.documentId,
      chunkId: citation.chunkId,
      documentName: citation.documentName ?? "Document",
      excerpt: citation.excerpt ?? "",
    })),
  }));
}

export function listMissingSpecialists(
  completed: Array<AgentType | SpecialistAgentType>,
): SpecialistAgentType[] {
  const present = new Set(completed);
  return SPECIALIST_AGENT_TYPES.filter((agent) => !present.has(agent));
}
