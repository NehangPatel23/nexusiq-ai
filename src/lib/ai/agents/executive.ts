import type { ConfidenceLevel } from "@prisma/client";

import { buildContext } from "@/lib/ai/chat/rag-chat";
import { parseAndValidateCitations } from "@/lib/ai/citations";
import { parseConfidence } from "@/lib/ai/confidence";
import { getOllamaClient, type ChatMessage, type OllamaClient } from "@/lib/ai/ollama-client";

import { INSUFFICIENT_AGENT_RECOMMENDATION } from "./findings";
import {
  deriveExecutiveCompositeScore,
  parseExecutiveMarkdown,
} from "./executive-parser";
import { loadExecutiveSystemPrompt } from "./prompts";
import { retrieveForAgent } from "./retrieval";
import { OllamaUnavailableError, rethrowOllamaChatFailure } from "./run-agent";
import type { AgentRunResult, ExecutiveAgentOutput, NormalizedFinding } from "./types";
import { SPECIALIST_AGENT_TYPES } from "./types";

export type SpecialistRunSummary = {
  runId: string;
  agentType: (typeof SPECIALIST_AGENT_TYPES)[number];
  score: number | null;
  recommendation: string;
  confidence: ConfidenceLevel;
  findingsSummary: string[];
  citations: Array<{ documentId: string; chunkId: string; documentName?: string; excerpt?: string }>;
};

type ExecutiveDependencies = {
  retrieve: typeof retrieveForAgent;
  ollama: Pick<OllamaClient, "healthCheck" | "chat">;
  loadSpecialists: (projectId: string) => Promise<SpecialistRunSummary[]>;
};

async function defaultLoadSpecialists(_projectId: string): Promise<SpecialistRunSummary[]> {
  // Lazy import avoids circular deps with features/intelligence.
  const { getLatestCompletedSpecialistRuns } = await import(
    "@/features/intelligence/lib/specialist-runs"
  );
  return getLatestCompletedSpecialistRuns(_projectId);
}

const defaultDependencies = (): ExecutiveDependencies => ({
  retrieve: retrieveForAgent,
  ollama: getOllamaClient(),
  loadSpecialists: defaultLoadSpecialists,
});

function priorityActionFindings(actions: string[]): NormalizedFinding[] {
  return actions.map((action, index) => ({
    category: "Executive",
    title: `Priority action ${index + 1}`,
    description: action,
    severity: index === 0 ? "HIGH" : "MEDIUM",
    metadata: { priorityIndex: index },
  }));
}

function insufficientExecutiveResult(): AgentRunResult<"EXECUTIVE"> {
  const recommendation = INSUFFICIENT_AGENT_RECOMMENDATION;
  const output: ExecutiveAgentOutput = {
    executiveSummary: recommendation,
    markdown: `## Executive Summary\n\n${recommendation}\n\n## Recommendation\n\nFurther Diligence\n\nCONFIDENCE: INSUFFICIENT`,
    recommendation: "Further Diligence",
    priorityActions: [],
    confidence: "INSUFFICIENT",
    specialistRunIds: [],
    specialistContext: [],
  };

  return {
    agentType: "EXECUTIVE",
    output,
    score: null,
    confidence: "INSUFFICIENT",
    citations: [],
    findings: [],
  };
}

function formatSpecialistContext(specialists: SpecialistRunSummary[]): string {
  if (specialists.length === 0) {
    return "No completed specialist agent runs were available for this project.";
  }

  return specialists
    .map((run) => {
      const findings =
        run.findingsSummary.length > 0
          ? run.findingsSummary.map((item) => `- ${item}`).join("\n")
          : "- No findings summarized";
      return [
        `### ${run.agentType}`,
        `Score: ${run.score ?? "n/a"}`,
        `Confidence: ${run.confidence}`,
        `Recommendation: ${run.recommendation}`,
        "Top findings:",
        findings,
      ].join("\n");
    })
    .join("\n\n");
}

export async function runExecutiveAgent(
  projectId: string,
  dependenciesOverride?: Partial<ExecutiveDependencies>,
): Promise<AgentRunResult<"EXECUTIVE">> {
  const dependencies = { ...defaultDependencies(), ...dependenciesOverride };
  const retrieval = await dependencies.retrieve(projectId, "EXECUTIVE");

  if (retrieval.results.length === 0) {
    return insufficientExecutiveResult();
  }

  const health = await dependencies.ollama.healthCheck();
  if (!health.ok) {
    throw new OllamaUnavailableError();
  }

  const specialists = await dependencies.loadSpecialists(projectId);
  const systemPrompt = loadExecutiveSystemPrompt();
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\nDOCUMENT CONTEXT:\n${buildContext(retrieval.results)}\n\nSPECIALIST AGENT SUMMARIES:\n${formatSpecialistContext(specialists)}`,
    },
    {
      role: "user",
      content:
        "Produce the full executive decision package in Markdown with the required sections. End with CONFIDENCE: HIGH|MEDIUM|LOW|INSUFFICIENT.",
    },
  ];

  let rawMarkdown: string;
  try {
    rawMarkdown = await dependencies.ollama.chat(messages, { maxTokens: 3500 });
  } catch (error) {
    rethrowOllamaChatFailure(error);
  }

  const parsed = parseExecutiveMarkdown(rawMarkdown);
  const citations = parseAndValidateCitations(parsed.markdown, retrieval.results);

  // Also accept citations that specialists already validated.
  for (const specialist of specialists) {
    for (const citation of specialist.citations) {
      const key = `${citation.documentId}:${citation.chunkId}`;
      if (citations.some((item) => `${item.documentId}:${item.chunkId}` === key)) continue;
      if (!citation.documentId || !citation.chunkId) continue;
      citations.push({
        documentId: citation.documentId,
        chunkId: citation.chunkId,
        documentName: citation.documentName ?? "Document",
        excerpt: citation.excerpt ?? "",
      });
    }
  }

  const confidenceParsed = parseConfidence(rawMarkdown, citations, {
    retrievalCount: retrieval.results.length,
  });
  const confidence =
    parsed.confidence === "INSUFFICIENT" && citations.length === 0
      ? "INSUFFICIENT"
      : confidenceParsed.confidence;

  const compositeScore = deriveExecutiveCompositeScore(specialists.map((run) => run.score));
  const output: ExecutiveAgentOutput = {
    executiveSummary: parsed.executiveSummary,
    boardReport: parsed.boardReport,
    investmentMemo: parsed.investmentMemo,
    markdown: parsed.markdown,
    acquisitionRecommendation: parsed.acquisitionRecommendation,
    priorityActions: parsed.priorityActions,
    recommendation: parsed.recommendation,
    confidence,
    specialistRunIds: specialists.map((run) => run.runId),
    specialistContext: specialists.map((run) => ({
      agentType: run.agentType,
      runId: run.runId,
      score: run.score,
      confidence: run.confidence,
      recommendation: run.recommendation,
    })),
  };

  return {
    agentType: "EXECUTIVE",
    output,
    score: retrieval.results.length === 0 ? null : compositeScore,
    confidence,
    citations,
    findings: priorityActionFindings(parsed.priorityActions),
  };
}

export function __testables() {
  return {
    insufficientExecutiveResult,
    formatSpecialistContext,
    priorityActionFindings,
  };
}
