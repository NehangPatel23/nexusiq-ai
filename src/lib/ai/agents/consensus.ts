import type { ConfidenceLevel } from "@prisma/client";

import type { ChatCitation } from "@/lib/ai/citations";
import { getOllamaClient, type ChatMessage, type OllamaClient } from "@/lib/ai/ollama-client";

import {
  formatConsensusValidationErrors,
  missingSpecialistAgents,
  parseConsensusJsonResult,
  preserveAgentOpinions,
  type ConsensusOutput,
  type SpecialistConsensusInput,
  validateConsensusCitations,
} from "./consensus-schema";
import { loadConsensusSystemPrompt } from "./prompts";
import { OllamaUnavailableError } from "./run-agent";
import type { SpecialistAgentType } from "./types";

export class ConsensusPrerequisiteError extends Error {
  readonly code = "CONSENSUS_PREREQUISITE";
  readonly missingAgents: SpecialistAgentType[];

  constructor(missingAgents: SpecialistAgentType[]) {
    const labels = missingAgents.map((agent) => agent.charAt(0) + agent.slice(1).toLowerCase());
    super(
      `Consensus requires at least 3 completed specialist agent runs. Run these agents first: ${labels.join(", ")}.`,
    );
    this.name = "ConsensusPrerequisiteError";
    this.missingAgents = missingAgents;
  }
}

export type ConsensusEngineResult = {
  finalRecommendation: string;
  decisionConfidence: ConfidenceLevel;
  agentOpinions: ConsensusOutput["agentOpinions"];
  agreements: ConsensusOutput["agreements"];
  conflicts: ConsensusOutput["conflicts"];
  resolutionRationale: string;
  citations: ChatCitation[];
  agentRunIds: string[];
  usedModel: boolean;
};

type ConsensusDependencies = {
  ollama: Pick<OllamaClient, "healthCheck" | "chat">;
  loadSpecialists: (projectId: string, agentRunIds?: string[]) => Promise<SpecialistConsensusInput[]>;
};

async function defaultLoadSpecialists(
  projectId: string,
  agentRunIds?: string[],
): Promise<SpecialistConsensusInput[]> {
  const { getSpecialistRunsForConsensus } = await import(
    "@/features/intelligence/lib/specialist-runs"
  );
  return getSpecialistRunsForConsensus(projectId, agentRunIds);
}

const defaultDependencies = (): ConsensusDependencies => ({
  ollama: getOllamaClient(),
  loadSpecialists: defaultLoadSpecialists,
});

function allInsufficient(runs: SpecialistConsensusInput[]): boolean {
  return runs.length > 0 && runs.every((run) => run.confidence === "INSUFFICIENT");
}

function insufficientConsensus(runs: SpecialistConsensusInput[]): ConsensusEngineResult {
  return {
    finalRecommendation:
      "Insufficient specialist evidence to form a reliable consensus. Re-run the specialist agents after uploading and processing more documents.",
    decisionConfidence: "INSUFFICIENT",
    agentOpinions: runs.map((run) => ({
      agent: run.agent,
      score: run.score,
      recommendation: run.recommendation,
      confidence: run.confidence,
    })),
    agreements: [],
    conflicts: [],
    resolutionRationale:
      "All completed specialist runs reported INSUFFICIENT confidence. No fabricated agreement was synthesized.",
    citations: [],
    agentRunIds: runs.map((run) => run.runId),
    usedModel: false,
  };
}

function buildConsensusCorrectionPrompt(error: import("zod").ZodError): string {
  return `Your previous JSON response did not match the required consensus schema.

Fix every issue below and return ONLY corrected JSON (no prose, no markdown):
${formatConsensusValidationErrors(error)}

Rules:
- Preserve each specialist's original recommendation, score, and confidence in agentOpinions
- Include agreements, conflicts, resolutionRationale, finalRecommendation, and decisionConfidence
- Do not hide dissent`;
}

async function requestConsensusOutput(
  messages: ChatMessage[],
  ollama: Pick<OllamaClient, "chat">,
): Promise<ConsensusOutput> {
  let rawContent: string;
  try {
    rawContent = await ollama.chat(messages, { format: "json", maxTokens: 3000 });
  } catch {
    throw new OllamaUnavailableError();
  }

  const firstAttempt = parseConsensusJsonResult(rawContent);
  if (firstAttempt.success) {
    return firstAttempt.data;
  }

  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: rawContent },
    { role: "user", content: buildConsensusCorrectionPrompt(firstAttempt.error) },
  ];

  let retryContent: string;
  try {
    retryContent = await ollama.chat(retryMessages, { format: "json", maxTokens: 3000 });
  } catch {
    throw new OllamaUnavailableError();
  }

  const secondAttempt = parseConsensusJsonResult(retryContent);
  if (secondAttempt.success) {
    return secondAttempt.data;
  }

  throw new Error(
    `Consensus output validation failed after retry: ${formatConsensusValidationErrors(secondAttempt.error)}`,
  );
}

export async function runConsensusEngine(
  projectId: string,
  options?: { agentRunIds?: string[] },
  dependenciesOverride?: Partial<ConsensusDependencies>,
): Promise<ConsensusEngineResult> {
  const dependencies = { ...defaultDependencies(), ...dependenciesOverride };
  const specialists = await dependencies.loadSpecialists(projectId, options?.agentRunIds);

  if (specialists.length < 3) {
    const missing = missingSpecialistAgents(specialists.map((run) => run.agent));
    throw new ConsensusPrerequisiteError(missing);
  }

  if (allInsufficient(specialists)) {
    return insufficientConsensus(specialists);
  }

  const health = await dependencies.ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError();
  }

  const systemPrompt = loadConsensusSystemPrompt();
  const payload = specialists.map((run) => ({
    agent: run.agent,
    score: run.score,
    recommendation: run.recommendation,
    confidence: run.confidence,
    findingsSummary: run.findingsSummary,
    citations: run.citations.map((citation) => ({
      documentId: citation.documentId,
      chunkId: citation.chunkId,
      excerpt: citation.excerpt,
    })),
  }));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\nAGENT OUTPUTS:\n${JSON.stringify(payload, null, 2)}`,
    },
    {
      role: "user",
      content:
        "Synthesize an explainable consensus. Preserve each agent's original opinion fields. Return only valid JSON.",
    },
  ];

  const parsed = await requestConsensusOutput(messages, dependencies.ollama);
  const allowedCitations = specialists.flatMap((run) => run.citations);
  const citations = validateConsensusCitations(parsed.citations, allowedCitations);
  const agentOpinions = preserveAgentOpinions(parsed.agentOpinions, specialists);

  return {
    finalRecommendation: parsed.finalRecommendation,
    decisionConfidence: parsed.decisionConfidence,
    agentOpinions,
    agreements: parsed.agreements,
    conflicts: parsed.conflicts,
    resolutionRationale: parsed.resolutionRationale,
    citations,
    agentRunIds: specialists.map((run) => run.runId),
    usedModel: true,
  };
}

export function __testables() {
  return {
    allInsufficient,
    insufficientConsensus,
    buildConsensusCorrectionPrompt,
  };
}
