import type { ConfidenceLevel } from "@prisma/client";
import type { z } from "zod";

import { buildContext } from "@/lib/ai/chat/rag-chat";
import {
  getOllamaClient,
  OllamaTimeoutError,
  type ChatMessage,
  type OllamaClient,
} from "@/lib/ai/ollama-client";

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
import type { AgentOutputByType, AgentRunResult, SpecialistAgentType } from "./types";

export class OllamaUnavailableError extends Error {
  readonly code = "OLLAMA_UNAVAILABLE";

  constructor(
    message = "Intelligence agents are unavailable because Ollama could not be reached. Please try again shortly.",
  ) {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

export { OllamaTimeoutError };

/** Map Ollama client failures: timeouts stay retryable step failures; connectivity is 503. */
export function rethrowOllamaChatFailure(error: unknown): never {
  if (error instanceof OllamaTimeoutError || error instanceof OllamaUnavailableError) {
    throw error;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out|AbortError/i.test(message) || (error instanceof Error && error.name === "AbortError")) {
    throw new OllamaTimeoutError(message);
  }
  if (
    /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|network|unreachable|OLLAMA_BASE_URL is not set|Ollama chat failed \(5\d\d\)/i.test(
      message,
    )
  ) {
    throw new OllamaUnavailableError();
  }
  throw error instanceof Error ? error : new Error(message);
}

type RunAgentDependencies = {
  retrieve: typeof retrieveForAgent;
  ollama: Pick<OllamaClient, "healthCheck" | "chat">;
};

const defaultDependencies = (): RunAgentDependencies => ({
  retrieve: retrieveForAgent,
  ollama: getOllamaClient(),
});

function insufficientResult<T extends SpecialistAgentType>(agentType: T): AgentRunResult<T> {
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

function buildAgentCorrectionPrompt(agentType: SpecialistAgentType, error: z.ZodError): string {
  return `Your previous JSON response did not match the required ${agentType} agent schema.

Fix every issue below and return ONLY corrected JSON (no prose, no markdown):
${formatAgentValidationErrors(error)}

Rules:
- Use exact enum strings for severity and confidence (e.g. "HIGH", not 2 or "High")
- Omit optional fields instead of returning null when unknown
- Nested items must be objects, not positional arrays
- Keep all findings grounded in the provided document excerpts`;
}

async function requestAgentOutput<T extends SpecialistAgentType>(
  agentType: T,
  messages: ChatMessage[],
  ollama: Pick<OllamaClient, "chat">,
): Promise<AgentOutputByType[T]> {
  let rawContent: string;
  try {
    rawContent = await ollama.chat(messages, { format: "json", maxTokens: 2500 });
  } catch (error) {
    rethrowOllamaChatFailure(error);
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
  } catch (error) {
    rethrowOllamaChatFailure(error);
  }

  const secondAttempt = parseAgentJsonResult(agentType, retryContent);
  if (secondAttempt.success) {
    return secondAttempt.data as AgentOutputByType[T];
  }

  throw new Error(
    `Agent output validation failed after retry: ${formatAgentValidationErrors(secondAttempt.error)}`,
  );
}

export async function runAgent<T extends SpecialistAgentType>(
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
    // Keep the model score whenever documents were retrieved. INSUFFICIENT is
    // reserved for empty retrieval — don't blank a valid score due to weak citations.
    score: retrieval.results.length === 0 ? null : score,
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
