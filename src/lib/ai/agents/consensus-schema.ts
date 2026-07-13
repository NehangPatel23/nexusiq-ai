import { z } from "zod";

import type { ConfidenceLevel } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";
import type { SpecialistAgentType } from "@/lib/ai/agents/types";

function normalizeEnumString(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

function coerceOptionalString(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value;
}

function normalizeAgentName(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().toUpperCase();
  const aliases: Record<string, SpecialistAgentType> = {
    FINANCIAL: "FINANCIAL",
    FINANCE: "FINANCIAL",
    LEGAL: "LEGAL",
    COMPLIANCE: "COMPLIANCE",
    RISK: "RISK",
    FRAUD: "FRAUD",
  };
  return aliases[trimmed] ?? trimmed;
}

const confidenceSchema = z.preprocess(
  normalizeEnumString,
  z.enum(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]),
);

const optionalStringSchema = z.preprocess(coerceOptionalString, z.string().optional());

export const consensusAgentOpinionSchema = z.object({
  agent: z.preprocess(
    normalizeAgentName,
    z.enum(["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD"]),
  ),
  score: z.number().nullable().optional(),
  recommendation: z.string(),
  confidence: confidenceSchema,
});

export const consensusAgreementSchema = z.object({
  topic: z.string(),
  agents: z.array(z.string()).default([]),
  summary: z.string(),
});

export const consensusConflictSchema = z.object({
  topic: z.string(),
  positions: z
    .array(
      z.object({
        agent: z.string(),
        position: z.string(),
      }),
    )
    .default([]),
  severity: z.string(),
});

export const consensusCitationSchema = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  excerpt: optionalStringSchema,
  documentName: optionalStringSchema,
});

export const consensusOutputSchema = z.object({
  agentOpinions: z.array(consensusAgentOpinionSchema).min(1),
  agreements: z.array(consensusAgreementSchema).default([]),
  conflicts: z.array(consensusConflictSchema).default([]),
  resolutionRationale: z.string(),
  finalRecommendation: z.string(),
  decisionConfidence: confidenceSchema,
  citations: z.array(consensusCitationSchema).default([]),
});

export type ConsensusOutput = z.infer<typeof consensusOutputSchema>;
export type ConsensusAgentOpinion = z.infer<typeof consensusAgentOpinionSchema>;

export type SpecialistConsensusInput = {
  agent: SpecialistAgentType;
  runId: string;
  score: number | null;
  recommendation: string;
  confidence: ConfidenceLevel;
  findingsSummary: string[];
  citations: ChatCitation[];
};

export function formatConsensusValidationErrors(error: z.ZodError): string {
  const extra = error.issues.length > 12 ? `\n- ...and ${error.issues.length - 12} more` : "";
  const lines = error.issues
    .slice(0, 12)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
  return `${lines}${extra}`;
}

export function parseConsensusJsonResult(
  raw: string,
): { success: true; data: ConsensusOutput } | { success: false; error: z.ZodError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Response was not valid JSON",
        },
      ]),
    };
  }

  const result = consensusOutputSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Prefer stored AgentRun recommendation/score/confidence over LLM-drifted values.
 */
export function preserveAgentOpinions(
  modelOpinions: ConsensusAgentOpinion[],
  sourceRuns: SpecialistConsensusInput[],
): ConsensusAgentOpinion[] {
  const byAgent = new Map(sourceRuns.map((run) => [run.agent, run]));
  const preserved: ConsensusAgentOpinion[] = [];

  for (const run of sourceRuns) {
    preserved.push({
      agent: run.agent,
      score: run.score,
      recommendation: run.recommendation,
      confidence: run.confidence,
    });
  }

  // Keep any unexpected model opinions that do not map to specialists (defensive).
  for (const opinion of modelOpinions) {
    if (!byAgent.has(opinion.agent as SpecialistAgentType)) {
      preserved.push(opinion);
    }
  }

  return preserved;
}

export function validateConsensusCitations(
  citations: ConsensusOutput["citations"],
  allowed: ChatCitation[],
): ChatCitation[] {
  const allowedKeys = new Set(allowed.map((citation) => `${citation.documentId}:${citation.chunkId}`));
  const byKey = new Map(allowed.map((citation) => [`${citation.documentId}:${citation.chunkId}`, citation]));
  const result: ChatCitation[] = [];

  for (const citation of citations) {
    const key = `${citation.documentId}:${citation.chunkId}`;
    if (!allowedKeys.has(key)) continue;
    const source = byKey.get(key);
    if (!source) continue;
    result.push({
      documentId: source.documentId,
      chunkId: source.chunkId,
      documentName: source.documentName,
      excerpt: citation.excerpt?.trim() || source.excerpt,
    });
  }

  return result;
}

export function missingSpecialistAgents(completed: SpecialistAgentType[]): SpecialistAgentType[] {
  const present = new Set(completed);
  return (["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD"] as const).filter(
    (agent) => !present.has(agent),
  );
}

export function __testables() {
  return {
    normalizeAgentName,
    preserveAgentOpinions,
    missingSpecialistAgents,
    validateConsensusCitations,
  };
}
