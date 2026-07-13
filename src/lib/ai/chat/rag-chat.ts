import type { ChatAgentType, ChatMessageRole, ConfidenceLevel } from "@prisma/client";

import { agentRetrievalClassifications } from "@/features/chat/lib/agent-retrieval";
import { rankRetrievalForAgent } from "@/features/chat/lib/rank-retrieval";
import type { SearchResponse, SearchResultItem } from "@/features/search/lib/types";
import {
  normalizeImplicitCitations,
  parseAndValidateCitations,
  stripCitationMarkers,
  type ChatCitation,
} from "@/lib/ai/citations";
import { parseConfidence } from "@/lib/ai/confidence";
import { stripUncitedFactualSentences } from "@/lib/ai/uncited-sentences";
import {
  getOllamaClient,
  type ChatMessage as OllamaMessage,
  type OllamaClient,
} from "@/lib/ai/ollama-client";
import { retrieveForRag } from "@/lib/ai/retrieval";

import { buildChatSystemPrompt } from "./prompts";

export const INSUFFICIENT_EVIDENCE_MESSAGE =
  "I don’t have enough relevant evidence in this project’s data room to answer that question. Upload or process supporting documents, then try again.";

export class OllamaUnavailableError extends Error {
  readonly code = "OLLAMA_UNAVAILABLE";

  constructor(message = "AI chat is unavailable because Ollama could not be reached. Please try again shortly.") {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

export type ChatHistoryMessage = {
  role: ChatMessageRole | "user" | "assistant" | "system";
  content: string;
};

export type RagChatResult = {
  content: string;
  citations: ChatCitation[];
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReason?: string;
  retrievedChunks: SearchResultItem[];
};

type RagChatDependencies = {
  retrieve: typeof retrieveForRag;
  ollama: Pick<OllamaClient, "healthCheck" | "chatStream">;
};

const defaultDependencies = (): RagChatDependencies => ({
  retrieve: retrieveForRag,
  ollama: getOllamaClient(),
});

export type PreparedRagChat = {
  retrieval: SearchResponse;
};

function toOllamaRole(role: ChatHistoryMessage["role"]): OllamaMessage["role"] {
  return role.toLowerCase() as OllamaMessage["role"];
}

export function buildContext(chunks: SearchResultItem[]): string {
  return chunks
    .map(
      (chunk, index) =>
        `SOURCE ${index + 1}\nDocument: ${chunk.documentName}\nDocument ID: ${chunk.documentId}\nChunk ID: ${chunk.chunkId}\nExcerpt:\n${chunk.content}`,
    )
    .join("\n\n---\n\n");
}

export async function prepareRagChat(
  projectId: string,
  userMessage: string,
  agentType: ChatAgentType = "GENERAL",
  dependenciesOverride?: Partial<RagChatDependencies>,
): Promise<PreparedRagChat> {
  const dependencies = { ...defaultDependencies(), ...dependenciesOverride };
  const preferred = agentRetrievalClassifications(agentType);
  const primaryClassification = preferred[0];
  let retrieval: SearchResponse;

  try {
    retrieval = await dependencies.retrieve(projectId, userMessage, {
      mode: "hybrid",
      limit: 12,
      filters: primaryClassification ? { classification: primaryClassification } : undefined,
    });
    if (retrieval.results.length < 3) {
      const broader = await dependencies.retrieve(projectId, userMessage, {
        mode: "hybrid",
        limit: 12,
      });
      if (broader.results.length > retrieval.results.length) {
        retrieval = broader;
      }
    }
  } catch {
    retrieval = await dependencies.retrieve(projectId, userMessage, {
      mode: "keyword",
      limit: 12,
    });
  }

  retrieval = rankRetrievalForAgent(retrieval, agentType, 10);

  if (retrieval.results.length > 0) {
    const health = await dependencies.ollama.healthCheck();
    if (!health.ok) {
      throw new OllamaUnavailableError();
    }
  }

  return { retrieval };
}

export async function runRagChat(input: {
  projectId: string;
  userMessage: string;
  agentType: ChatAgentType;
  history?: ChatHistoryMessage[];
  onToken: (delta: string) => void | Promise<void>;
  dependencies?: Partial<RagChatDependencies>;
  prepared?: PreparedRagChat;
}): Promise<RagChatResult> {
  const dependencies = { ...defaultDependencies(), ...input.dependencies };
  const { retrieval } =
    input.prepared ??
    (await prepareRagChat(input.projectId, input.userMessage, input.agentType, dependencies));

  if (retrieval.results.length === 0) {
    return {
      content: INSUFFICIENT_EVIDENCE_MESSAGE,
      citations: [],
      confidence: "INSUFFICIENT",
      confidenceScore: 0,
      confidenceReason: "No relevant documents were retrieved from the data room.",
      retrievedChunks: [],
    };
  }

  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: `${buildChatSystemPrompt(input.agentType)}\n\nDOCUMENT CONTEXT:\n${buildContext(retrieval.results)}`,
    },
    ...(input.history ?? []).slice(-6).map((message) => ({
      role: toOllamaRole(message.role),
      content: message.content,
    })),
    { role: "user", content: input.userMessage },
  ];

  let rawContent: string;
  try {
    rawContent = await dependencies.ollama.chatStream(messages, input.onToken, {
      maxTokens: 700,
    });
  } catch {
    throw new OllamaUnavailableError();
  }

  const normalizedContent = normalizeImplicitCitations(rawContent, retrieval.results);
  const citations = parseAndValidateCitations(normalizedContent, retrieval.results);
  const parsed = parseConfidence(normalizedContent, citations, {
    retrievalCount: retrieval.results.length,
  });
  const sanitized = stripUncitedFactualSentences(parsed.content);
  const stripped = stripCitationMarkers(sanitized);

  return {
    content: stripped,
    citations,
    confidence: parsed.confidence,
    confidenceScore: parsed.score,
    confidenceReason: parsed.reason,
    retrievedChunks: retrieval.results,
  };
}
