import type { AgentType, ConfidenceLevel } from "@prisma/client";
import type { z } from "zod";

import { buildContext } from "@/lib/ai/chat/rag-chat";
import { getOllamaClient, type ChatMessage, type OllamaClient } from "@/lib/ai/ollama-client";

import {
  extractCitationsFromOutput,
  INSUFFICIENT_AGENT_RECOMMENDATION,
  normalizeAgentFindings,
  parseAgentConfidence,
} from "./findings";
import { loadAgentSystemPrompt } from "./prompts";
import { retrieveForAgent } from "./retrieval";
import {
  agentOutputSchemas,
  extractAgentScore,
  formatAgentValidationErrors,
  parseAgentJsonResult,
} from "./schemas";
import type { AgentOutputByType, AgentRunResult } from "./types";

export class OllamaUnavailableError extends Error {
  readonly code = "OLLAMA_UNAVAILABLE";

  constructor(
    message = "Intelligence agents are unavailable because Ollama could not be reached. Please try again shortly.",
  ) {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

type RunAgentDependencies = {
  retrieve: typeof retrieveForAgent;
  ollama: Pick<OllamaClient, "healthCheck" | "chat">;
};

const defaultDependencies = (): RunAgentDependencies => ({
  retrieve: retrieveForAgent,
  ollama: getOllamaClient(),
});

function insufficientResult<T extends AgentType>(agentType: T): AgentRunResult<T> {
  const recommendation = INSUFFICIENT_AGENT_RECOMMENDATION;
  const output = {
    recommendation,
    confidence: "INSUFFICIENT" as ConfidenceLevel,
    ...(agentType === "FINANCIAL" ? { financialHealthScore: 0 } : {}),
    ...(agentType === "LEGAL" ? { legalRiskScore: 0 } : {}),
    ...(agentType === "COMPLIANCE" ? { auditReadinessScore: 0 } : {}),
    ...(agentType === "RISK" ? { enterpriseRiskScore: 0 } : {}),
    ...(agentType === "FRAUD" ? { fraudRiskScore: 0 } : {}),
  } as AgentOutputByType[T];

  return {
    agentType,
    output,
    score: null,
    confidence: "INSUFFICIENT",
    citations: [],
    findings: [],
  };
}

function buildAgentCorrectionPrompt(agentType: AgentType, error: z.ZodError): string {
  return `Your previous JSON response did not match the required ${agentType} agent schema.

Fix every issue below and return ONLY corrected JSON (no prose, no markdown):
${formatAgentValidationErrors(error)}

Rules:
- Use exact enum strings for severity and confidence (e.g. "HIGH", not 2 or "High")
- Omit optional fields instead of returning null when unknown
- Nested items must be objects, not positional arrays
- Keep all findings grounded in the provided document excerpts`;
}

async function requestAgentOutput<T extends AgentType>(
  agentType: T,
  messages: ChatMessage[],
  ollama: Pick<OllamaClient, "chat">,
): Promise<AgentOutputByType[T]> {
  let rawContent: string;
  try {
    rawContent = await ollama.chat(messages, { format: "json", maxTokens: 2500 });
  } catch {
    throw new OllamaUnavailableError();
  }

  const firstAttempt = parseAgentJsonResult(agentType, rawContent);
  if (firstAttempt.success) {
    return firstAttempt.data as AgentOutputByType[T];
  }

  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: rawContent },
    {
      role: "user",
      content: buildAgentCorrectionPrompt(agentType, firstAttempt.error),
    },
  ];

  let retryContent: string;
  try {
    retryContent = await ollama.chat(retryMessages, { format: "json", maxTokens: 2500 });
  } catch {
    throw new OllamaUnavailableError();
  }

  const secondAttempt = parseAgentJsonResult(agentType, retryContent);
  if (secondAttempt.success) {
    return secondAttempt.data as AgentOutputByType[T];
  }

  throw new Error(
    `Agent output validation failed after retry: ${formatAgentValidationErrors(secondAttempt.error)}`,
  );
}

export async function runAgent<T extends AgentType>(
  projectId: string,
  agentType: T,
  dependenciesOverride?: Partial<RunAgentDependencies>,
): Promise<AgentRunResult<T>> {
  const dependencies = { ...defaultDependencies(), ...dependenciesOverride };
  const retrieval = await dependencies.retrieve(projectId, agentType);

  if (retrieval.results.length === 0) {
    return insufficientResult(agentType);
  }

  const health = await dependencies.ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError();
  }

  const systemPrompt = loadAgentSystemPrompt(agentType);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\nDOCUMENT CONTEXT:\n${buildContext(retrieval.results)}`,
    },
    {
      role: "user",
      content: `Run a full ${agentType.toLowerCase()} diligence scan on the provided document excerpts. Return only valid JSON matching the schema.`,
    },
  ];

  const parsedOutput = await requestAgentOutput(agentType, messages, dependencies.ollama);

  const citations = extractCitationsFromOutput(
    parsedOutput as Record<string, unknown>,
    retrieval.results,
  );
  const confidence = parseAgentConfidence(parsedOutput, citations, retrieval.results.length);
  const findings = normalizeAgentFindings(agentType, parsedOutput);
  const score = extractAgentScore(agentType, parsedOutput as Record<string, unknown>);

  return {
    agentType,
    output: parsedOutput,
    score: confidence === "INSUFFICIENT" ? null : score,
    confidence,
    citations,
    findings,
  };
}

export function __testables() {
  return {
    insufficientResult,
    defaultDependencies,
    agentOutputSchemas,
    buildAgentCorrectionPrompt,
    requestAgentOutput,
  };
}
