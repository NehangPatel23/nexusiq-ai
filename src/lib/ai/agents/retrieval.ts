import type { AgentType, ChatAgentType } from "@prisma/client";

import { agentRetrievalClassifications } from "@/features/chat/lib/agent-retrieval";
import { rankRetrievalForAgent } from "@/features/chat/lib/rank-retrieval";
import type { SearchResponse } from "@/features/search/lib/types";
import { retrieveForRag } from "@/lib/ai/retrieval";

import { agentSeedQuery } from "./prompts";

const AGENT_TO_CHAT: Record<AgentType, ChatAgentType> = {
  FINANCIAL: "FINANCIAL",
  LEGAL: "LEGAL",
  COMPLIANCE: "COMPLIANCE",
  RISK: "RISK",
  FRAUD: "FRAUD",
};

export function toChatAgentType(agentType: AgentType): ChatAgentType {
  return AGENT_TO_CHAT[agentType];
}

export async function retrieveForAgent(
  projectId: string,
  agentType: AgentType,
  limit = 15,
): Promise<SearchResponse> {
  const chatAgentType = toChatAgentType(agentType);
  const query = agentSeedQuery(agentType);
  const preferred = agentRetrievalClassifications(chatAgentType);
  const primaryClassification = preferred[0];
  let retrieval: SearchResponse;

  try {
    retrieval = await retrieveForRag(projectId, query, {
      mode: "hybrid",
      limit,
      filters: primaryClassification ? { classification: primaryClassification } : undefined,
    });
    if (retrieval.results.length < 3) {
      const broader = await retrieveForRag(projectId, query, {
        mode: "hybrid",
        limit,
      });
      if (broader.results.length > retrieval.results.length) {
        retrieval = broader;
      }
    }
  } catch {
    retrieval = await retrieveForRag(projectId, query, {
      mode: "keyword",
      limit,
    });
  }

  return rankRetrievalForAgent(retrieval, chatAgentType, limit);
}
